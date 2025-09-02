# backend/app/services/stock_service.py - 修复版本
import sys
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from decimal import Decimal, InvalidOperation
from sqlalchemy import or_
from app.models.stock import TradeType, Stock, UserStock, InvestmentFlow, StockPriceHistory, StockTrade
from app.models.user import User
from app.schemas.stock import StockCreate, StockUpdate, UserStockCreate, UserStockUpdate
from app.algorithm.stock_analysis_service import StockAnalysisService


class StockService:
	"""股票服务类 - 修复版本"""
	
	@staticmethod
	def get_stock_by_symbol(db: Session, symbol: str) -> Optional[Stock]:
		"""根据股票代码获取股票"""
		return db.query(Stock).filter(Stock.stock_symbol == symbol.upper()).first()
	
	@staticmethod
	def get_stocks_by_symbols(db: Session, symbols: List[str]) -> List[Stock]:
		"""根据一组股票代码批量查询股票信息"""
		if not symbols:
			return []
		
		stocks = db.query(Stock).filter(
			Stock.stock_symbol.in_([s.upper() for s in symbols])
			).all()
		
		return stocks
	
	@staticmethod
	def get_stock_trade_history(db: Session, user_id: int, page: int = 1, page_size: int = 20) -> List[StockTrade]:
		"""查询当前用户的交易信息 - 修复版本"""
		offset = (page - 1) * page_size
		
		trades_history = db.query(StockTrade).filter(
			StockTrade.user_id == user_id  # ✅ 正确使用user_id过滤
			).order_by(StockTrade.trade_time.desc())
		
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
		"""获取用户的股票投资组合 - 修复版本"""
		# ✅ 修复：正确使用user_id过滤用户持仓
		return db.query(UserStock).filter(
			and_(
				UserStock.user_id == user_id,
				UserStock.is_active == True,
				UserStock.quantity > 0  # 只返回有持仓的记录
				)
			).order_by(UserStock.created_at.desc()).all()
	
	@staticmethod
	def get_invest_amount(db: Session, user_id: int) -> List[InvestmentFlow]:
		"""获取投资流水 - 修复版本"""
		# ✅ 修复：正确使用user_id过滤用户流水
		return db.query(InvestmentFlow).filter(
			InvestmentFlow.user_id == user_id
			).order_by(InvestmentFlow.created_at.desc()).all()
	
	@staticmethod
	def add_user_stock(db: Session, user_id: int, stock_data: UserStockCreate) -> UserStock:
		"""为用户添加股票投资 - 修复版本"""
		stock_symbol = stock_data.stock_symbol.upper()
		
		# ✅ 修复：检查是否已存在相同股票时加上user_id过滤
		existing = db.query(UserStock).filter(
			and_(
				UserStock.user_id == user_id,  # ✅ 添加用户ID过滤
				UserStock.stock_symbol == stock_symbol,
				UserStock.is_active == True
				)
			).first()
		
		# 获取或创建股票基础信息
		stock = StockService.get_stock_by_symbol(db, stock_symbol)
		if not stock:
			stock = Stock(
				stock_symbol=stock_symbol,
				company_name=f"{stock_symbol} Inc.",
				is_active=True,
				is_tradable=True
				)
			db.add(stock)
			db.flush()
		
		if existing:
			# 如果存在，更新数量和平均价格
			total_quantity = existing.quantity + stock_data.quantity
			total_cost = (existing.quantity * existing.average_price +
			              stock_data.quantity * stock_data.average_price)
			new_average_price = total_cost / total_quantity
			
			existing.quantity = total_quantity
			existing.average_price = new_average_price
			existing.total_investment = total_cost  # ✅ 修复：手动计算总投资
			
			db.commit()
			db.refresh(existing)
			return existing
		else:
			# 创建新记录
			user_stock = UserStock(
				user_id=user_id,  # ✅ 修复：添加user_id
				stock_id=stock.id,  # ✅ 修复：添加stock_id外键
				stock_symbol=stock_symbol,
				quantity=stock_data.quantity,
				average_price=Decimal(str(stock_data.average_price)),
				total_investment=Decimal(str(stock_data.quantity * stock_data.average_price)),  # ✅ 修复：手动计算
				is_active=True
				)
			db.add(user_stock)
			db.commit()
			db.refresh(user_stock)
			return user_stock
	
	@staticmethod
	def update_user_stock(db: Session, user_stock_id: int, user_id: int, stock_update: UserStockUpdate) -> Optional[
		UserStock]:
		"""更新用户股票投资信息 - 修复版本"""
		# ✅ 修复：添加user_id过滤确保安全性
		user_stock = db.query(UserStock).filter(
			and_(
				UserStock.id == user_stock_id,
				UserStock.user_id == user_id  # ✅ 添加用户验证
				)
			).first()
		
		if not user_stock:
			return None
		
		update_data = stock_update.model_dump(exclude_unset=True)
		for field, value in update_data.items():
			if field == 'total_investment' and 'quantity' in update_data and 'average_price' in update_data:
				# 重新计算总投资
				user_stock.total_investment = Decimal(str(update_data['quantity'] * update_data['average_price']))
			else:
				setattr(user_stock, field, value)
		
		db.commit()
		db.refresh(user_stock)
		return user_stock
	
	@staticmethod
	def remove_user_stock(db: Session, user_stock_id: int, user_id: int) -> bool:
		"""移除用户股票投资 - 修复版本"""
		# ✅ 修复：添加user_id过滤确保安全性
		user_stock = db.query(UserStock).filter(
			and_(
				UserStock.id == user_stock_id,
				UserStock.user_id == user_id  # ✅ 添加用户验证
				)
			).first()
		
		if user_stock:
			# 软删除：设置为不活跃而不是物理删除
			user_stock.is_active = False
			user_stock.quantity = 0
			db.commit()
			return True
		return False
	
	@staticmethod
	def get_portfolio_summary(db: Session, user_id: int) -> dict:
		"""获取用户投资组合汇总 - 修复版本"""
		try:
			# ✅ 修复：使用正确的user_id过滤
			user_stocks = StockService.get_user_stocks(db, user_id)
			
			# 获取股票最新价格用于计算当前市值
			symbols = [stock.stock_symbol for stock in user_stocks]
			latest_data_list = StockService.get_latest_stock_data(db, symbols)
			latest_data_map = {data["symbol"]: data for data in latest_data_list}
			
			# 批量计算持仓汇总
			total_investment = Decimal('0')
			total_current_value = Decimal('0')
			total_unrealized_pnl = Decimal('0')
			
			for stock in user_stocks:
				stock_investment = Decimal(str(stock.total_investment or 0))
				total_investment += stock_investment
				
				# 计算当前市值
				latest_data = latest_data_map.get(stock.stock_symbol)
				if latest_data:
					current_price = Decimal(str(latest_data["price"]))
					current_value = current_price * stock.quantity
					total_current_value += current_value
					
					# 计算未实现盈亏
					unrealized_pnl = current_value - stock_investment
					total_unrealized_pnl += unrealized_pnl
					
					# 更新持仓记录的当前价格和未实现盈亏（可选）
					stock.current_price = current_price
					stock.unrealized_pnl = unrealized_pnl
			
			# 计算未实现盈亏百分比
			gain_loss_percent = Decimal('0')
			if total_investment > 0:
				gain_loss_percent = (total_unrealized_pnl / total_investment) * Decimal('100')
			
			# ✅ 修复：使用正确的user_id过滤流水
			invest_flows = StockService.get_invest_amount(db, user_id)
			
			# 计算流水相关指标
			total_deposit = Decimal('0')
			total_withdraw = Decimal('0')
			total_dividend_interest = Decimal('0')
			total_profit_flow = Decimal('0')
			
			for flow in invest_flows:
				amount_dec = Decimal(str(flow.amount or 0))
				flow_type = flow.flow_type
				
				if flow_type.value == 'deposit':
					total_deposit += amount_dec
				elif flow_type.value == 'withdraw':
					total_withdraw += amount_dec
				elif flow_type.value in ('dividend', 'interest'):
					total_dividend_interest += amount_dec
				elif flow_type.value in ('trade_in', 'trade_out', 'dividend', 'interest', 'financing_fee'):
					total_profit_flow += amount_dec
			
			# 计算投入资金
			total_investment_cash = total_deposit - total_withdraw
			
			# 计算投资收益率
			invest_profit_rate_value = Decimal('0')
			if total_investment_cash > 0:
				FINANCING_AMOUNT_DEC = Decimal("4207.05")
				invest_profit_rate_value = total_current_value - total_investment_cash - FINANCING_AMOUNT_DEC
			
			return {
				"total_value": float(total_current_value),
				"total_investment": float(total_investment),
				"total_gain_loss": float(total_unrealized_pnl),
				"total_gain_loss_percent": float(gain_loss_percent),
				"stock_count": len(user_stocks),
				"total_investment_cash": float(total_investment_cash),
				"total_interest": float(total_dividend_interest),
				"total_profit": float(total_profit_flow),
				"invest_profit_percent": float(invest_profit_rate_value)
				}
		
		except Exception as e:
			print(f"获取投资组合汇总失败: {e}")
			raise e
	
	@staticmethod
	def get_latest_stock_data(db: Session, symbols: list[str]) -> list[dict]:
		"""批量高效获取股票最新数据及涨跌幅 - 修复版本"""
		if not symbols:
			return []
		
		# 转换为大写
		symbols = [s.upper() for s in symbols]
		
		try:
			# 1. SQL: 批量获取最新数据
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
			
			# 将最新记录转换为映射
			latest_map = {rec.stock_symbol: rec for rec in latest_records}
			
			# 2. SQL: 批量获取前一交易日数据
			previous_subquery = db.query(
				StockPriceHistory.stock_symbol,
				func.max(StockPriceHistory.datetime).label('prev_datetime')
				).filter(
				StockPriceHistory.stock_symbol.in_(symbols),
				StockPriceHistory.datetime < latest_subquery.c.max_datetime
				).group_by(StockPriceHistory.stock_symbol).subquery()
			
			previous_records = db.query(StockPriceHistory).join(
				previous_subquery,
				(StockPriceHistory.stock_symbol == previous_subquery.c.stock_symbol) &
				(StockPriceHistory.datetime == previous_subquery.c.prev_datetime)
				).all()
			
			previous_map = {rec.stock_symbol: rec for rec in previous_records}
			
			# 3. 构建最终结果
			result_list = []
			
			for symbol in symbols:
				latest = latest_map.get(symbol)
				previous = previous_map.get(symbol)
				
				if not latest:
					print(f"警告：未找到股票 {symbol} 数据")
					continue
				
				current_price = Decimal(str(latest.close or 0))
				change, change_percent = Decimal('0'), Decimal('0')
				
				if previous and previous.close:
					previous_price = Decimal(str(previous.close))
					if previous_price != 0:
						change = current_price - previous_price
						change_percent = (change / previous_price) * Decimal('100')
				
				result_list.append({
					"symbol": symbol,
					"price": float(current_price),
					"volume": int(latest.volume or 0),
					"datetime": latest.datetime.isoformat(),
					"change": float(change),
					"changePercent": float(change_percent)
					})
			
			return result_list
		
		except Exception as e:
			print(f"获取股票最新数据失败: {e}")
			return []
	
	@staticmethod
	def process_stock_trade_history(db: Session, user_id: int, latest_data_map: dict, page: int = 1,
	                                page_size: int = 20):
		"""处理股票交易历史 - 修复版本"""
		try:
			# ✅ 修复：使用正确的user_id过滤
			stock_trade_history_list = StockService.get_stock_trade_history(db, user_id, page, page_size)
			
			processed_data = {}
			
			for trade in stock_trade_history_list:
				symbol = trade.stock_symbol
				
				# 只处理买入交易用于显示
				if trade.trade_type != TradeType.buy:
					continue
				
				# 获取最新的股票数据
				latest_data = latest_data_map.get(symbol)
				
				if latest_data:
					current_price = Decimal(str(latest_data["price"]))
					trade_price = Decimal(str(trade.price))
					
					# 计算利润和利润百分比
					profit = (current_price - trade_price) * Decimal(str(trade.quantity))
					profit_percent = ((current_price - trade_price) / trade_price) * Decimal(
						'100') if trade_price > 0 else Decimal('0')
				else:
					profit = Decimal('0')
					profit_percent = Decimal('0')
				
				# 构建交易记录
				transaction = {
					"id": trade.trade_id,
					"type": trade.trade_type.value,
					"date": trade.trade_time.isoformat(),
					"price": float(trade.price),
					"quantity": trade.quantity,
					"assetmarketvalue": float(Decimal(str(trade.quantity)) * Decimal(str(trade.price))),
					"profit": float(profit),
					"profitPercent": float(profit_percent)
					}
				
				# 将交易记录添加到processed_data
				if symbol not in processed_data:
					processed_data[symbol] = []
				
				processed_data[symbol].append(transaction)
			
			return processed_data
		
		except Exception as e:
			print(f"处理股票交易历史失败: {e}")
			return {}
	
	@staticmethod
	def get_stock_performance_analysis(db: Session, symbols: list[str]) -> dict:
		"""获取股票表现分析（包含收益率和指标）"""
		
		# 获取历史收益率
		returns = StockAnalysisService.get_historical_returns(
			db, symbols,
			periods=['1W', 'MTD', 'YTD']
			)
		
		# 获取表现指标
		metrics = StockAnalysisService.get_performance_metrics(db, symbols)
		
		# 合并数据
		result = {}
		for symbol in symbols:
			result[symbol] = {
				'returns': returns.get(symbol, {}),
				'metrics': metrics.get(symbol, {}),
				'symbol': symbol
				}
		
		return result