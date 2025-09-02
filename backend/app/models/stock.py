# backend/app/models/stock.py - 优化现有结构
from app.core.database import Base
from sqlalchemy import (
	Column, Integer, String, Enum, DECIMAL, DateTime, ForeignKey, Index,
	Numeric, UniqueConstraint, func, BigInteger, Float, Boolean, Text
	)
from sqlalchemy.orm import relationship
import enum


# 定义股票交易类型
class TradeType(enum.Enum):
	buy = "buy"
	sell = "sell"
	dividend = "dividend"  # 新增分红类型


# 资金流水类型优化
class FlowType(enum.Enum):
	deposit = "deposit"
	withdraw = "withdraw"
	trade_in = "trade_in"
	trade_out = "trade_out"
	dividend = "dividend"
	interest = "interest"
	financing_fee = "financing_fee"
	fee = "fee"  # 新增通用费用类型


class Stock(Base):
	"""股票模型 - 优化版本"""
	__tablename__ = "stocks"
	
	id = Column(Integer, primary_key=True, index=True)
	stock_symbol = Column(String(20), unique=True, nullable=False, index=True)  # 扩展长度支持复杂代码
	company_name = Column(String(255), nullable=False, index=True)  # 添加索引支持搜索
	exchange = Column(String(20), default='NASDAQ')  # 新增交易所字段
	sector = Column(String(100), index=True)  # 添加索引
	market_cap = Column(BigInteger)
	country = Column(String(50))
	
	# 新增状态字段
	is_active = Column(Boolean, default=True, nullable=False)
	is_tradable = Column(Boolean, default=True, nullable=False)
	
	# 时间字段
	created_at = Column(DateTime, nullable=False, server_default=func.now())
	last_updated = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
	
	# 添加关系
	user_stocks = relationship("UserStock", back_populates="stock")
	trades = relationship("StockTrade", back_populates="stock")  # ✅ 添加与交易的关系
	
	def __repr__(self):
		return f"<Stock(symbol='{self.stock_symbol}', company='{self.company_name}')>"


class UserStock(Base):
	"""用户股票投资组合模型 - 修复关系版本"""
	__tablename__ = "stock_positions"
	
	id = Column(Integer, primary_key=True, index=True)
	
	# 添加用户关联 - 关键修复
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
	                 nullable=False, index=True)
	
	# 股票关联 - 改为使用外键
	stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"),
	                  nullable=False, index=True)
	stock_symbol = Column(String(20), nullable=False, index=True)  # 保留用于快速查询
	
	# 持仓信息
	quantity = Column(Integer, nullable=False, default=0)
	
	# 成本信息 - 统一精度
	average_price = Column(Numeric(12, 4), nullable=False)  # 提升精度
	total_investment = Column(Numeric(20, 2), nullable=False)  # 总投资额
	
	# 当前价格字段 - 用于快速查询
	current_price = Column(Numeric(12, 4), default=0)
	
	# 盈亏信息
	unrealized_pnl = Column(Numeric(20, 2), default=0)
	
	# 用户自定义字段
	notes = Column(Text)  # 投资备注
	target_price = Column(Numeric(12, 4))  # 目标价
	stop_loss = Column(Numeric(12, 4))  # 止损价
	alert_price_high = Column(Numeric(12, 4))  # 价格提醒上限
	alert_price_low = Column(Numeric(12, 4))  # 价格提醒下限
	
	# 权重字段优化
	weight = Column(Numeric(6, 4))  # 改为Numeric，更精确
	
	# 状态字段
	is_active = Column(Boolean, default=True, nullable=False)
	
	# 时间字段优化
	first_purchase_date = Column(DateTime)  # 首次购买时间
	last_trade_date = Column(DateTime)  # 最后交易时间
	created_at = Column(DateTime, nullable=False, server_default=func.now())
	last_updated = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
	
	# 添加关系 - ✅ 修复关系映射
	stock = relationship("Stock", back_populates="user_stocks")
	user = relationship("User")  # 简化关系，避免循环引用
	# ✅ 修复：通过用户ID和股票代码建立与交易的关系
	trades = relationship(
		"StockTrade",
		primaryjoin="and_(UserStock.user_id==StockTrade.user_id, UserStock.stock_symbol==StockTrade.stock_symbol)",
		foreign_keys="[StockTrade.user_id, StockTrade.stock_symbol]",
		viewonly=True  # 设为只读关系，避免复杂的更新逻辑
		)
	
	# 添加复合索引和约束
	__table_args__ = (
		UniqueConstraint('user_id', 'stock_id', name='uq_user_stock'),
		Index('idx_user_active', 'user_id', 'is_active'),
		Index('idx_symbol_user', 'stock_symbol', 'user_id'),
		)
	
	def calculate_current_value(self, current_price: float) -> float:
		"""计算当前市值"""
		return float(current_price * self.quantity) if current_price and self.quantity > 0 else 0.0
	
	def calculate_unrealized_pnl(self, current_price: float) -> tuple[float, float]:
		"""计算未实现盈亏"""
		if not current_price or self.quantity <= 0:
			return 0.0, 0.0
		
		current_value = self.calculate_current_value(current_price)
		unrealized = current_value - float(self.total_investment)
		pct = (unrealized / float(self.total_investment) * 100) if self.total_investment > 0 else 0.0
		
		return unrealized, pct
	
	def __repr__(self):
		return f"<UserStock(user_id={self.user_id}, symbol='{self.stock_symbol}', quantity={self.quantity})>"


