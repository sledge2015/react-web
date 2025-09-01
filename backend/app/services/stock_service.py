# backend/app/services/stock_service.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal, InvalidOperation
from sqlalchemy import or_
from app.models.stock import TradeType
from app.models.stock import Stock, UserStock, InvestmentFlow, StockPriceHistory,StockTrade
from app.models.user import User
from app.schemas.stock import StockCreate, StockUpdate, UserStockCreate, UserStockUpdate

class StockService:
	"""股票服务类"""
	
	@staticmethod
	def get_stock_by_symbol(db: Session, symbol: str) -> Optional[Stock]:
		"""根据股票代码获取股票"""
		return db.query(Stock).filter(Stock.stock_symbol == symbol.upper()).first()
	
	@staticmethod
	def get_stocks_by_symbols(db: Session, symbols: List[str]) -> List[Stock]:  # 移除Optional
		"""根据一组股票代码批量查询股票信息"""
		if not symbols:
			return []
		
		stocks = db.query(Stock).filter(
			Stock.stock_symbol.in_(symbols)
			).all()
		
		return stocks
	
	#查询交易记录
	def get_stock_trade_history(db: Session, user_id: int, page: int = 1, page_size: int = 20) -> List[StockTrade]:
		"""查询当前用户的交易信息"""
		
		# 计算分页的偏移量
		offset = (page - 1) * page_size
		
		# 查询交易记录，增加分页
		trades_history = db.query(StockTrade).filter(
			StockTrade.user_id == user_id  # 查询user_id对应的交易记录
			).order_by(StockTrade.trade_time.desc())  # 按时间降序排列
		trades_history = trades_history.offset(offset).limit(page_size).all()
		
		return trades_history
	
	@staticmethod
	def get_stock_by_id(db: Session, stock_id: int) -> Optional[Stock]:
		"""根据ID获取股票"""
		return db.query(Stock).filter(Stock.id == stock_id).first()
	
	@staticmethod
	def search_stocks(db: Session, query: str, limit: int = 20) -> List[Stock]:
		"""搜索股票"""
		search_pattern = f"%{query.upper()}%"
		return db.query(Stock).filter(
			or_(
				Stock.stock_symbol.like(search_pattern),
				Stock.company_name.like(search_pattern)
				)
			).limit(limit).all()
	
	@staticmethod
	def create_stock(db: Session, stock_data: StockCreate) -> Stock:
		"""创建股票"""
		stock = Stock(
			stock_symbol=stock_data.stock_symbol.upper(),
			company_name=stock_data.company_name,
			sector=stock_data.sector,
			market_cap=stock_data.market_cap,
			pe_ratio=stock_data.pe_ratio,
			country=stock_data.country
			)
		db.add(stock)
		db.commit()
		db.refresh(stock)
		return stock
	
	@staticmethod
	def update_stock(db: Session, stock_id: int, stock_update: StockUpdate) -> Optional[Stock]:
		"""更新股票信息"""
		stock = StockService.get_stock_by_id(db, stock_id)
		if not stock:
			return None
		
		update_data = stock_update.model_dump(exclude_unset=True)
		for field, value in update_data.items():
			setattr(stock, field, value)
		
		db.commit()
		db.refresh(stock)
		return stock
	
	@staticmethod
	def get_user_stocks(db: Session, user_id: int) -> List[UserStock]:
		"""获取用户的股票投资组合"""
		# 注意：新表结构没有user_id字段，需要从用户上下文获取
		# 这里假设通过其他方式关联用户，或者表中应该有user_id字段
		return db.query(UserStock).order_by(UserStock.created_at.desc()).all()
	
	def get_invest_amount(db: Session, user_id: int) -> List[UserStock]:
		"""获取投资收益"""
		# 注意：新表结构没有user_id字段，需要从用户上下文获取
		# 这里假设通过其他方式关联用户，或者表中应该有user_id字段
		return db.query(InvestmentFlow).order_by(InvestmentFlow.created_at.desc()).all()
	
	@staticmethod
	def add_user_stock(db: Session, user_id: int, stock_data: UserStockCreate) -> UserStock:
		"""为用户添加股票投资"""
		# 检查是否已存在相同股票
		existing = db.query(UserStock).filter(
			UserStock.stock_symbol == stock_data.stock_symbol.upper()
			).first()
		
		if existing:
			# 如果存在，更新数量和平均价格
			total_quantity = existing.quantity + stock_data.quantity
			total_cost = (existing.quantity * existing.average_price +
			              stock_data.quantity * stock_data.average_price)
			new_average_price = total_cost / total_quantity
			
			existing.quantity = total_quantity
			existing.average_price = new_average_price
			# total_investment 是计算字段，数据库会自动计算
			
			db.commit()
			db.refresh(existing)
			return existing
		else:
			# 创建新记录
			user_stock = UserStock(
				stock_symbol=stock_data.stock_symbol.upper(),
				quantity=stock_data.quantity,
				average_price=stock_data.average_price
				# total_investment 会由数据库自动计算
				)
			db.add(user_stock)
			db.commit()
			db.refresh(user_stock)
			return user_stock
	
	@staticmethod
	def update_user_stock(db: Session, user_stock_id: int, user_id: int, stock_update: UserStockUpdate) -> Optional[
		UserStock]:
		"""更新用户股票投资信息"""
		user_stock = db.query(UserStock).filter(UserStock.id == user_stock_id).first()
		
		if not user_stock:
			return None
		
		update_data = stock_update.model_dump(exclude_unset=True)
		for field, value in update_data.items():
			setattr(user_stock, field, value)
		
		db.commit()
		db.refresh(user_stock)
		return user_stock
	
	@staticmethod
	def remove_user_stock(db: Session, user_stock_id: int, user_id: int) -> bool:
		"""移除用户股票投资"""
		user_stock = db.query(UserStock).filter(UserStock.id == user_stock_id).first()
		
		if user_stock:
			db.delete(user_stock)
			db.commit()
			return True
		return False
	
	@staticmethod
	def get_portfolio_summary(db: Session, user_id: int) -> dict:
		"""
		获取用户投资组合汇总 (优化版)
		"""
		try:
			# 1. 批量获取所有持仓信息 (假设 total_investment/current_value 都是 Decimal 或可转为 Decimal)
			user_stocks = StockService.get_user_stocks(db, user_id)
			
			# 批量计算持仓汇总 (确保将 None 转换为 Decimal(0))
			total_investment = sum(Decimal(str(stock.total_investment or 0)) for stock in user_stocks)
			total_current_value = sum(Decimal(str(stock.current_value or 0)) for stock in user_stocks)
			total_unrealized_pnl = sum(Decimal(str(stock.unrealized_pnl or 0)) for stock in user_stocks)
			
			# 计算未实现盈亏百分比
			gain_loss_percent = Decimal(0)
			if total_investment > 0:
				gain_loss_percent = (total_unrealized_pnl / total_investment) * Decimal(100)
				# 使用 .quantize() 限制精度，例如保留 4 位小数
				gain_loss_percent = gain_loss_percent.quantize(Decimal('0.0001'))
			
			# 2. 获取所有流水信息
			invest_flows = StockService.get_invest_amount(db, user_id)
			
			# 3. 使用一次循环计算所有流水相关的指标 (更高效)
			total_deposit = Decimal(0)
			total_withdraw = Decimal(0)
			total_dividend_interest = Decimal(0)
			total_profit_flow = Decimal(0)  # 包含交易、分红、利息、融资费用的总和
			
			for flow in invest_flows:
				amount_dec = Decimal(str(flow.amount or 0))  # 确保金额是 Decimal
				flow_type = flow.flow_type
				
				if flow_type == 'deposit':
					total_deposit += amount_dec
				elif flow_type == 'withdraw':
					total_withdraw += amount_dec
				
				# 简化利息分红计算
				if flow_type in ('dividend', 'interest'):
					total_dividend_interest += amount_dec
				
				# 简化总收益计算 (假设所有流水都在 'trade_in', 'trade_out', 'dividend', 'interest', 'financing_fee' 范围内)
				# 注意：trade_in 应为负值，trade_out 应为正值
				if flow_type in ('trade_in', 'trade_out', 'dividend', 'interest', 'financing_fee'):
					total_profit_flow += amount_dec
			
			# 4. 计算投入资金 (投入 - 取出)
			total_investment_cash = total_deposit - total_withdraw
			
			# 5. 计算投资收益率的分子：总收益 (总市值 - 净投入 - 融资额)
			invest_profit_rate_value = Decimal(0)
			
			#TO DO 修正点：将 float 硬编码值转换为 Decimal
			FINANCING_AMOUNT_DEC = Decimal("4207.05")
			
			# 避免除以零
			if total_investment_cash > 0:
				# 计算总收益率分子：当前市值 - 净投入本金 - 融资额
				invest_profit_rate_value = total_current_value - total_investment_cash - FINANCING_AMOUNT_DEC
			# 打印调试信息 (如果需要)
			# print(f"投资金额变化 (收益率分子): {invest_profit_rate_value}")
			
			# 6. 返回结果
			return {
				"total_value": total_current_value,
				"total_investment": total_investment,
				"total_gain_loss": total_unrealized_pnl,
				"total_gain_loss_percent": gain_loss_percent,
				"stock_count": len(user_stocks),
				"total_investment_cash": total_investment_cash,  # 投入资金 (Decimal)
				"total_interest": total_dividend_interest,  # 利息分红 (Decimal)
				"total_profit": total_profit_flow,  # 投资收益 (交易净额+分红利息) (Decimal)
				"invest_profit_percent": invest_profit_rate_value  # 投资收益率分子 (Decimal)
				}
		
		except (InvalidOperation, TypeError, Exception) as e:
			# 捕捉 Decimal 转换错误，或其他潜在错误
			print(f"获取投资组合汇总失败: {e}")
			# 在实际的 FastAPI/API 接口中，这里应该抛出 HTTPException 或返回失败 JSON
			raise e
	
	@staticmethod
	def get_historical_prices(db: Session, symbol: str):
		#获取某只股票历史价格
	    return db.query(StockPriceHistory).filter(StockService.StockPriceHistory.stock_symbol == symbol).all()
	
	@staticmethod
	def get_latest_stock_data(db: Session, symbols: list[str]) -> list[dict]:
		"""
		批量高效获取股票最新数据及涨跌幅。
		"""
		if not symbols:
			return []
		
		# 1. SQL: 批量获取最新数据 (同时获取日期，便于后续查询)
		latest_subquery = db.query(
			StockPriceHistory.stock_symbol,
			func.max(StockPriceHistory.datetime).label('max_datetime')
			).filter(
			StockPriceHistory.stock_symbol.in_(symbols)
			).group_by(StockPriceHistory.stock_symbol).subquery()
		
		latest_records = db.query(StockPriceHistory).join(
			latest_subquery,
			(StockPriceHistory.stock_symbol == latest_subquery.c.stock_symbol) &
			(StockPriceHistory.datetime == latest_subquery.c.max_datetime)
			).all()
		
		# 将最新记录和最新时间点转换为映射 (Map)
		latest_map = {rec.stock_symbol: rec for rec in latest_records}
		
		# 2. SQL: 批量获取前一交易日数据
		# 利用最新时间点列表进行高效过滤，找到前一个时间点
		previous_subquery = db.query(
			StockPriceHistory.stock_symbol,
			func.max(StockPriceHistory.datetime).label('prev_datetime')
			).filter(
			StockPriceHistory.stock_symbol.in_(symbols),
			# 查找所有记录，确保时间比最新时间点小
			StockPriceHistory.datetime < latest_subquery.c.max_datetime
			).group_by(StockPriceHistory.stock_symbol).subquery()
		
		previous_records = db.query(StockPriceHistory).join(
			previous_subquery,
			(StockPriceHistory.stock_symbol == previous_subquery.c.stock_symbol) &
			(StockPriceHistory.datetime == previous_subquery.c.prev_datetime)
			).all()
		
		previous_map = {rec.stock_symbol: rec for rec in previous_records}
		
		# 3. Python 循环构建最终结果
		result_list = []
		
		for symbol in symbols:
			latest = latest_map.get(symbol)
			previous = previous_map.get(symbol)
			
			# 排除无数据的股票
			if not latest:
				print(f"警告：未找到股票 {symbol} 数据", file=sys.stderr)
				continue
			
			# 简化的价格和变化计算
			current_price = Decimal(str(latest.close))
			
			change, change_percent = Decimal(0), Decimal(0)
			
			if previous:
				previous_price = Decimal(str(previous.close))
				
				if previous_price != 0:
					change = current_price - previous_price
					change_percent = (change / previous_price) * Decimal(100)
			
			# 打印调试信息 (如果需要)
			print(f"结果: {symbol} | 价格: {float(current_price)} | 变动: {float(change)}")
			
			# 构造最终字典 (使用浮点数是为了 JSON 序列化和前端显示)
			result_list.append({
				"symbol": symbol,
				"price": float(current_price),
				"volume": int(latest.volume or 0),
				"datetime": latest.datetime.isoformat(),
				"change": float(change),
				"changePercent": float(change_percent)
				})
		
		return result_list
	
	@staticmethod
	def process_stock_trade_history(db: Session, user_id: int, latest_data_map: dict, page: int = 1,
	                                page_size: int = 20):
		# 获取用户的交易记录
		stock_trade_history_list = StockService.get_stock_trade_history(db, user_id, page, page_size)
		
		# 将交易记录按 (symbol, trade_time) 存储为字典
		stock_trade_history_map = {
			(trade.stock_symbol, trade.trade_time): trade  # 访问属性而不是使用索引
			for trade in stock_trade_history_list
			}
		
		processed_data = {}
		
		for (symbol, trade_time), trade in stock_trade_history_map.items():
			if trade.trade_type != TradeType.buy:
				continue
				
			# 获取最新的股票数据
			latest_data = latest_data_map.get(symbol)
			
			if latest_data:
				current_price = Decimal(str(latest_data["price"]))  # 当前股价
				trade_price = Decimal(str(trade.price))  # 交易时的价格
				
				# 计算利润和利润百分比
				profit = (current_price - trade_price) * Decimal(str(trade.quantity))
				profit_percent = ((current_price - trade_price) / trade_price) * Decimal(100)
			else:
				profit = Decimal(0)
				profit_percent = Decimal(0)
			
			# 交易记录
			transaction = {
				"id": trade.trade_id,  # 访问属性
				"type": trade.trade_type,  # 访问属性
				"date": trade.trade_time,  # 访问属性
				"price": trade.price,  # 访问属性
				"quantity": trade.quantity,  # 访问属性
				"assetmarketvalue": Decimal(str(trade.quantity)) * Decimal(str(trade.price)),
				"profit": float(profit),
				"profitPercent": float(profit_percent),

				}
			
			# 将交易记录添加到processed_data
			if symbol not in processed_data:
				processed_data[symbol] = []
			
			processed_data[symbol].append(transaction)
		
		return processed_data


