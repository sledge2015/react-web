// src/services/longportService.ts - 长桥API服务
import { APIClient } from '../hooks/useAuth';

// 长桥API相关接口定义
export interface LongPortAccount {
  account_channel: string;
  account_type: string;
  account_no: string;
  currency: string;
  cash: number;
  net_assets: number;
  init_assets: number;
  disburse_assets: number;
  settlement_currency: string;
}

export interface MarketQuote {
  symbol: string;
  last_done: number;
  prev_close: number;
  open: number;
  high: number;
  low: number;
  timestamp: number;
  volume: number;
  turnover: number;
  trade_status: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  last_done: number;
  change_val: number;
  change_rate: number;
  volume: number;
}

export class LongPortService {
  private static baseURL = process.env.REACT_APP_API_URL + '/api/v1/longport';

  /**
   * 获取账户信息
   */
  static async getAccountInfo(): Promise<{ success: boolean; data?: LongPortAccount[]; error?: string }> {
    try {
      const response = await APIClient.get(`${this.baseURL}/account`);
      return response;
    } catch (error) {
      console.error('获取长桥账户信息失败:', error);
      return {
        success: false,
        error: '获取账户信息失败'
      };
    }
  }

  /**
   * 获取实时行情
   */
  static async getRealTimeQuotes(symbols: string[]): Promise<{ success: boolean; data?: MarketQuote[]; error?: string }> {
    try {
      const response = await APIClient.post(`${this.baseURL}/quotes`, { symbols });
      return response;
    } catch (error) {
      console.error('获取实时行情失败:', error);
      return {
        success: false,
        error: '获取行情数据失败'
      };
    }
  }

  /**
   * 获取市场概览
   */
  static async getMarketOverview(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await APIClient.get(`${this.baseURL}/market/overview`);
      return response;
    } catch (error) {
      console.error('获取市场概览失败:', error);
      return {
        success: false,
        error: '获取市场概览失败'
      };
    }
  }

  /**
   * 获取自选股列表
   */
  static async getWatchlist(): Promise<{ success: boolean; data?: WatchlistItem[]; error?: string }> {
    try {
      const response = await APIClient.get(`${this.baseURL}/watchlist`);
      return response;
    } catch (error) {
      console.error('获取自选股失败:', error);
      return {
        success: false,
        error: '获取自选股失败'
      };
    }
  }

  /**
   * 添加自选股
   */
  static async addToWatchlist(symbol: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await APIClient.post(`${this.baseURL}/watchlist`, { symbol });
      return response;
    } catch (error) {
      console.error('添加自选股失败:', error);
      return {
        success: false,
        error: '添加自选股失败'
      };
    }
  }

  /**
   * 删除自选股
   */
  static async removeFromWatchlist(symbol: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await APIClient.delete(`${this.baseURL}/watchlist/${symbol}`);
      return response;
    } catch (error) {
      console.error('删除自选股失败:', error);
      return {
        success: false,
        error: '删除自选股失败'
      };
    }
  }

  /**
   * 搜索股票
   */
  static async searchStocks(query: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await APIClient.get(`${this.baseURL}/search?q=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.error('搜索股票失败:', error);
      return {
        success: false,
        error: '搜索失败'
      };
    }
  }

  /**
   * 获取历史K线数据
   */
  static async getKlineData(
    symbol: string,
    period: string = '1day',
    count: number = 100
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await APIClient.get(`${this.baseURL}/kline`, {
        params: { symbol, period, count }
      });
      return response;
    } catch (error) {
      console.error('获取K线数据失败:', error);
      return {
        success: false,
        error: '获取K线数据失败'
      };
    }
  }
}