class InvestmentFlow(Base):
	"""资金流水表 - 优化版本"""
	__tablename__ = "investment_flows"
	
	id = Column(Integer, primary_key=True, autoincrement=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
	                 nullable=False, index=True)
	
	# 关联交易记录 - 新增
	trade_id = Column(Integer, ForeignKey("stock_trade_history.trade_id", ondelete="SET NULL"),
	                  nullable=True, index=True)
	
	# 流水信息
	flow_type = Column(Enum(FlowType), nullable=False, index=True)
	amount = Column(DECIMAL(20, 2), nullable=False)  # 扩展精度
	currency = Column(String(10), default="USD")
	
	# 关联股票信息
	related_stock = Column(String(20), nullable=True, index=True)  # 扩展长度
	
	# 费用信息优化
	transaction_fee = Column(DECIMAL(18, 2), default=0)
	tax_fee = Column(DECIMAL(18, 2), default=0)  # 分离税费
	interest = Column(DECIMAL(18, 2), default=0)
	other_fees = Column(DECIMAL(18, 2), default=0)  # 新增其他费用
	
	# 余额信息 - 新增
	balance_before = Column(DECIMAL(20, 2))  # 操作前余额
	balance_after = Column(DECIMAL(20, 2))  # 操作后余额
	
	# 时间和描述
	flow_time = Column(DateTime, nullable=False, index=True)
	remark = Column(String(500))  # 扩展长度
	reference_id = Column(String(100), index=True)  # 外部参考ID
	
	# 时间戳
	created_at = Column(DateTime, server_default=func.now(), nullable=False)
	updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
	
	# 关系
	user = relationship("User")
	trade = relationship("StockTrade", back_populates="cash_flow")
	
	# 优化索引
	__table_args__ = (
		Index("idx_user_flow_time", "user_id", "flow_time"),
		Index("idx_flow_type_time", "flow_type", "flow_time"),
		Index("idx_stock_flow", "related_stock", "flow_time"),
		)
	
	def __repr__(self):
		return (
			f"<InvestmentFlow(user_id={self.user_id}, flow_type='{self.flow_type.value}', "
			f"amount={self.amount}, stock='{self.related_stock}', flow_time='{self.flow_time}')>"
		)


class StockPriceHistory(Base):
	"""股票价格历史表 - 优化版本"""
	__tablename__ = "stock_price_daily_history"
	
	# 主键优化
	id = Column(Integer, primary_key=True, autoincrement=True)  # 添加自增ID
	stock_symbol = Column(String(20), nullable=False, index=True)  # 扩展长度
	datetime = Column(DateTime, nullable=False, index=True)
	
	# 价格数据 - 统一精度
	open = Column(DECIMAL(12, 4), nullable=True)
	high = Column(DECIMAL(12, 4), nullable=True)
	low = Column(DECIMAL(12, 4), nullable=True)
	close = Column(DECIMAL(12, 4), nullable=True)
	
	# 技术指标 - 新增
	pe_ratio = Column(DECIMAL(8, 2))
	pb_ratio = Column(DECIMAL(8, 2))
	
	# 数据来源 - 新增
	data_source = Column(String(50), default='API')
	
	# 时间戳
	last_updated = Column(DateTime, nullable=True, default=None, onupdate=func.now())
	created_at = Column(DateTime, nullable=False, server_default=func.now())
	
	# 复合索引优化
	__table_args__ = (
		UniqueConstraint('stock_symbol', 'datetime', name='uq_stock_datetime'),
		Index('idx_symbol_date_desc', 'stock_symbol', 'datetime'),
		Index('idx_date_desc', 'datetime'),
		{'mysql_collate': 'utf8mb4_unicode_ci'}
		)
	
	def __repr__(self):
		return f"<StockPriceHistory(symbol={self.stock_symbol}, datetime={self.datetime}, close={self.close})>"


