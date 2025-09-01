# backend/app/api/v1/endpoints/stocks.py

from typing import List

from cvxpy import transpose
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user
from app.schemas.stock import UserStockOut, UserStockCreate, UserStockUpdate, StockSearchResult
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

        # 6. 构建响应数据
        stock_list = []
        for user_stock in user_stocks:
            symbol = user_stock.stock_symbol
            stock_info = stock_info_map.get(symbol)
            stock_latest_data = latest_data_map.get(symbol)
            stock_transaction = stock_transactions_list.get(symbol)

            info = stock_info or {}
            latest = stock_latest_data or {}

            stock_data = {
                "id": user_stock.id,
                "symbol": symbol,
                "addedAt": user_stock.created_at.isoformat(),
                "quantity": user_stock.quantity,
                "averagePrice": user_stock.average_price,
                "unrealizedPnl": user_stock.unrealized_pnl,
                "weight": user_stock.weight,
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