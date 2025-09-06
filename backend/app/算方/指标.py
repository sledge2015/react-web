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
        price_df['datetime'] = pd.to_datetime(price_df['datetime'])
        price_df.sort_values(['stock_symbol', 'datetime'], inplace=True)
        price_df.set_index('datetime', inplace=True)

        # 所有交易日
        trading_days = price_df.index.unique().sort_values()
        result: Dict[str, Dict[str, float]] = {s: {} for s in symbols}

        # 美东时间收盘
        est = pytz.timezone("US/Eastern")
        now = pd.Timestamp.now(tz=est).replace(hour=16, minute=0, second=0, microsecond=0)

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
                target_date = calc_target_date(now, period)
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
    def get_performance_metrics(price_df: pd.DataFrame, symbols: List[str]) -> Dict[str, Dict[str, float]]:
        """
        获取股票表现指标，基于 Pandas：
        - volatility: 波动率（30天年化）
        - rsi: RSI指标（14天）
        - ma_deviation: 当前价格与20日均线偏离度
        """
        if not symbols or price_df.empty:
            return {}
        symbols = [s.upper() for s in symbols]
        price_df = price_df[price_df['stock_symbol'].isin(symbols)].copy()
        price_df['datetime'] = pd.to_datetime(price_df['datetime'])
        price_df.sort_values(['stock_symbol', 'datetime'], inplace=True)
        price_df.set_index('datetime', inplace=True)

        result: Dict[str, Dict[str, float]] = {}
        trading_days = price_df.index.unique().sort_values()

        for symbol in symbols:
            df = price_df[price_df['stock_symbol'] == symbol].copy()
            closes = df['close'].values
            if len(closes) < 10:
                continue
            metrics: Dict[str, float] = {}

            # 波动率（30天）
            if len(closes) >= 20:
                returns = np.diff(closes) / closes[:-1]
                vol = np.std(returns[-30:]) * np.sqrt(252) * 100
                metrics['volatility'] = round(vol, 2)

            # RSI
            if len(closes) >= 14:
                metrics['rsi'] = round(StockMetrics._calculate_rsi(closes), 2)

            # MA 偏离
            if len(closes) >= 20:
                ma20 = np.mean(closes[-20:])
                metrics['ma_deviation'] = round((closes[-1] - ma20) / ma20 * 100, 2)

            if metrics:
                result[symbol] = metrics
        return result

    @staticmethod
    def _calculate_rsi(prices: np.ndarray, period: int = 14) -> float:
        """计算RSI指标"""
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))