class StockTrade(Base):
	"""股票交易历史表 - 修复关系版本"""
	__tablename__ = "stock_trade_history"
	
	trade_id = Column(Integer, primary_key=True, autoincrement=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
	                 nullable=False, index=True)  # 添加外键约束
	
	# 股票信息
	stock_id = Column(Integer, ForeignKey("stocks.id", ondelete="CASCADE"),
	                  nullable=True, index=True)  # 新增股票ID外键
	stock_symbol = Column(String(20), nullable=False, index=True)  # 扩展长度
	stock_name = Column(String(255), nullable=False)  # 扩展长度
	market = Column(String(20), nullable=True)
	
	# 交易信息
	trade_time = Column(DateTime, nullable=False, index=True)
	quantity = Column(Integer, nullable=False)
	price = Column(DECIMAL(12, 4), nullable=False)  # 提升精度
	total_amount = Column(DECIMAL(20, 2), nullable=False)  # 新增总金额
	trade_type = Column(Enum(TradeType), nullable=False, index=True)
	
	# 费用信息 - 新增
	commission = Column(DECIMAL(10, 2), default=0)
	tax_fee = Column(DECIMAL(10, 2), default=0)
	other_fees = Column(DECIMAL(10, 2), default=0)
	net_amount = Column(DECIMAL(20, 2))  # 净金额
	
	# 盈亏信息 - 新增（仅卖出时有值）
	realized_pnl = Column(DECIMAL(20, 2))
	realized_pnl_pct = Column(DECIMAL(8, 4))
	
	# 订单信息 - 新增
	order_id = Column(String(100), index=True)  # 外部订单ID
	settlement_date = Column(DateTime)  # 结算日期
	
	# 描述和来源
	reason = Column(String(500))  # 扩展长度
	data_source = Column(String(50), default='MANUAL')  # 数据来源
	notes = Column(Text)  # 新增详细备注
	
	# 时间戳
	created_at = Column(DateTime, nullable=False, server_default=func.now())
	updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
	
	# 关系 - ✅ 修复关系映射
	stock = relationship("Stock", back_populates="trades")  # 与股票的关系
	cash_flow = relationship("InvestmentFlow", back_populates="trade")
	user = relationship("User")  # 与用户的关系
	
	# 优化索引
	__table_args__ = (
		Index('ix_user_symbol_trade_time', 'user_id', 'stock_symbol', 'trade_time'),
		Index('ix_user_trade_time', 'user_id', 'trade_time'),
		Index('ix_trade_type_time', 'trade_type', 'trade_time'),
		Index('ix_stock_trade_time', 'stock_id', 'trade_time'),
		)
	
	def calculate_net_amount(self):
		"""计算净金额"""
		fees = (self.commission or 0) + (self.tax_fee or 0) + (self.other_fees or 0)
		if self.trade_type == TradeType.buy:
			self.net_amount = self.total_amount + fees
		else:
			self.net_amount = self.total_amount - fees
		return self.net_amount
	
	def __repr__(self):
		return (f"<StockTrade(trade_id={self.trade_id}, user_id={self.user_id}, "
		        f"stock_symbol={self.stock_symbol}, trade_time={self.trade_time}, "
		        f"quantity={self.quantity}, price={self.price}, trade_type={self.trade_type})>")


class Portfolio(Base):
	"""投资组合汇总表 - 优化版本"""
	__tablename__ = "portfolios"
	
	id = Column(Integer, primary_key=True, index=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
	                 nullable=False, unique=True)
	
	# 账户资金
	cash_balance = Column(Numeric(20, 2), default=0, nullable=False)
	buying_power = Column(Numeric(20, 2), default=0)
	initial_capital = Column(Numeric(20, 2), default=0)  # 新增初始资金
	
	# 投资组合总览
	total_market_value = Column(Numeric(20, 2), default=0)  # 持仓市值
	total_cost = Column(Numeric(20, 2), default=0)  # 持仓成本
	total_value = Column(Numeric(20, 2), default=0)  # 总资产
	available_cash = Column(Numeric(20, 2), default=0)  # 可用现金
	
	# 盈亏统计
	total_unrealized_pnl = Column(Numeric(20, 2), default=0)
	total_realized_pnl = Column(Numeric(20, 2), default=0)
	total_pnl = Column(Numeric(20, 2), default=0)
	total_pnl_pct = Column(Numeric(8, 4), default=0)
	
	# 今日变动
	day_change = Column(Numeric(20, 2), default=0)
	day_change_pct = Column(Numeric(8, 4), default=0)
	
	# 统计信息
	positions_count = Column(Integer, default=0)
	avg_position_size = Column(Numeric(20, 2))
	largest_position_pct = Column(Numeric(6, 4))
	
	# 风险指标
	beta = Column(Numeric(6, 4))
	sharpe_ratio = Column(Numeric(8, 4))
	max_drawdown = Column(Numeric(8, 4))
	volatility = Column(Numeric(8, 4))  # 新增波动率
	
	# 绩效指标 - 新增
	total_deposits = Column(Numeric(20, 2), default=0)  # 总入金
	total_withdrawals = Column(Numeric(20, 2), default=0)  # 总出金
	net_deposits = Column(Numeric(20, 2), default=0)  # 净入金
	
	# 时间信息
	last_calculated = Column(DateTime)  # 最后计算时间
	last_updated = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
	created_at = Column(DateTime, nullable=False, server_default=func.now())
	
	# 关系
	user = relationship("User")
	
	def calculate_total_return(self):
		"""计算总收益率"""
		if self.net_deposits > 0:
			self.total_pnl_pct = (self.total_pnl / self.net_deposits * 100)
		return self.total_pnl_pct
	
	def __repr__(self):
		return f"<Portfolio(user_id={self.user_id}, total_value={self.total_value})>"
	