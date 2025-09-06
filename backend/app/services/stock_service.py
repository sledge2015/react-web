# backend/app/services/stock_service.py - 修复版本
import pandas as pd
import logging
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime,timedelta
from sqlalchemy import func, and_, case
from decimal import Decimal, InvalidOperation
from sqlalchemy import text, and_,or_
from difflib import SequenceMatcher

#导入ORM数据结构
from app.models.stock import Stock
from app.models.user import User
from app.models.userstock import UserStock
from app.models.stocktrade import StockTrade,TradeType
from app.models.investmentflow import UserStock
from app.models.stockpricehistory import StockPriceHistory

#导入自定义结构体
from app.schemas.stock import StockCreate, StockUpdate, UserStockCreate, UserStockUpdate
from sqlalchemy.sql.expression import bindparam

logger = logging.getLogger(__name__)

class StockService:
	"""股票服务类"""
	
	@staticmethod
	def get_user_stocks(db: Session, user_id: int) -> List["UserStock"]:
		"""
		获取用户的股票投资组合

		Args:
			db (Session): SQLAlchemy 数据库会话
			user_id (int): 用户 ID

		Returns:
			List[UserStock]: 用户持有的股票列表（仅 active 状态）
		"""
		return db.query(UserStock).filter(
			and_(
				UserStock.user_id == user_id,
				UserStock.is_active == True,
				)
			).order_by(UserStock.created_at.desc()).all()
	
	@staticmethod
	def get_stocks_by_symbols(db: Session, symbols: List[str]) -> List["Stock"]:
		"""
		根据一组股票代码批量查询股票信息

		Args:
			db (Session): SQLAlchemy 数据库会话
			symbols (List[str]): 股票代码列表（不区分大小写）

		Returns:
			List[Stock]: 符合条件的股票信息列表
		"""
		if not symbols:
			return []
		
		stocks = db.query(Stock).filter(
			Stock.stock_symbol.in_([s.upper() for s in symbols])
			).all()
		
		return stocks
	
	@staticmethod
	def get_stock_trade_history(db: Session, user_id: int) -> List["StockTrade"]:
		"""
		获取用户所有买入交易记录（parent_trade_id为空）

		Returns:
			List[StockTrade]: 所有符合条件的买入交易记录
		"""
		return db.query(StockTrade).filter(
			StockTrade.user_id == user_id,
			StockTrade.trade_type == TradeType.buy,
			StockTrade.parent_trade_id.is_(None)
			).order_by(StockTrade.trade_time.desc()).all()
	
	@staticmethod
	def get_stock_price_history_df(
			db: Session,
			symbols: list[str],
			days: int = None  # 默认获取所有记录
			) -> pd.DataFrame:
		"""
		获取股票价格历史数据（从市场数据表）

		Args:
			db: 数据库会话
			symbols: 股票代码列表
			days: 历史天数，None表示获取所有记录

		Returns:
			DataFrame: columns=['stock_symbol', 'datetime', 'close']
		"""
		if not symbols:
			return pd.DataFrame(columns=['stock_symbol', 'datetime', 'close'])
		
		table_name = getattr(StockPriceHistory, '__tablename__', 'stock_price_history')
		
		try:
			# 安全的字符串拼接
			symbols_quoted = ','.join([f"'{symbol}'" for symbol in symbols])
			
			if days is not None:
				sql = text(f"""
		            SELECT stock_symbol, datetime, close
		            FROM {table_name}
		            WHERE stock_symbol IN ({symbols_quoted})
		              AND datetime >= CURRENT_DATE - INTERVAL {days} DAY
		            ORDER BY stock_symbol, datetime DESC
		        """)
			else:
				sql = text(f"""
		            SELECT  stock_symbol, datetime, close
		            FROM {table_name}
		            WHERE stock_symbol IN ({symbols_quoted})
		            ORDER BY stock_symbol, datetime DESC
		        """)
			
			result = db.execute(sql).fetchall()
			
			df = pd.DataFrame(result, columns=['stock_symbol', 'datetime', 'close'])
			
			if not df.empty:
				# 转换成 Timestamp
				df['datetime'] = pd.to_datetime(df['datetime']).dt.tz_localize(None)
				df.set_index('datetime', inplace=True)
				
				# 转换成数值型
				df['close'] = pd.to_numeric(df['close'], errors='coerce')
				# 排序并重置索引
				df = df.sort_values(['stock_symbol', 'datetime']).reset_index(drop=True)
			
			print(f"[INFO] 获取到 {len(df)} 条价格记录, datetime dtype={df['datetime'].dtype}")
			return df
		
		except Exception as e:
			print(f"[ERROR] 获取股票历史价格失败: {e}")
			return pd.DataFrame(columns=['stock_symbol', 'datetime', 'close'])
	
	@staticmethod
	def get_stock_by_id(db: Session, stock_id: int) -> Optional[Stock]:
		"""根据ID获取股票"""
		return db.query(Stock).filter(Stock.id == stock_id).first()
	
	
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
	def update_user_stock(db: Session, user_stock_id: int, user_id: int, stock_update: UserStockUpdate) -> Optional[
		UserStock]:
		"""更新用户股票投资信息"""
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


