# backend/app/schemas/stock.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StockBase(BaseModel):
    """股票基础模式"""
    stock_symbol: str
    company_name: str
    sector: Optional[str] = None
    market_cap: Optional[int] = None
    pe_ratio: Optional[float] = None
    country: Optional[str] = None


class StockCreate(StockBase):
    """股票创建模式"""
    pass


class StockUpdate(BaseModel):
    """股票更新模式"""
    company_name: Optional[str] = None
    sector: Optional[str] = None
    market_cap: Optional[int] = None
    pe_ratio: Optional[float] = None
    country: Optional[str] = None


class StockOut(StockBase):
    """股票输出模式"""
    id: int
    created_at: datetime
    last_updated: datetime

    class Config:
        from_attributes = True


class UserStockCreate(BaseModel):
    """用户股票创建模式"""
    stock_symbol: str
    quantity: int
    average_price: float


class UserStockUpdate(BaseModel):
    """用户股票更新模式"""
    quantity: Optional[int] = None
    average_price: Optional[float] = None
    current_price: Optional[float] = None


class UserStockOut(BaseModel):
    """用户股票输出模式"""
    id: int
    stock_symbol: str
    quantity: int
    average_price: float
    total_investment: Optional[float] = None
    last_updated: datetime
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    created_at: datetime
    weight: Optional[float] = None
    unrealized_pnl: Optional[float] = None

    class Config:
        from_attributes = True


class StockSearchResult(BaseModel):
    """股票搜索结果"""
    symbol: str
    name: str
    type: str
    region: Optional[str] = None
    currency: Optional[str] = None