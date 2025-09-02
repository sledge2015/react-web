// ========================= 基础类型定义 =========================

/**
 * 交易类型枚举
 */
export type TradeType = 'buy' | 'sell' | 'dividend' | 'split';

/**
 * 市场状态枚举
 */
export type MarketStatus = 'pre_market' | 'open' | 'after_hours' | 'closed' | 'holiday';

/**
 * 数据可靠性级别
 */
export type DataReliability = 'high' | 'medium' | 'low';

/**
 * 技术信号类型
 */
export type TechnicalSignal = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

/**
 * 趋势方向
 */
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

// ========================= 核心数据接口 =========================

/**
 * 优化后的股票基础信息接口
 * 解决原Stock接口字段不一致的问题
 */
export interface Stock {
  // 基础标识
  id: string;
  symbol: string;
  companyName: string;
  
  // 市场信息
  exchange: string;           // 🆕 交易所信息
  sector?: string;
  industry?: string;          // 🆕 细分行业
  country?: string;
  currency: string;           // 🆕 交易货币
  
  // 市场数据 - 重新组织
  market: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    avgVolume30d?: number;    // 🆕 30日平均成交量
    marketCap: number;
    
    // 🆕 扩展市场数据
    bid?: number;
    ask?: number;
    dayHigh?: number;
    dayLow?: number;
    week52High?: number;
    week52Low?: number;
    
    // 基础估值指标
    peRatio?: number;
    pbRatio?: number;         // 🆕 市净率
    dividendYield?: number;   // 🆕 股息率
  };
  
  // 🆕 市场状态
  marketStatus: MarketStatus;
  
  // 元数据
  description?: string;
  lastUpdated: string;
  
  // 🆕 数据质量指标
  dataQuality: {
    source: string;           // 数据来源
    reliability: DataReliability;
    lastRefresh: string;
    isRealtime: boolean;      // 是否实时数据
  };
}

/**
 * 优化后的交易记录接口
 * 解决原Transaction接口命名不规范的问题
 */
export interface Transaction {
  id: string;
  symbol: string;              // ✅ 必填，移除可选
  type: TradeType;
  
  // 交易详情 - 重新组织
  execution: {
    date: string;              // ISO格式时间戳
    price: number;
    quantity: number;
    totalValue: number;        // 🔄 重命名：assetmarketvalue -> totalValue
    
    // 🆕 费用明细
    commission?: number;
    taxes?: number;
    otherFees?: number;
    netAmount: number;         // 净交易金额
  };
  
  // 盈亏分析 - 增强
  performance: {
    costBasis?: number;        // 🆕 成本基础
    realizedPnL: number;       // 🔄 重命名：profit -> realizedPnL
    realizedPnLPercent: number; // 🔄 重命名：profitPercent -> realizedPnLPercent
    
    // 🆕 未实现盈亏（对于持仓）
    unrealizedPnL?: number;
    unrealizedPnLPercent?: number;
  };
  
  // 🆕 交易元数据
  metadata: {
    orderId?: string;          // 订单ID
    executionVenue?: string;   // 执行场所
    notes?: string;            // 交易备注
    tags?: string[];           // 标签（如：长线、短线、套利等）
  };
}

/**
 * 收益率接口保持增强版本，但优化结构
 */
export interface Returns {
  // 基础信息
  symbol: string;
  name?: string;

  // 时间周期收益率 - 分组组织
  periods: {
    // 短期
    "1D": number;
    "1W": number;
    "2W": number;
    WTD: number;              // 周初至今
    
    // 中期
    "1M": number;
    "3M": number;
    "6M": number;
    "9M": number;
    MTD: number;              // 月初至今
    QTD: number;              // 季度至今
    
    // 长期
    "1Y": number;
    "2Y": number;
    "3Y": number;
    "5Y": number;
    YTD: number;              // 年初至今
  };

