// services/stockService.ts
// 股票相关的API服务
import { APIClient } from '../hooks/useAuth';
import { apiClient, ApiResponse } from './api';

export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  ceo?: string;
  employees?: number;
  lastUpdated: string;
  createdAt: string;
}

export interface UserStock {
  id: string;
  userId: string;
  stockId: string;
  symbol: string;
  addedAt: string;
  notes?: string;
  alertPrice?: number;
  stock: Stock;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio?: number;
  week52High: number;
  week52Low: number;
  timestamp: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  stockCount: number;
  lastUpdated: string;
}

class StockService {
  // 获取用户的股票列表
  async getUserStocks(): Promise<UserStock[]> {
    try {
      const response = await apiClient.get<UserStock[]>('/stocks/user');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取股票列表失败');
    } catch (error) {
      console.error('Get user stocks failed:', error);
      throw error;
    }
  }

  // 添加股票到用户列表
  async addUserStock(symbol: string, notes?: string): Promise<UserStock> {
    try {
      const response = await apiClient.post<UserStock>('/stocks/user', {
        symbol,
        notes
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '添加股票失败');
    } catch (error) {
      console.error('Add user stock failed:', error);
      throw error;
    }
  }

  // 从用户列表删除股票
  async removeUserStock(userStockId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/stocks/user/${userStockId}`);

      if (!response.success) {
        throw new Error(response.message || '删除股票失败');
      }
    } catch (error) {
      console.error('Remove user stock failed:', error);
      throw error;
    }
  }

  // 更新用户股票信息
  async updateUserStock(userStockId: string, updates: Partial<UserStock>): Promise<UserStock> {
    try {
      const response = await apiClient.put<UserStock>(`/stocks/user/${userStockId}`, updates);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '更新股票信息失败');
    } catch (error) {
      console.error('Update user stock failed:', error);
      throw error;
    }
  }

  // 搜索股票
  async searchStocks(query: string): Promise<StockSearchResult[]> {
    try {
      const response = await apiClient.get<StockSearchResult[]>(`/stocks/search?q=${encodeURIComponent(query)}`);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Search stocks failed:', error);
      return [];
    }
  }

  // 获取股票详情
  async getStockDetail(symbol: string): Promise<Stock> {
    try {
      const response = await apiClient.get<Stock>(`/stocks/detail/${symbol}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取股票详情失败');
    } catch (error) {
      console.error('Get stock detail failed:', error);
      throw error;
    }
  }

  // 获取股票实时报价
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await apiClient.get<StockQuote>(`/stocks/quote/${symbol}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取股票报价失败');
    } catch (error) {
      console.error('Get stock quote failed:', error);
      throw error;
    }
  }

  // 批量获取股票报价
  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      const response = await apiClient.post<StockQuote[]>('/stocks/quotes/batch', { symbols });

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Get batch quotes failed:', error);
      return [];
    }
  }

  // 获取投资组合汇总
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      const response = await apiClient.get<PortfolioSummary>('/stocks/portfolio/summary');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取投资组合汇总失败');
    } catch (error) {
      console.error('Get portfolio summary failed:', error);
      throw error;
    }
  }

  // 获取热门股票
  async getTrendingStocks(limit: number = 20): Promise<Stock[]> {
    try {
      const response = await apiClient.get<Stock[]>(`/stocks/trending?limit=${limit}`);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Get trending stocks failed:', error);
      return [];
    }
  }

  // 获取市场概览
  async getMarketOverview(): Promise<any> {
    try {
      const response = await apiClient.get('/stocks/market/overview');

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Get market overview failed:', error);
      return null;
    }
  }
}

// 创建股票服务实例
export const stockService = new StockService();




