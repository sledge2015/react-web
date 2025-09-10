# backend/app/services/stock_metrics.py
import pandas as pd
from pandas.tseries.offsets import CustomBusinessDay
from decimal import Decimal
from typing import List, Dict, Optional
import numpy as np
import pytz


class StockMetrics:
    """股票分析服务类（高效 Pandas 版本）"""

    @staticmethod
    def get_historical_returns(
        price_df: pd.DataFrame,
        symbols: List[str],
        periods: List[str] = ['1W', 'YTD']
    ) -> Dict[str, Dict[str, float]]:
        """
        获取股票历史收益率（按自然周期计算），基于 Pandas。

        price_df: DataFrame，包含 columns=['stock_symbol', 'datetime', 'close']，datetime 必须是 pd.Timestamp
        symbols: 股票代码列表
        periods: 时间周期列表，支持 '1D','1W','2W','1M','3M','6M','1Y','YTD','MTD'
        返回: { "AAPL": {"1D": 1.23, "1W": 5.67, "1M": 10.12}, ... }
        """
        if not symbols or price_df.empty:
            return {}

        symbols = [s.upper() for s in symbols]
        price_df = price_df[price_df['stock_symbol'].isin(symbols)].copy()
        price_df['datetime'] = pd.to_datetime(price_df['datetime']).dt.normalize()
        price_df.sort_values(['stock_symbol', 'datetime'], inplace=True)
        price_df.set_index('datetime', inplace=True)

        # 所有交易日
        trading_days = price_df.index.unique().sort_values()
        result: Dict[str, Dict[str, float]] = {s: {} for s in symbols}
        
        # 使用数据中的最新日期作为基准
        latest_date = trading_days.max()
        print(f"使用最新数据日期作为基准: {latest_date}")

        # 最近收盘价
        latest_prices = price_df.groupby('stock_symbol')['close'].last()

        # 自定义交易日偏移
        all_weekdays = pd.bdate_range(trading_days.min(), trading_days.max())
        holidays = all_weekdays.difference(trading_days)
        us_bday = CustomBusinessDay(holidays=holidays)

        # 计算目标日期函数
        def calc_target_date(current: pd.Timestamp, period: str) -> pd.Timestamp:
            if period == '1D':
                return current - us_bday
            elif period == '1W':
                return current - 5 * us_bday
            elif period == '2W':
                return current - 10 * us_bday
            elif period == '1M':
                return StockMetrics._adjust_to_trading_day(current - pd.DateOffset(months=1), trading_days)
            elif period == '3M':
                return StockMetrics._adjust_to_trading_day(current - pd.DateOffset(months=3), trading_days)
            elif period == '6M':
                return StockMetrics._adjust_to_trading_day(current - pd.DateOffset(months=6), trading_days)
            elif period == '1Y':
                return StockMetrics._adjust_to_trading_day(current - pd.DateOffset(years=1), trading_days)
            elif period == 'YTD':
                return StockMetrics._adjust_to_trading_day(current.replace(month=1, day=1), trading_days)
            elif period == 'MTD':
                return StockMetrics._adjust_to_trading_day(current.replace(day=1), trading_days)
            else:
                return None

        # 遍历每只股票
        for symbol in symbols:
            latest_price = latest_prices.get(symbol, None)
            if pd.isna(latest_price) or latest_price == 0:
                continue
            for period in periods:
                target_date = calc_target_date(latest_date, period)
                if target_date is None:
                    result[symbol][period] = 0.0
                    continue
                # 查找最近交易日价格
                past_prices = price_df.loc[(price_df['stock_symbol'] == symbol) & (price_df.index <= target_date), 'close']
                if past_prices.empty:
                    result[symbol][period] = 0.0
                    continue
                past_price = past_prices.iloc[-1]
                if past_price == 0:
                    result[symbol][period] = 0.0
                    continue
                returns = (Decimal(str(latest_price)) - Decimal(str(past_price))) / Decimal(str(past_price)) * Decimal('100')
                result[symbol][period] = float(returns.quantize(Decimal('0.01')))
        return result

    @staticmethod
    def _adjust_to_trading_day(date: pd.Timestamp, trading_days: pd.DatetimeIndex) -> pd.Timestamp:
        """调整日期到最近交易日（向前取交易日）"""
        if date in trading_days:
            return date
        prior_days = trading_days[trading_days <= date]
        return prior_days[-1] if len(prior_days) > 0 else None
    
    @staticmethod
    def _build_daily_positions(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame
            ) -> pd.DataFrame:
        """
		构建每日持仓表和权重表（向量化）

		Parameters:
		transactions_df: columns=['trade_time', 'stock_symbol', 'quantity', 'price']
		price_df: columns=['date', 'stock_symbol', 'close']

		Returns:
		每日持仓DataFrame
		"""
        if transactions_df.empty or price_df.empty:
            return pd.DataFrame()
        
        transactions_df = transactions_df.copy()
        price_df = price_df.copy()
        
        # 预处理时间字段
        transactions_df['trade_time'] = pd.to_datetime(transactions_df['trade_time'])
        price_df['date'] = pd.to_datetime(price_df['date'])
        
        # 1️⃣ 累计交易数量
        transactions_df['trade_date'] = transactions_df['trade_time'].dt.floor('D')
        daily_qty = (
            transactions_df
            .groupby(['trade_date', 'stock_symbol'])['quantity']
            .sum()
            .reset_index()
        )
        
        if daily_qty.empty:
            return pd.DataFrame()
        
        # 2️⃣ 创建完整日期×股票表
        all_dates = pd.date_range(
            daily_qty['trade_date'].min(),
            daily_qty['trade_date'].max(),
            freq='D'
            )
        stocks = daily_qty['stock_symbol'].unique()
        full_index = pd.MultiIndex.from_product(
            [all_dates, stocks],
            names=['date', 'stock_symbol']
            )
        daily_positions = daily_qty.set_index(['trade_date', 'stock_symbol']).reindex(
            full_index, fill_value=0
            )
        
        # 3️⃣ 累计持仓
        daily_positions['quantity'] = daily_positions['quantity'].groupby(level=1).cumsum()
        daily_positions = daily_positions.reset_index()
        
        # 4️⃣ 对齐价格（merge_asof）
        price_df_sorted = price_df.sort_values('date')
        daily_positions_sorted = daily_positions.sort_values('date')
        daily_positions_merged = pd.merge_asof(
            daily_positions_sorted,
            price_df_sorted,
            by='stock_symbol',
            left_on='date',
            right_on='date',
            direction='backward'
            )
        
        # 过滤掉没有价格的数据
        daily_positions_merged = daily_positions_merged.dropna(subset=['close'])
        
        if daily_positions_merged.empty:
            return pd.DataFrame()
        
        # 5️⃣ 计算每日市值
        daily_positions_merged['market_value'] = (
                daily_positions_merged['quantity'] * daily_positions_merged['close']
        )
        
        # 6️⃣ 计算每日总市值与权重
        daily_total_value = (
            daily_positions_merged
            .groupby('date')['market_value']
            .sum()
            .rename('total_value')
        )
        daily_positions_merged = daily_positions_merged.merge(daily_total_value, on='date')
        
        # 避免除零错误
        daily_positions_merged['weight'] = np.where(
            daily_positions_merged['total_value'] > 0,
            daily_positions_merged['market_value'] / daily_positions_merged['total_value'],
            0
            )
        
        return daily_positions_merged
    
    @staticmethod
    def _get_portfolio_daily_returns(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            lookback_days: Optional[int] = None
            ) -> pd.Series:
        """
		计算每日组合收益率
		"""
        daily_positions = StockMetrics._build_daily_positions(
            transactions_df, price_df
            )
        
        if daily_positions.empty:
            return pd.Series()
        
        # 计算每日组合总市值
        daily_value = daily_positions.groupby('date')['market_value'].sum()
        
        # 计算每日收益率
        daily_return = daily_value.pct_change().fillna(0)
        
        # 应用回望期限制
        if lookback_days and len(daily_return) > lookback_days:
            daily_return = daily_return.tail(lookback_days)
        
        return daily_return
    
    @staticmethod
    def get_portfolio_sharpe_ratio(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            risk_free_rate: float = 0.03,
            lookback_days: int = 252
            ) -> float:
        """
		计算组合夏普比率（年化）
		"""
        daily_returns = StockMetrics._get_portfolio_daily_returns(
            transactions_df, price_df, lookback_days
            )
        
        if len(daily_returns) < 50:
            return 0.0
        
        # 计算年化超额收益和夏普比率
        excess_return = daily_returns - risk_free_rate / 252
        
        if excess_return.std() == 0:
            return 0.0
        
        sharpe_ratio = (excess_return.mean() / excess_return.std()) * np.sqrt(252)
        return round(sharpe_ratio, 2)
    
    @staticmethod
    def get_portfolio_max_drawdown(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            lookback_days: int = 252
            ) -> Dict[str, any]:
        """
		计算组合最大回撤信息
		"""
        daily_returns = StockMetrics._get_portfolio_daily_returns(
            transactions_df, price_df, lookback_days
            )
        
        if len(daily_returns) < 50:
            return {
                'max_drawdown': 0.0,
                'drawdown_start_date': None,
                'drawdown_end_date': None,
                'recovery_date': None,
                'duration_days': 0
                }
        
        # 计算累计收益和回撤
        cumulative = (1 + daily_returns).cumprod()
        rolling_max = cumulative.cummax()
        drawdown = (cumulative - rolling_max) / rolling_max
        
        # 最大回撤值和日期
        max_drawdown = drawdown.min() * 100
        drawdown_end_date = drawdown.idxmin()
        
        # 回撤开始日期（最近的历史高点）
        drawdown_start_date = rolling_max.loc[:drawdown_end_date].idxmax()
        
        # 恢复日期（回撤后第一次创新高的日期）
        recovery_date = None
        peak_value = rolling_max.loc[drawdown_start_date]
        
        for date in cumulative.loc[drawdown_end_date:].index:
            if cumulative.loc[date] >= peak_value:
                recovery_date = date
                break
        
        # 计算持续时间
        if recovery_date:
            duration_days = (recovery_date - drawdown_start_date).days
        else:
            duration_days = (cumulative.index[-1] - drawdown_start_date).days
        
        return {
            'max_drawdown': round(max_drawdown, 2),
            'drawdown_start_date': drawdown_start_date,
            'drawdown_end_date': drawdown_end_date,
            'recovery_date': recovery_date,
            'duration_days': duration_days
            }
    
    @staticmethod
    def get_portfolio_volatility(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            lookback_days: int = 252
            ) -> float:
        """
		计算组合年化波动率（按252交易日计算）
		"""
        daily_returns = StockMetrics._get_portfolio_daily_returns(
            transactions_df, price_df, lookback_days
            )
        
        if len(daily_returns) < 50:
            return 0.0
        
        volatility = daily_returns.std() * np.sqrt(252) * 100
        return round(volatility, 2)
    
    @staticmethod
    def get_portfolio_annualized_return(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            lookback_days: int = 252
            ) -> float:
        """
		计算组合年化收益率
		"""
        daily_returns = StockMetrics._get_portfolio_daily_returns(
            transactions_df, price_df, lookback_days
            )
        
        if len(daily_returns) < 50:
            return 0.0
        
        # 计算总收益率
        total_return = (1 + daily_returns).prod() - 1
        
        # 计算年化收益率
        trading_days = len(daily_returns)
        annualized_return = (1 + total_return) ** (252 / trading_days) - 1
        
        return round(annualized_return * 100, 2)
    
    @staticmethod
    def get_portfolio_sortino_ratio(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            risk_free_rate: float = 0.03,
            lookback_days: int = 252
            ) -> float:
        """
		计算组合索提诺比率
		"""
        daily_returns = StockMetrics._get_portfolio_daily_returns(
            transactions_df, price_df, lookback_days
            )
        
        if len(daily_returns) < 50:
            return 0.0
        
        # 计算年化收益率
        annual_return = daily_returns.mean() * 252
        
        # 计算下行波动率（只考虑负收益）
        negative_returns = daily_returns[daily_returns < 0]
        
        if len(negative_returns) == 0:
            return 999.99
        
        downside_volatility = negative_returns.std() * np.sqrt(252)
        
        if downside_volatility == 0:
            return 0.0
        
        # 计算索提诺比率
        sortino_ratio = (annual_return - risk_free_rate) / downside_volatility
        return round(sortino_ratio, 2)
    
    @staticmethod
    def get_portfolio_cumulative_return(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            lookback_days: int = 252
            ) -> pd.Series:
        """
		计算累计收益率序列
		"""
        daily_returns = StockMetrics._get_portfolio_daily_returns(
            transactions_df, price_df, lookback_days
            )
        
        if daily_returns.empty:
            return pd.Series()
        
        cumulative_return = (1 + daily_returns).cumprod() - 1
        return cumulative_return
    
    @staticmethod
    def get_daily_positions(
            transactions_df: pd.DataFrame,
            price_df: pd.DataFrame,
            lookback_days: Optional[int] = None
            ) -> pd.DataFrame:
        """
		获取每日持仓和权重表
		"""
        daily_positions = StockMetrics._build_daily_positions(
            transactions_df, price_df
            )
        
        if lookback_days and not daily_positions.empty:
            latest_date = daily_positions['date'].max()
            start_date = latest_date - pd.Timedelta(days=lookback_days)
            daily_positions = daily_positions[daily_positions['date'] >= start_date]
        
        return daily_positions