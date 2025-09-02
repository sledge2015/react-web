# backend/app/api/v1/endpoints/stocks.py

from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.schemas.stock import (
    UserStockOut, UserStockCreate, UserStockUpdate, StockSearchResult,
    StockTradeRequest, StockSellRequest, StockTradeResponse
)
from app.services.stock_trading_service import StockTradingService
from app.services.stock_service import StockService
from app.models.user import User

router = APIRouter()

@router.get(
	"/user",
	summary="获取用户股票列表",
	description="获取当前用户的股票投资组合"
	)
def get_user_stocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取用户股票列表端点"""
    try:
        print(f"[INFO] 获取用户({current_user.id})持仓列表开始")
        # 1. 获取用户持仓列表
        user_stocks = StockService.get_user_stocks(db, current_user.id)
        print(f"[INFO] 用户持仓列表: {user_stocks}")

        if not user_stocks:
            print("[INFO] 用户无持仓")
            return {
                "success": True,
                "data": []
            }

        # 2. 提取所有需要的股票代码
        symbols = [stock.stock_symbol for stock in user_stocks]
        print(f"[INFO] 查询股票代码: {symbols}")

        # 3. 批量查询股票基本信息
        stock_infos = StockService.get_stocks_by_symbols(db, symbols)
        stock_info_map = {info.stock_symbol: info for info in stock_infos}
        # print(f"[INFO] 股票基本信息获取完成: {list(stock_info_map.keys())}")

        # 4. 批量查询股票最新市场数据
        stock_latest_data_list = StockService.get_latest_stock_data(db, symbols)
        latest_data_map = {data["symbol"]: data for data in stock_latest_data_list}
        # print(f"[INFO] 最新市场数据获取完成: {list(latest_data_map.keys())}")
        
        # 5. 批量查询交易数据
        stock_transactions_list = StockService.process_stock_trade_history(db, current_user.id, latest_data_map)
        print(f"[INFO] 交易数据获取完成: {list(stock_transactions_list.keys())}")
        
        # 7. 批量计算收益率
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        stock_returns_list = StockService.get_stock_performance_analysis(db, symbol_list)

        # 6. 构建响应数据
        stock_list = []
        for user_stock in user_stocks:
            symbol = user_stock.stock_symbol
            stock_info = stock_info_map.get(symbol)
            stock_latest_data = latest_data_map.get(symbol)
            stock_transaction = stock_transactions_list.get(symbol)

            info = stock_info or {}
            latest = stock_latest_data or {}
            
            #计算整体收益率
            totalPercent = (latest.get('price', user_stock.current_price) - user_stock.average_price)/user_stock.average_price * Decimal('100')
            stock_data = {
                "id": user_stock.id,
                "symbol": symbol,
                "addedAt": user_stock.created_at.isoformat(),
                "quantity": user_stock.quantity,
                "averagePrice": user_stock.average_price,
                "unrealizedPnl": user_stock.unrealized_pnl,
                "weight": user_stock.weight,
	            "dayPercent":stock_returns_list[symbol]['1W'],
	            "weekPercent":stock_returns_list[symbol]['1M'],
                "monthPercent":stock_returns_list[symbol][''],
                "totalPercent":totalPercent,
	            "transactions": stock_transaction,
                "stock": {
                    "id": user_stock.id,
                    "symbol": symbol,
                    "companyName": getattr(info, 'company_name', f"{symbol} Inc."),
                    "marketCap": getattr(info, 'market_cap', 0),
                    "sector": getattr(info, 'sector', "N/A"),
                    "country": getattr(info, 'country', "N/A"),
                    "price": latest.get('price', user_stock.current_price),
                    "change": latest.get('change', 0),
                    "changePercent": latest.get('changePercent', 0),
                    "volume": latest.get('volume', 0),
                    "lastUpdated": latest.get('datetime', user_stock.last_updated.isoformat() if user_stock.last_updated else ""),
                },
            }
            print(f"[DEBUG] 构建单只股票数据: {symbol} -> {stock_data}")
            stock_list.append(stock_data)

        print(f"[INFO] 用户股票列表构建完成，总数: {len(stock_list)}")
        return {
            "success": True,
            "data": stock_list
        }

    except Exception as e:
        print(f"[ERROR] 获取用户股票失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="无法获取股票投资组合数据，请稍后再试。"
        )

@router.post(
	"/user",
	status_code=status.HTTP_201_CREATED,
	summary="添加股票到投资组合",
	description="将股票添加到用户的投资组合中"
	)
def add_user_stock(
		stock_data: UserStockCreate,
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""添加用户股票端点"""
	try:
		user_stock = StockService.add_user_stock(db, current_user.id, stock_data)
		return {
			"success": True,
			"data": user_stock,
			"message": f"已成功添加 {stock_data.stock_symbol} ({stock_data.quantity}股) 到投资组合"
			}
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
			)
	except Exception as e:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"添加股票失败: {str(e)}"
			)