  // 价格信息 - 重新组织
  pricing: {
    current: number;
    change: number;           // 绝对变动
    changePercent: number;    // 百分比变动
    
    // 🆕 价格区间
    dayRange: { low: number; high: number };
    week52Range: { low: number; high: number };
  };

  // 基准比较 - 增强
  benchmark?: {
    spy: number;              // 相对标普500
    qqq: number;              // 相对纳斯达克100
    sector: number;           // 相对行业
    
    // 🆕 更多基准
    russell2000?: number;     // 相对罗素2000
    msciWorld?: number;       // 相对MSCI世界指数
  };

  // 数据质量
  dataQuality: {
    available: boolean;
    missingPeriods: string[];
    estimatedPeriods: string[];
    reliability: DataReliability;
    confidence: number;       // 🆕 数据置信度 (0-100)
  };

  // 元数据
  lastUpdated: string;
  calculationMethod: string;  // 🆕 计算方法
}

/**
 * 优化后的技术指标接口 - 保持增强但重新组织
 */
export interface Metrics {
  // 基础信息
  symbol: string;
  name?: string;

  // 价格指标 - 简化结构
  price: {
    current: number;
    high52w: number;
    low52w: number;
    high52wPercent: number;   // 距52周高点百分比
    low52wPercent: number;    // 距52周低点百分比
    
    // 🆕 关键价位
    resistance?: number[];    // 阻力位
    support?: number[];       // 支撑位
  };

  // 波动率指标 - 保持详细
  volatility: {
    daily: number;
    weekly: number;
    monthly: number;
    annual: number;
    percentile: number;       // 历史分位数
    
    // 🆕 波动率趋势
    trend: TrendDirection;
    regime: 'low' | 'normal' | 'high' | 'extreme';
  };

  // 技术指标 - 保持详细但优化
  technicals: {
    // 动量指标
    rsi: {
      value: number;
      signal: 'overbought' | 'oversold' | 'neutral';
      period: number;
      divergence?: boolean;   // 🆕 背离信号
    };

    macd: {
      value: number;
      signal: number;
      histogram: number;
      trend: TrendDirection;
      crossover?: 'bullish' | 'bearish' | null; // 🆕 交叉信号
    };

    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      position: number;       // 0-100位置
      squeeze: boolean;       // 🆕 布林带收窄
    };

    stochastic: {
      k: number;
      d: number;
      signal: 'overbought' | 'oversold' | 'neutral';
    };
    
    // 🆕 更多技术指标
    williams: number;         // 威廉指标
    cci: number;             // 商品通道指标
    adx: number;             // 趋势强度
  };

  // 移动平均线 - 简化结构
  movingAverages: {
    values: {
      sma20: number;
      sma50: number;
      sma200: number;
      ema12: number;
      ema26: number;
    };
    
    deviations: {
      sma20: number;
      sma50: number;
      sma200: number;
    };
    
    // 技术形态
    alignment: TrendDirection;
    signals: {
      goldCross: boolean;     // 金叉
      deathCross: boolean;    // 死叉
      aboveMA200: boolean;    // 🆕 是否在200日线上方
    };
  };

  // 成交量分析 - 增强
  volume: {
    current: number;
    averages: {
      "10d": number;
      "30d": number;
      "90d": number;          // 🆕 90日平均
    };
    
    relative: number;         // 相对平均成交量倍数
    trend: TrendDirection;
    
    // 高级成交量指标
    indicators: {
      vpt: number;            // 价量趋势
      obv: number;            // 能量潮
      cmf: number;            // 🆕 资金流量指标
      vwap: number;           // 🆕 成交量加权平均价
    };
  };

  // 动量指标 - 简化
  momentum: {
    roc: number;              // 变动率
    strength: 'strong' | 'moderate' | 'weak';
    
    // 🆕 多周期动量
    periods: {
      "1W": number;
      "1M": number;
      "3M": number;
    };
  };

  // 风险指标 - 保持详细
  risk: {
    // 系统性风险
    beta: number;
    correlation: {            // 🆕 相关性分析
      spy: number;
      sector: number;
    };
    
    // 风险调整收益
    alpha: number;
    sharpe: number;
    sortino: number;
    calmar: number;           // 🆕 卡尔马比率
    
    // 下行风险
    maxDrawdown: number;
    var95: number;            // 95% VaR
    cvar95: number;           // 🆕 条件VaR
    
    // 综合风险等级
    level: RiskLevel;
  };

  // 综合评分 - 增强
  scoring: {
    technical: number;        // 0-100
    momentum: number;         // 0-100
    volatility: number;       // 0-100
    volume: number;           // 成交量评分
    overall: number;          // 0-100
    
    // 🆕 信号强度
    signalStrength: number;   // 0-100
    recommendation: TechnicalSignal;
  };

  // 元数据
  lastUpdated: string;
  calculationPeriod: number;
  dataPoints: number;         // 🆕 使用的数据点数量
}