@router.put(
	"/user/{user_stock_id}",
	summary="更新用户股票信息",
	description="更新用户股票的备注和提醒价格"
	)
def update_user_stock(
		user_stock_id: int,
		stock_update: UserStockUpdate,
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""更新用户股票端点"""
	user_stock = StockService.update_user_stock(db, user_stock_id, current_user.id, stock_update)
	if not user_stock:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="未找到该股票记录"
			)
	
	return {
		"success": True,
		"data": user_stock,
		"message": "股票信息更新成功"
		}


@router.delete(
	"/user/{user_stock_id}",
	status_code=status.HTTP_204_NO_CONTENT,
	summary="从投资组合移除股票",
	description="将股票从用户的投资组合中移除"
	)
def remove_user_stock(
		user_stock_id: int,
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""移除用户股票端点"""
	success = StockService.remove_user_stock(db, user_stock_id, current_user.id)
	if not success:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="未找到该股票记录"
			)
	return None


@router.get(
	"/search",
	summary="搜索股票",
	description="根据股票代码或公司名称搜索股票"
	)
def search_stocks(
		q: str = Query(..., description="搜索关键词"),
		limit: int = Query(20, ge=1, le=100, description="返回结果数量"),
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""搜索股票端点"""
	try:
		stocks = StockService.search_stocks(db, q, limit)
		
		search_results = []
		for stock in stocks:
			result = {
				"symbol": stock.stock_symbol,
				"name": stock.company_name,
				"type": "Equity",
				"region": stock.country or "US",
				"currency": "USD"
				}
			search_results.append(result)
		
		return {
			"success": True,
			"data": search_results
			}
	
	except Exception as e:
		print(f"❌ 搜索股票失败: {e}")
		# 返回模拟搜索结果
		mock_results = [
			{"symbol": "AAPL", "name": "Apple Inc.", "type": "Equity", "region": "US", "currency": "USD"},
			{"symbol": "GOOGL", "name": "Alphabet Inc.", "type": "Equity", "region": "US", "currency": "USD"},
			{"symbol": "MSFT", "name": "Microsoft Corporation", "type": "Equity", "region": "US", "currency": "USD"}
			]
		filtered_results = [r for r in mock_results if q.upper() in r["symbol"] or q.lower() in r["name"].lower()]
		return {
			"success": True,
			"data": filtered_results[:limit]
			}


@router.get(
	"/portfolio/summary",
	summary="获取投资组合汇总",
	description="获取用户投资组合的汇总统计信息"
	)
def get_portfolio_summary(
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""获取投资组合汇总端点"""
	try:
		summary = StockService.get_portfolio_summary(db, current_user.id)
		return {
			"success": True,
			"data": {
				"totalValue": summary.get("total_value", 0),
				"totalInvestment": summary.get("total_investment", 0),
				"totalGainLoss": summary.get("total_gain_loss", 0),
				"totalGainLossPercent": summary.get("total_gain_loss_percent", 0),
				"stockCount": summary.get("stock_count", 0),
				"total_investment_cash": summary.get("total_investment_cash", 0),
				"total_interest": summary.get("total_interest", 0),
				"total_profit": summary.get("total_profit", 0),
				"invest_profit_percent": summary.get("invest_profit_percent", 0)
				}
			}
	except Exception as e:
		print(f"❌ 获取投资组合汇总失败: {e}")


@router.post(
	"/buy",
	status_code=status.HTTP_201_CREATED,
	summary="买入股票",
	description="执行股票买入操作，更新持仓和资金流水"
	)
def buy_stock(
		trade_data: StockTradeRequest,
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""
	买入股票操作

	参数:
	- stock_symbol: 股票代码
	- quantity: 买入数量
	- price: 买入价格
	- notes: 备注信息（可选）
	- commission: 佣金费用（可选）
	- other_fees: 其他费用（可选）
	"""
	try:
		result = StockTradingService.buy_stock(
			db=db,
			user_id=current_user.id,
			stock_symbol=trade_data.stock_symbol,
			quantity=trade_data.quantity,
			price=trade_data.price,
			notes=trade_data.notes,
			commission=trade_data.commission or 0,
			other_fees=trade_data.other_fees or 0
			)
		
		return {
			"success": True,
			"data": result,
			"message": f"成功买入 {trade_data.stock_symbol} {trade_data.quantity} 股"
			}
	
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
			)
	except Exception as e:
		print(f"❌ 买入股票失败: {e}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"买入操作失败: {str(e)}"
			)


@router.post(
	"/sell",
	status_code=status.HTTP_200_OK,
	summary="卖出股票",
	description="执行股票卖出操作，更新持仓和资金流水"
	)
def sell_stock(
		trade_data: StockSellRequest,
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""
	卖出股票操作

	参数:
	- stock_symbol: 股票代码
	- quantity: 卖出数量
	- price: 卖出价格
	- notes: 备注信息（可选）
	- commission: 佣金费用（可选）
	- tax_fee: 税费（可选）
	- other_fees: 其他费用（可选）
	"""
	try:
		result = StockTradingService.sell_stock(
			db=db,
			user_id=current_user.id,
			stock_symbol=trade_data.stock_symbol,
			quantity=trade_data.quantity,
			price=trade_data.price,
			notes=trade_data.notes,
			commission=trade_data.commission or 0,
			tax_fee=trade_data.tax_fee or 0,
			other_fees=trade_data.other_fees or 0
			)
		
		return {
			"success": True,
			"data": result,
			"message": f"成功卖出 {trade_data.stock_symbol} {trade_data.quantity} 股"
			}
	
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
			)
	except Exception as e:
		print(f"❌ 卖出股票失败: {e}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"卖出操作失败: {str(e)}"
			)

@router.delete(
	"/position/{position_id}/clear",
	status_code=status.HTTP_200_OK,
	summary="清空股票持仓",
	description="完全清空指定的股票持仓（市价卖出所有股票）"
	)
def clear_position(
		position_id: int,
		current_price: Optional[float] = Query(None, description="当前市价，不提供则使用最新价格"),
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""
	清空股票持仓

	参数:
	- position_id: 持仓ID
	- current_price: 当前市价（可选，如果不提供将使用最新价格）
	"""
	try:
		result = StockTradingService.clear_position(
			db=db,
			user_id=current_user.id,
			position_id=position_id,
			sell_price=current_price
			)
		
		return {
			"success": True,
			"data": result,
			"message": f"成功清空持仓 {result.get('stock_symbol', '')}"
			}
	
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
			)
	except Exception as e:
		print(f"❌ 清空持仓失败: {e}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"清空持仓失败: {str(e)}"
			)

@router.get(
	"/trades/history",
	summary="获取交易历史",
	description="获取用户的股票交易历史记录"
	)
def get_trade_history(
		stock_symbol: Optional[str] = Query(None, description="股票代码过滤"),
		trade_type: Optional[str] = Query(None, description="交易类型过滤(buy/sell/dividend)"),
		page: int = Query(1, ge=1, description="页码"),
		page_size: int = Query(20, ge=1, le=100, description="每页数量"),
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""
	获取交易历史记录

	参数:
	- stock_symbol: 股票代码过滤（可选）
	- trade_type: 交易类型过滤（可选：buy, sell, dividend）
	- page: 页码
	- page_size: 每页数量
	"""
	try:
		# 转换trade_type字符串为枚举
		trade_type_enum = None
		if trade_type:
			try:
				trade_type_enum = TradeType(trade_type.lower())
			except ValueError:
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail=f"无效的交易类型: {trade_type}，支持的类型: buy, sell, dividend"
					)
		
		trades = StockTradingService.get_trade_history(
			db=db,
			user_id=current_user.id,
			stock_symbol=stock_symbol,
			trade_type=trade_type_enum,
			page=page,
			page_size=page_size
			)
		
		return {
			"success": True,
			"data": trades,
			"message": "获取交易历史成功"
			}
	
	except HTTPException:
		raise
	except Exception as e:
		print(f"❌ 获取交易历史失败: {e}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"获取交易历史失败: {str(e)}"
			)

@router.get(
	"/trades/statistics",
	summary="获取交易统计",
	description="获取用户的交易统计信息"
	)
def get_trade_statistics(
		start_date: Optional[str] = Query(None, description="开始日期 (YYYY-MM-DD)"),
		end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
		db: Session = Depends(get_db),
		current_user: User = Depends(get_current_active_user)
		):
	"""
	获取交易统计信息

	参数:
	- start_date: 开始日期，格式：YYYY-MM-DD
	- end_date: 结束日期，格式：YYYY-MM-DD
	"""
	try:
		# 解析日期
		start_dt = None
		end_dt = None
		
		if start_date:
			try:
				start_dt = datetime.strptime(start_date, "%Y-%m-%d")
			except ValueError:
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail="开始日期格式错误，请使用 YYYY-MM-DD 格式"
					)
		
		if end_date:
			try:
				end_dt = datetime.strptime(end_date, "%Y-%m-%d")
			except ValueError:
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail="结束日期格式错误，请使用 YYYY-MM-DD 格式"
					)
		
		statistics = StockTradingService.get_trade_statistics(
			db=db,
			user_id=current_user.id,
			start_date=start_dt,
			end_date=end_dt
			)
		
		return {
			"success": True,
			"data": statistics,
			"message": "获取交易统计成功"
			}
	
	except HTTPException:
		raise
	except Exception as e:
		print(f"❌ 获取交易统计失败: {e}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"获取交易统计失败: {str(e)}"
			)