/**
 * 优化后的用户持仓接口
 * 解决原UserStock接口字段混乱的问题
 */
export interface UserStock {
  // 基础信息
  id: string;
  symbol: string;
  addedAt: string;           // ✅ 必填，移除可选
  
  // 持仓信息 - 重新组织
  position: {
    quantity: number;
    averageCost: number;     // 🆕 平均成本
    totalCost: number;       // 🆕 总成本
    currentValue: number;    // 🆕 当前市值
    weight: number;          // 投资组合权重百分比
    
    // 🆕 持仓分析
    daysHeld: number;        // 持有天数
    lastTradeDate?: string;  // 最后交易日期
  };
  
  // 收益分析 - 重新命名和组织
  performance: {
    // 时间周期收益
    returns: {
      "1D": number;          // 🔄 重命名：dayPercent -> returns.1D
      "1W": number;          // 🔄 重命名：weekPercent -> returns.1W  
      "1M": number;          // 🔄 重命名：monthPercent -> returns.1M
      sinceInception: number; // 🔄 重命名：totalPercent -> returns.sinceInception
    };
    
    // 盈亏分析
    pnl: {
      unrealized: number;     // 🔄 重命名：totalProfit -> pnl.unrealized
      unrealizedPercent: number;
      realized: number;       // 🆕 已实现盈亏
      realizedPercent: number;// 🆕 已实现盈亏百分比
      total: number;          // 🆕 总盈亏
      totalPercent: number;   // 🆕 总盈亏百分比
    };
    
    // 🆕 风险指标
    risk: {
      beta: number;
      volatility: number;
      sharpe: number;
      maxDrawdown: number;
    };
  };
  
  // 用户设置 - 重新组织
  settings: {
    notes?: string;
    alerts: {
      targetPrice?: number;   // 🔄 重命名：alertPrice -> alerts.targetPrice
      stopLoss?: number;      // 🆕 止损价
      takeProfitPrice?: number; // 🆕 止盈价
      
      // 🆕 通知设置
      priceAlerts: boolean;
      volumeAlerts: boolean;
      newsAlerts: boolean;
    };
    
    // 🆕 标签和分类
    tags?: string[];          // 投资标签
    category?: string;        // 投资类别（如：成长股、价值股）
    strategy?: string;        // 投资策略
  };

  // 关联数据
  transactions?: Transaction[];
  stock: Stock;
  
  // 🆕 分析数据（可选，按需加载）
  returns?: Returns;
  metrics?: Metrics;
}

/**
 * 优化后的股票搜索结果接口
 */
export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  
  // 市场信息 - 重新组织
  market: {
    region: string;
    exchange: string;        // 🆕 交易所
    timezone: string;
    currency: string;
    
    // 交易时间
    schedule: {
      marketOpen: string;
      marketClose: string;
      preMarketOpen?: string;  // 🆕 盘前开始
      afterHoursClose?: string; // 🆕 盘后结束
    };
  };
  
  // 搜索相关性
  matchScore: number;
  
  // 🆕 基础市场数据
  preview?: {
    price: number;
    changePercent: number;
    volume: number;
    marketCap?: number;
  };
}

/**
 * 简化的股票报价接口（实时数据）
 * 移除与Stock接口的重复
 */
export interface StockQuote {
  symbol: string;
  timestamp: string;
  
  // 价格信息
  price: number;
  change: number;
  changePercent: number;
  
  // 成交信息
  volume: number;
  avgVolume: number;
  
  // 盘口信息 - 🆕
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  
  // 当日范围
  dayHigh: number;           // 🆕
  dayLow: number;            // 🆕
  
  // 基础指标
  marketCap: number;
  peRatio?: number;
  week52High: number;
  week52Low: number;
  
  // 市场状态
  marketStatus: MarketStatus; // 🆕
}

/**
 * 优化后的投资组合汇总接口
 * 解决命名不一致问题
 */
export interface PortfolioSummary {
  // 基础价值
  overview: {
    totalValue: number;       // 总资产价值
    totalCost: number;        // 🔄 重命名：totalInvestment -> totalCost
    cashBalance: number;      // 🔄 重命名：total_investment_cash -> cashBalance
    
    // 🆕 详细分解
    equityValue: number;      // 股票价值
    dividendIncome: number;   // 🔄 重命名：total_interest -> dividendIncome
    realizedPnL: number;      // 🆕 已实现盈亏
  };
  
  // 收益分析
  performance: {
    totalGainLoss: number;
    totalGainLossPercent: number;
    
    // 🆕 多时间周期表现
    returns: {
      "1D": number;
      "1W": number;
      "1M": number;
      "3M": number;
      YTD: number;
      sinceInception: number; // 🔄 重命名：invest_profit_percent
    };
    
    // 🆕 风险调整收益
    sharpe: number;
    sortino: number;
    maxDrawdown: number;
  };
  
  // 组合统计
  composition: {
    stockCount: number;
    
    // 🆕 多元化分析
    sectorDistribution: Record<string, number>; // 行业分布
    countryDistribution: Record<string, number>; // 国家分布
    topHoldings: string[];    // 前十大持仓
    
    // 🆕 集中度指标
    herfindahlIndex: number;  // 赫芬达尔指数
    effectiveStocks: number;  // 有效股票数量
  };
  
  // 🆕 现金流分析
  cashFlow: {
    totalDeposits: number;    // 总入金
    totalWithdrawals: number; // 总出金
    netDeposits: number;      // 净入金
    dividendsReceived: number; // 收到的股息
    
    // 月度现金流
    monthlyFlow: {
      deposits: number;
      withdrawals: number;
      dividends: number;
    };
  };
  
  // 元数据
  lastUpdated: string;
  dataAsOf: string;          // 数据截至时间
}

// // ========================= 辅助类型和工具 =========================
//
// /**
//  * API 响应包装器
//  */
// export interface ApiResponse<T> {
//   success: boolean;
//   data: T;
//   error?: string;
//   timestamp: string;
//
//   // 🆕 分页信息（如适用）
//   pagination?: {
//     page: number;
//     pageSize: number;
//     totalCount: number;
//     hasNext: boolean;
//   };
// }
//
// /**
//  * 批量操作响应
//  */
// export interface BatchResponse<T> {
//   success: boolean;
//   results: {
//     successful: T[];
//     failed: {
//       item: any;
//       error: string;
//     }[];
//   };
//   summary: {
//     total: number;
//     successful: number;
//     failed: number;
//   };
// }
//
// /**
//  * 类型工具 - 提取周期类型
//  */
// export type ReturnPeriod = keyof Returns['periods'];
// export type TimeFrame = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';
//
// /**
//  * 导出所有类型
//  */
// export type {
//   TradeType,
//   MarketStatus,
//   DataReliability,
//   TechnicalSignal,
//   TrendDirection,
//   RiskLevel
// };