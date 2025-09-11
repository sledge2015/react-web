// src/pages/Portfolio/index.tsx - 修复后的投资组合页面
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Input,
  message,
  Spin,
  Empty,
  Modal,
  Form,
  AutoComplete,
  InputNumber,
  DatePicker,
  Tag,
  Dropdown,
  Radio,          // 新增
  Tooltip,        // 新增
  MenuProps,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  DownOutlined,
  MoreOutlined,
  SwapOutlined,
  LineChartOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Treemap,
  RadarChart,        // 雷达图容器
  PolarGrid,         // 极坐标网格
  PolarAngleAxis,    // 角度轴（显示维度名称）
  PolarRadiusAxis,   // 径向轴（显示数值）
  Radar,             // 雷达区域
  LineChart,    // 新增
  Line,         // 新增
  ReferenceLine, // 新增
  AreaChart,     // 新增
  Area,          // 新增
  Brush     // 新增
} from 'recharts';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { stockService } from '../../services/portfolioService';
import { UserStock,PortfolioSummary,StockSearchResult,Stock,Transaction } from '../../types/stock'
const { Title, Text } = Typography;

// 颜色配置
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface PortfolioPageProps {
  onRefresh?: () => void;
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [userStocks, setUserStocks] = useState<UserStock[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<UserStock | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  const [form] = Form.useForm();
  const [tradeForm] = Form.useForm();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [visualizationVisible, setVisualizationVisible] = useState(false);

  const { RangePicker } = DatePicker;  // 新增
  const [searchValue, setSearchValue] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false); //添加搜索弹窗状态（在现有状态定义处添加）
  const [comparisonData, setComparisonData] = useState<any[]>([]); //对比分析图
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [customDateRange, setCustomDateRange] = useState<any>(null);

  // 获取用户股票列表
  const fetchUserStocks = useCallback(async () => {
    try {
      const response = await stockService.getUserStocks()
      if (response) {
        const stockData = response as UserStock[];
        setUserStocks(stockData);
        console.log("获取股票值不为空:",stockData)
      }
    } catch (error) {
      console.error('获取股票列表失败:', error);
      message.error('获取股票列表失败，使用模拟数据');
      // 使用模拟数据作为后备
      setUserStocks([]);
    }
  }, []);

  // 获取投资组合汇总
  const fetchPortfolioSummary = useCallback(async () => {
    try {
      const response = await stockService.getPortfolioSummary()
      if (response) {
        setPortfolioSummary(response as PortfolioSummary);
      }
    } catch (error) {
      console.error('获取投资组合汇总失败:', error);
    }
  }, []);

  // 创建防抖搜索函数
  const debouncedSearch = useCallback(
    debounce(async (value: string) => {
      console.log('debouncedSearch 进入抖动搜索函数:', value);
      if (!value.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        console.log('debouncedSearch 开始调用后端接口:', value);
        const response = await stockService.searchStocks(value);
        console.log('debouncedSearch 结束调用后端接口:', response);

        if (response && Array.isArray(response)) {
          setSearchResults(response);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('搜索股票失败:', error);

        // 设置备用数据
        const fallbackResults = [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            type: 'Equity',
            market: { exchange: 'NASDAQ', currency: 'USD' },
            matchScore: 1.0
          },
          // ... 其他备用数据
        ] as StockSearchResult[];

        const filteredResults = fallbackResults.filter(stock =>
          stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
          stock.name.toLowerCase().includes(value.toLowerCase())
        );

        setSearchResults(filteredResults);

        if (filteredResults.length === 0) {
          message.warning('搜索服务暂时不可用，请稍后重试');
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  // 搜索股票
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    // 只使用防抖搜索，移除重复的直接搜索
    debouncedSearch(value);
  }, [debouncedSearch]);

  // 排序功能
  const handleSort = (field: string) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);

    const sortedStocks = [...userStocks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'name':
          aValue = a.stock.companyName;
          bValue = b.stock.companyName;
          break;
        case 'price':
          aValue = a.position.price;
          bValue = b.position.price;
          break;
        case 'quantity':
          aValue = a.position.quantity || 0;
          bValue = b.position.quantity || 0;
          break;
        case 'dailyProfit':
          aValue = a.stock.market.change * (a.position.quantity || 0);
          bValue = b.stock.market.change * (b.position.quantity || 0);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return newOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return newOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setUserStocks(sortedStocks);
  };

  // 获取可排序的列名
  const getSortableColumns = () => [
    { key: 'symbol', label: '代号' },
    { key: 'price', label: '价格' },
    { key: 'quantity', label: '数量' },
    { key: 'dailyProfit', label: '日收益' },
  ];

  // 生成热力图数据
  const generateHeatmapData = () => {
    const validStocks = userStocks.filter(stock =>
        stock?.position && stock?.performance && stock?.stock
    );

    if (!userStocks.length) return [];

    // 计算总投资价值用于相对大小
    const maxValue = Math.max(...userStocks.map(stock => stock.position.currentValue|| 0));
    const minValue = Math.min(...userStocks.map(stock => stock.position.currentValue || 0));
    const valueRange = maxValue - minValue;

    return userStocks.map(stock => {
      const currentValue = stock.position.currentValue || 0;
      const profitPercent = stock.performance.pnl.totalPercent|| 0;
      const dailyChange = stock.performance.returns["1D"] || 0;

      // 计算相对大小 (20% - 100%)
      const sizeRatio = valueRange > 0
        ? 0.2 + 0.8 * ((currentValue - minValue) / valueRange)
        : 0.6;

      // 根据收益率确定颜色
      let colorIntensity: 'light' | 'medium' | 'dark';
      let colorType: 'profit' | 'loss' | 'neutral';

      if (Math.abs(dailyChange) >= 3) {
        colorIntensity = 'dark';
      } else if (Math.abs(dailyChange) >= 1) {
        colorIntensity = 'medium';
      } else {
        colorIntensity = 'light';
      }

      if (dailyChange > 0) {
        colorType = 'profit';
      } else if (dailyChange < 0) {
        colorType = 'loss';
      } else {
        colorType = 'neutral';
      }

      return {
        symbol: stock.symbol,
        currentValue,
        profitPercent,
        dailyChange,
        sizeRatio,
        colorIntensity,
        colorType,
        totalProfit: stock.performance.pnl.unrealized || 0,
        quantity: stock.position.quantity || 0,
        companyName: stock.stock.companyName,
      };
    });
  };

  // 获取热力图颜色
  const getHeatmapColor = (colorType: 'profit' | 'loss' | 'neutral', intensity: 'light' | 'medium' | 'dark') => {
    const colors = {
      profit: {
        light: '#b7eb8f',
        medium: '#73d13d',
        dark: '#389e0d',
      },
      loss: {
        light: '#ffaaa5',
        medium: '#ff7875',
        dark: '#ff4d4f',
      },
      neutral: {
        light: '#d9d9d9',
        medium: '#bfbfbf',
        dark: '#8c8c8c',
      }
    };
    return colors[colorType][intensity];
  };

  // 热力图组件
  const HeatmapVisualization = () => {
    const heatmapData = generateHeatmapData();

    if (heatmapData.length === 0) {
      return <Empty description="暂无投资数据" />;
    }

    // 权重归一化处理
    const normalizeWeights = (data: any[]) => {
      // 计算总权重
      const totalWeight = data.reduce((sum, item) => sum + Math.max(0.01, item.sizeRatio), 0);

      // 归一化处理，确保所有权重加起来等于100
      return data.map(item => {
        const normalizedWeight = (Math.max(0.01, item.sizeRatio) / totalWeight) * 100;
        console.log("股票:",item.symbol)
        console.log("归一化后权重:",normalizedWeight)

        return {
          ...item,
          // Treemap需要的数据字段
          name: item.symbol,
          size: normalizedWeight, // 归一化后的权重
          value: item.currentValue, // 实际投资金额
          change: item.dailyChange,
          changePercent: item.dailyChange,
          weight: normalizedWeight,
          // 用于颜色映射
          fill: getHeatmapColor(item.colorType, item.colorIntensity)
        };
      });
    };

    const treemapData = normalizeWeights(heatmapData);
    console.log("treemapData值:",treemapData)

    // 自定义Treemap单元格内容
    const CustomizedContent = (props: any) => {
      const { root, depth, x, y, width, height} = props;
      const symbol = props.symbol;
      const fill = props.fill;
      const change = props.change;
      const currentValue = props.currentValue;
      const weight = props.weight;

      // 安全检查：确保payload存在
      if (!symbol) {
          console.log('symbol为空，跳过渲染');
          return null;
      }

      // 计算字体大小基于区域大小
      const area = width * height;
      const fontSize = area > 8000 ? 16 : area > 4000 ? 14 : area > 2000 ? 12 : 10;
      const showDetails = area > 3000; // 只在足够大的区域显示详细信息

      return (
        <g>
          {/* 矩形背景 */}
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            style={{
              fill: props.fill || '#d9d9d9',
              stroke: 'rgba(255,255,255,0.6)',
              strokeWidth: 2,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.stroke = '#1890ff';
              e.currentTarget.style.strokeWidth = '3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.stroke = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.strokeWidth = '2';
            }}
            onClick={() => {
              const stock = userStocks.find(s => s.symbol === (props.symbol || props.name));
              if (stock) handleViewStock(stock);
            }}
          />

          {/* 股票代码 */}
          <text
            x={x + width / 2}
            y={y + (showDetails ? height / 2 - 15 : height / 2 - 5)}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight="bold"
            dominantBaseline="middle"
          >
            {props.symbol || props.name || 'N/A'}
          </text>

          {/* 收益百分比 */}
          <text
            x={x + width / 2}
            y={y + (showDetails ? height / 2 : height / 2 + 8)}
            textAnchor="middle"
            fill={props.change >= 0 ? "#ffffff" : "#ffffff"}
            fontSize={Math.max(fontSize - 2, 9)}
            fontWeight="600"
            dominantBaseline="middle"
          >
            {props.change !== undefined ?
              `${props.change >= 0 ? '+' : ''}${props.change.toFixed(2)}%` :
              'N/A'
            }
          </text>

          {/* 详细信息（仅在大区域显示） */}
          {showDetails && props.currentValue !== undefined && (
            <>
              <text
                x={x + width / 2}
                y={y + height / 2 + 12}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={Math.max(fontSize - 4, 8)}
                dominantBaseline="middle"
              >
                ${props.currentValue.toFixed(0)}
              </text>
              <text
                x={x + width / 2}
                y={y + height / 2 + 24}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={Math.max(fontSize - 5, 7)}
                dominantBaseline="middle"
              >
                权重 {props.weight ? props.weight.toFixed(1) : '0'}%
              </text>
            </>
          )}

          {/* 权重等级指示器 */}
          {props.weight > 15 && (
            <circle
              cx={x + width - 8}
              cy={y + 8}
              r="3"
              fill="#1890ff"
              stroke="white"
              strokeWidth="1"
            />
          )}
        </g>
      );
    };

    // 自定义Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '12px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {data.symbol} - {data.companyName || data.symbol}
            </div>
            <div style={{ color: data.change >= 0 ? '#52c41a' : '#ff4d4f' }}>
              日收益: {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
            </div>
            <div>投资金额: ${data.currentValue.toFixed(2)}</div>
            <div>投资权重: {data.weight.toFixed(2)}%</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              点击查看详情
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={4}>直观呈现您的投资信息</Title>
          <Text type="secondary">
            每个方框的大小表示投资组合中相应投资的总价值，颜色表示当天的收益。使用树状图算法完美分割固定矩形。
          </Text>
        </div>

        {/* 颜色图例 */}
        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <Text strong style={{ marginRight: '10px' }}>日变化百分比</Text>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {[
              { label: '≤ -3', color: '#ff4d4f' },
              { label: '-2', color: '#ff7875' },
              { label: '-1', color: '#ffaaa5' },
              { label: '0', color: '#d9d9d9' },
              { label: '+1', color: '#b7eb8f' },
              { label: '+2', color: '#73d13d' },
              { label: '≥ 3', color: '#389e0d' },
            ].map((item, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '20px',
                    height: '12px',
                    backgroundColor: item.color,
                    marginBottom: '2px'
                  }}
                />
                <Text style={{ fontSize: '10px' }}>{item.label}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* 权重分布统计 */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              大权重 (&gt;15%): {treemapData.filter(d => d.weight > 15).length} 只
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              中权重 (5-15%): {treemapData.filter(d => d.weight > 5 && d.weight <= 15).length} 只
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              小权重 (&lt;5%): {treemapData.filter(d => d.weight <= 5).length} 只
            </Text>
          </Space>
        </div>

        {/* Treemap热力图 */}
        <div style={{
          width: '100%',
          height: '400px',
          backgroundColor: '#f8f9fa',
          padding: '8px',
          borderRadius: '8px',
          border: '2px solid #e5e7eb'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4/3}
              stroke="#fff"           // 改为纯白色
              content={<CustomizedContent />}
            >
              <RechartsTooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* 布局统计信息 */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          color: '#666',
          fontSize: '12px'
        }}>
          <Text type="secondary">
            树状图布局：{treemapData.length} 只股票 |
            权重归一化完成 |
            最大权重：{Math.max(...treemapData.map(d => d.weight)).toFixed(1)}% |
            最小权重：{Math.min(...treemapData.map(d => d.weight)).toFixed(1)}%
          </Text>
        </div>

        {/* 操作提示 */}
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          color: '#999',
          fontSize: '11px'
        }}>
          <Text type="secondary">
            悬停查看详情 • 点击进入股票详情页面 • 蓝色圆点表示高权重股票
          </Text>
        </div>
      </div>
    );
  };

  //显示排序
  const getSortDisplayText = () => {
    const currentColumn = getSortableColumns().find(col => col.key === sortField);
    const orderText = sortOrder === 'asc' ? '升序' : '降序';
    return `按${currentColumn?.label || '代号'}排序 (${orderText})`;
  };

  //添加股票
  const handleAddStock = async (symbol: string) => {
    try {
      setLoading(true);
      const response = await stockService.addUserStock(symbol);

      if (response) {
        message.success(`已添加 ${symbol} 到您的投资组合`);
        setSearchResults([]); // 清空搜索结果
        setSearchValue('');   // 清空搜索框
        setSearchModalVisible(false); // 关闭搜索弹窗

        // 将新股票添加到列表中
        setUserStocks(prev => [...prev, response]);

        // 刷新投资组合汇总数据
        try {
          await fetchPortfolioSummary();
        } catch (summaryError) {
          console.warn('刷新投资组合汇总失败:', summaryError);
        }
      } else {
        throw new Error('添加股票返回数据为空');
      }
    } catch (error: any) {
      console.error('添加股票失败:', error);

      if (error.message?.includes('已存在')) {
        message.warning(`${symbol} 已在您的投资组合中`);
      } else if (error.message?.includes('not found')) {
        message.error(`找不到股票代码 ${symbol}`);
      } else {
        message.error(`添加股票失败: ${error.message || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
    };

  // 买入股票
  const handleBuyStock = (stock: UserStock) => {
    setSelectedStock(stock);
    setTradeType('buy');
    tradeForm.setFieldsValue({
      symbol: stock.symbol,
      type: 'buy',
      price: stock.position.price,
      quantity: 1,
      date: dayjs(),
    });
    setTradeModalVisible(true);
  };

  // 卖出股票
  const handleSellStock = (stock: UserStock, transaction?: Transaction) => {
    setSelectedStock(stock);
    setTradeType('sell');

    const maxQuantity = transaction ? transaction.execution.quantity:0;
    const currentPrice = stock.position.price;

    const selectedTradeId = transaction ? parseInt(transaction.id) : undefined;

    console.log('设置表单值:', {
      symbol: stock.symbol,
      trade_id: selectedTradeId,
      type: 'sell',
      price: currentPrice,
      quantity: transaction?.execution.quantity,
      maxQuantity: maxQuantity,
      });

    tradeForm.setFieldsValue({
      symbol: stock.symbol,
      trade_id:selectedTradeId,
      type: 'sell',
      price: currentPrice,
      quantity: transaction?.execution.quantity,
      date: dayjs(),
      maxQuantity: maxQuantity,
    });

    setTradeModalVisible(true);
  };

  //执行交易
  const handleExecuteTrade = async (values: any) => {
    console.log('trade_id值:', values.trade_id);
    if (!selectedStock) return;

    try {
      setLoading(true);

      // 安全处理日期格式化
      let formattedDate: string;
      if (values.date) {
        // 确保 values.date 是 dayjs 对象
        if (typeof values.date.format === 'function') {
          formattedDate = values.date.format('YYYY-MM-DD');
        } else {
          // 如果不是 dayjs 对象，尝试转换
          formattedDate = dayjs(values.date).format('YYYY-MM-DD');
        }
      } else {
        // 如果没有日期，使用当天
        formattedDate = dayjs().format('YYYY-MM-DD');
      }

      console.log('格式化后的日期:', formattedDate);

      const tradeData = {
        symbol: selectedStock.symbol,
        type: tradeType,
        price: values.price,
        quantity: values.quantity,
        date: formattedDate,
        total_amount: values.price * values.quantity,
        trade_id: values.trade_id, //
      };

      // 调用交易API
      let response;
      if (tradeType === 'buy') {
        console.log('执行交易买入:', tradeData);
        response = await stockService.buyStock(selectedStock.id, {
          symbol: tradeData.symbol,
          price: tradeData.price,
          quantity: tradeData.quantity,
          date: tradeData.date,
          total_amount: tradeData.total_amount,
        });
      } else {
        response = await stockService.sellStock(selectedStock.id, {
          trade_id: tradeData.trade_id,
          stock_symbol: selectedStock.symbol,
          price: tradeData.price,
          quantity: tradeData.quantity,
          date: tradeData.date,
          total_amount: tradeData.total_amount,
        });
      }

      if (response) {
        message.success(`${tradeType === 'buy' ? '买入' : '卖出'}操作成功`);
        setTradeModalVisible(false);
        tradeForm.resetFields();
        setSelectedStock(null);

        // 刷新数据
        await Promise.all([
          fetchUserStocks(),
          //fetchPortfolioSummary(),
        ]);
      } else {
        throw new Error('交易失败');
      }

    } catch (error: any) {
      console.error('交易执行失败:', error);
      message.error(error.message || `${tradeType === 'buy' ? '买入' : '卖出'}操作失败`);
    } finally {
      setLoading(false);
    }
  };

  // 删除股票
  const handleDeleteTransaction = async (stock_id: string, stockSymbol?: string) => {
    try {
      await stockService.deleteTransaction(stock_id);
      message.success(`已从持仓列表中移除 ${stockSymbol} 的股票`);

      // 刷新数据
      await Promise.all([
        fetchUserStocks(),
        fetchPortfolioSummary(), // 建议也刷新汇总数据
      ]);

    } catch (error: any) {
      console.error('删除交易记录失败:', error);

      const errorMessage = error?.response?.data?.detail ||
                          error?.message ||
                          '删除交易记录失败';
      message.error(errorMessage);
    }
  };

  // 查看股票详情
  const handleViewStock = (stock: UserStock) => {
    setSelectedStock(stock);
    form.setFieldsValue({
      notes: stock.settings.notes,
      alertPrice: stock.settings.alerts.priceAlerts,
    });
    setModalVisible(true);
  };

  // 更新股票信息
  const handleUpdateStock = async (values: any) => {
    if (!selectedStock) return;
    try {
      // await APIClient.put(`/stocks/user/${selectedStock.id}`, values);
      setUserStocks(prev =>
        prev.map(stock =>
          stock.id === selectedStock.id
            ? { ...stock, ...values }
            : stock
        )
      );
      setModalVisible(false);
      message.success('股票信息已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 时间段配置移到主组件
  const TIME_PERIODS = [
    { key: '7D', label: '7天', days: 7 },
    { key: '1M', label: '1个月', days: 30 },
    { key: '3M', label: '3个月', days: 90 },
    { key: '6M', label: '6个月', days: 180 },
    { key: '1Y', label: '1年', days: 365 },
    { key: 'YTD', label: '年初至今', days: null },
    { key: 'ALL', label: '全部', days: null }
  ];

  // 提取到主组件的 fetchDataForPeriod
  const fetchDataForPeriod = useCallback(async (period?: string, customRange?: any) => {
    try {
      const targetPeriod = period || selectedPeriod;
      const targetRange = customRange || customDateRange;

      let days: number;

      if (targetPeriod === 'CUSTOM' && targetRange) {
        const startDate = dayjs(targetRange[0]);
        const endDate = dayjs(targetRange[1]);
        days = endDate.diff(startDate, 'day') + 1;
      } else if (targetPeriod === 'YTD') {
        const startOfYear = dayjs().startOf('year');
        days = dayjs().diff(startOfYear, 'day') + 1;
      } else if (targetPeriod === 'ALL') {
        days = 730;
      } else {
        const periodConfig = TIME_PERIODS.find(p => p.key === targetPeriod);
        days = periodConfig?.days || 30;
      }

      const [portfolioHistory, marketHistory] = await Promise.all([
        stockService.getPortfolioPerformanceHistory(days),
        stockService.getMarketIndicesHistory(days)
      ]);

      if (!portfolioHistory || !marketHistory) {
        throw new Error('数据获取失败');
      }

      const data = portfolioHistory.map((item: any) => {
        const marketData = marketHistory.find((m: any) => m.date === item.date) || {};

        const portfolioReturn = item.gainLossPercent || 0;
        const sp500Return = (marketData.sp500Return || 0) * 100;
        const nasdaqReturn = (marketData.nasdaqReturn || 0) * 100;

        return {
          date: new Date(item.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
          fullDate: new Date(item.date).toLocaleDateString('zh-CN'),
          portfolio: portfolioReturn.toFixed(2),
          sp500: sp500Return.toFixed(2),
          nasdaq: nasdaqReturn.toFixed(2),
          portfolioValue: (item.totalValue || 0).toFixed(2),
          timestamp: new Date(item.date).getTime()
        };
      });

      setComparisonData(data);
      return data;
    } catch (error) {
      console.error('获取对比数据失败:', error);
      return [];
    }
  }, [selectedPeriod, customDateRange]);


  // 投资组合对比图表组件
  const PortfolioComparisonChart = ({
    comparisonData,
    selectedPeriod,
    setSelectedPeriod,
    customDateRange,
    setCustomDateRange,
    onPeriodChange,
    TIME_PERIODS
  }: {
    comparisonData: any[];
    selectedPeriod: string;
    setSelectedPeriod: (period: string) => void;
    customDateRange: any;
    setCustomDateRange: (range: any) => void;
    onPeriodChange: (period: string, customRange?: any) => void;
    TIME_PERIODS: any[];
  }) => {
    const [chartLoading, setChartLoading] = useState(false);

    // 移除组件内的状态管理，使用传入的props

    if (comparisonData.length === 0) {
      return (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Empty description="暂无对比数据" />
          </div>
        </Card>
      );
    }

    const latestData = comparisonData[comparisonData.length - 1];
    const portfolioReturn = parseFloat(latestData.portfolio);
    const sp500Return = parseFloat(latestData.sp500);
    const nasdaqReturn = parseFloat(latestData.nasdaq);

    return (
      <Card style={{ marginBottom: '24px' }}
            title="投资组合收益时序图"
            extra={
              <Tooltip title="计算并可视化一个投资组合从开始到结束的累计收益">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            }
      >
        {/* 时间段选择器 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          // backgroundColor: '#fafafa',
          // borderRadius: '6px',
          // border: '1px solid #f0f0f0',
          marginBottom: '16px'
        }}>
          <div>
            <Text strong style={{ marginRight: '16px' }}>时间范围:</Text>
            <Radio.Group
              value={selectedPeriod}
              onChange={(e) => {
                const period = e.target.value;
                setSelectedPeriod(period);
                if (period !== 'CUSTOM') {
                  onPeriodChange(period);
                }
              }}
              size="small"
            >
              {TIME_PERIODS.map(period => (
                <Radio.Button key={period.key} value={period.key}>
                  {period.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text type="secondary">自定义:</Text>
            <RangePicker
              size="small"
              value={customDateRange}
              onChange={(dates) => {
                setCustomDateRange(dates);
                if (dates && dates[0] && dates[1]) {
                  setSelectedPeriod('CUSTOM');
                  onPeriodChange('CUSTOM', dates);
                }
              }}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1890ff" stopOpacity={0.1}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="1 1" stroke="#f0f0f0" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#666' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#666' }}
              tickFormatter={(value) => `${value}%`}
            />

            <RechartsTooltip content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      {payload[0]?.payload?.fullDate}
                    </div>
                    {payload.map((entry: any, index: number) => (
                      <div key={index} style={{
                        color: entry.color,
                        marginBottom: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}>
                        <span>{entry.name}:</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {entry.value > 0 ? '+' : ''}{entry.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }} />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />

            {/* 投资组合收益 - 曲面图 */}
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="#1890ff"
              strokeWidth={3}
              fill="url(#portfolioGradient)"
              name="投资组合"
              dot={false}
              activeDot={{ r: 6, stroke: '#1890ff', strokeWidth: 2 }}
            />

            {/* 标普500 - 曲线图 */}
            <Line
              type="monotone"
              dataKey="sp500"
              stroke="#52c41a"
              strokeWidth={2}
              name="标普500"
              dot={false}
            />

            {/* 纳斯达克 - 曲线图 */}
            <Line
              type="monotone"
              dataKey="nasdaq"
              stroke="#faad14"
              strokeWidth={2}
              name="纳斯达克"
              dot={false}
            />

            <ReferenceLine y={0} stroke="#d9d9d9" />

            {/* 长时间段数据添加刷选器 */}
            {comparisonData.length > 90 && (
              <Brush dataKey="date" height={30} stroke="#1890ff" />
            )}
          </AreaChart>
        </ResponsiveContainer>

         {/*/!*在图表下方添加*!/*/}
         {/* <div style={{*/}
         {/*   marginTop: '20px',*/}
         {/*   padding: '20px',*/}
         {/*   backgroundColor: '#fafafa',*/}
         {/*   borderRadius: '8px',*/}
         {/*   border: '1px solid #f0f0f0'*/}
         {/* }}>*/}
         {/*   <div style={{*/}
         {/*     marginBottom: '16px',*/}
         {/*     display: 'flex',*/}
         {/*     alignItems: 'center',*/}
         {/*     justifyContent: 'space-between'*/}
         {/*   }}>*/}
         {/*     <Text strong style={{ fontSize: '14px', color: '#262626' }}>*/}
         {/*       相对表现分析*/}
         {/*     </Text>*/}
         {/*     <Text type="secondary" style={{ fontSize: '12px' }}>*/}
         {/*       基于当前周期收益率*/}
         {/*     </Text>*/}
         {/*   </div>*/}

         {/*   <Row gutter={[20, 16]}>*/}
         {/*     <Col span={12}>*/}
         {/*       <div style={{*/}
         {/*         padding: '16px 20px',*/}
         {/*         backgroundColor: 'white',*/}
         {/*         borderRadius: '6px',*/}
         {/*         border: '1px solid #e8e8e8',*/}
         {/*         boxShadow: '0 2px 4px rgba(0,0,0,0.02)'*/}
         {/*       }}>*/}
         {/*         <div style={{*/}
         {/*           display: 'flex',*/}
         {/*           justifyContent: 'space-between',*/}
         {/*           alignItems: 'center'*/}
         {/*         }}>*/}
         {/*           <div>*/}
         {/*             <Text style={{ fontSize: '13px', color: '#8c8c8c' }}>vs 标普500</Text>*/}
         {/*             <div style={{ fontSize: '10px', color: '#bfbfbf', marginTop: '2px' }}>*/}
         {/*               相对收益率*/}
         {/*             </div>*/}
         {/*           </div>*/}
         {/*           <div style={{ textAlign: 'right' }}>*/}
         {/*             <div style={{*/}
         {/*               fontSize: '20px',*/}
         {/*               fontWeight: 'bold',*/}
         {/*               fontFamily: 'monospace',*/}
         {/*               color: portfolioReturn - sp500Return >= 0 ? '#52c41a' : '#ff4d4f'*/}
         {/*             }}>*/}
         {/*               {portfolioReturn - sp500Return >= 0 ? '+' : ''}*/}
         {/*               {(portfolioReturn - sp500Return).toFixed(2)}%*/}
         {/*             </div>*/}
         {/*             <div style={{*/}
         {/*               fontSize: '10px',*/}
         {/*               color: portfolioReturn - sp500Return >= 0 ? '#52c41a' : '#ff4d4f',*/}
         {/*               fontWeight: '500'*/}
         {/*             }}>*/}
         {/*               {portfolioReturn - sp500Return >= 0 ? '跑赢指数' : '跑输指数'}*/}
         {/*             </div>*/}
         {/*           </div>*/}
         {/*         </div>*/}
         {/*       </div>*/}
         {/*     </Col>*/}

         {/*     <Col span={12}>*/}
         {/*       <div style={{*/}
         {/*         padding: '16px 20px',*/}
         {/*         backgroundColor: 'white',*/}
         {/*         borderRadius: '6px',*/}
         {/*         border: '1px solid #e8e8e8',*/}
         {/*         boxShadow: '0 2px 4px rgba(0,0,0,0.02)'*/}
         {/*       }}>*/}
         {/*         <div style={{*/}
         {/*           display: 'flex',*/}
         {/*           justifyContent: 'space-between',*/}
         {/*           alignItems: 'center'*/}
         {/*         }}>*/}
         {/*           <div>*/}
         {/*             <Text style={{ fontSize: '13px', color: '#8c8c8c' }}>vs 纳斯达克</Text>*/}
         {/*             <div style={{ fontSize: '10px', color: '#bfbfbf', marginTop: '2px' }}>*/}
         {/*               相对收益率*/}
         {/*             </div>*/}
         {/*           </div>*/}
         {/*           <div style={{ textAlign: 'right' }}>*/}
         {/*             <div style={{*/}
         {/*               fontSize: '20px',*/}
         {/*               fontWeight: 'bold',*/}
         {/*               fontFamily: 'monospace',*/}
         {/*               color: portfolioReturn - nasdaqReturn >= 0 ? '#52c41a' : '#ff4d4f'*/}
         {/*             }}>*/}
         {/*               {portfolioReturn - nasdaqReturn >= 0 ? '+' : ''}*/}
         {/*               {(portfolioReturn - nasdaqReturn).toFixed(2)}%*/}
         {/*             </div>*/}
         {/*             <div style={{*/}
         {/*               fontSize: '10px',*/}
         {/*               color: portfolioReturn - nasdaqReturn >= 0 ? '#52c41a' : '#ff4d4f',*/}
         {/*               fontWeight: '500'*/}
         {/*             }}>*/}
         {/*               {portfolioReturn - nasdaqReturn >= 0 ? '跑赢指数' : '跑输指数'}*/}
         {/*             </div>*/}
         {/*           </div>*/}
         {/*         </div>*/}
         {/*       </div>*/}
         {/*     </Col>*/}
         {/*   </Row>*/}
         {/* </div>*/}
      </Card>
    );
  };

  // 刷新所有数据
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [stocks, summary, comparison] = await Promise.all([
        fetchUserStocks(),
        fetchPortfolioSummary(),
        fetchDataForPeriod(),
      ]);

      // 更新对比数据
      setComparisonData(comparison || []);

    } catch (error) {
      console.error('刷新数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUserStocks, fetchPortfolioSummary, fetchDataForPeriod]);

  // 初始化数据 - 组件挂载时执行
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('Portfolio: 初始化数据开始');
        setLoading(true);
        await refreshAllData();  // 直接调用
        console.log('Portfolio: 初始化数据完成');
      } catch (error) {
        console.error('Portfolio: 初始化失败:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);  // 空数组
  // 监听全局刷新事件 - 独立管理事件监听
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      console.log('Portfolio: 收到刷新事件', event.type, event.detail);
      if (event.detail?.activeMenu === 'portfolio') {
        console.log('Portfolio: 开始刷新数据');
        refreshAllData();
      }
    };

    window.addEventListener('refreshData', handleGlobalRefresh as EventListener);
    return () => {
      console.log('Portfolio: 移除刷新事件监听');
      window.removeEventListener('refreshData', handleGlobalRefresh as EventListener);
    };
  }, [refreshAllData]);

  // 格式化价格
  const formatPrice = (price: any): string => {
    // 确保 price 是数字类型
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      return "$0.00";  // 如果 price 不是数字，返回默认值
    }
    return `$${numericPrice.toFixed(2)}`;  // 格式化为两位小数
  };

  // 格式化变化
  const formatChange = (change: number, changePercent: number) => {
    const isPositive = change >= 0;
    const sign = isPositive ? '▲' : '▼';
    const color = isPositive ? '#52c41a' : '#ff4d4f';
    return (
      <span style={{ color }}>
        {sign} {Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
      </span>
    );
  };

  // 渲染交易历史子表格
  const renderTransactionTable = (transactions: Transaction[], parentStock: UserStock) => {
    const transactionColumns = [
      {
        title: '购买日期',
        dataIndex: 'date',
        key: 'date',
        width: 200,
        render: (_: any, record: Transaction) => (
          <span>
            {record.execution.date ? dayjs(record.execution.date).format('YYYY年MM月DD日') : '-'}
          </span>
        ),
      },
      {
        title: '购买价格',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        render: (_: any, record: Transaction) => formatPrice(record.execution.price),
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 80,
        render: (_: any, record: Transaction) => (
          <Text>
            {record.execution.quantity} <EditOutlined style={{ fontSize: '12px', color: '#bfbfbf', cursor: 'pointer' }} />
          </Text>
        ),
      },
      {
        title: '收益',
        key: 'profit',
        width: 180,
        render: (_: any, record: Transaction) => (
          <span style={{ color: (record.performance.realizedPnL || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {formatPrice(record.performance.realizedPnL || 0)} | {(record.performance.realizedPnLPercent || 0).toFixed(2)}%
          </span>
        ),
      },
      {
        title: '市值',
        key: 'totalValue',
        width: 100,
        render: (_: any, record: Transaction) => {
          return formatPrice(record.execution.totalValue || 0);
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: any, record: Transaction) => (
          <Space>
            {/* 卖出按钮 */}
            <Button
              type="primary"
              size="small"
              danger
              icon={<FallOutlined />}
              onClick={(e) => {
                e.stopPropagation(); // 防止触发行点击事件
                console.log('卖出交易 - ID:', record.id);
                handleSellStock(parentStock, record);
              }}
            >
              卖出
            </Button>

            {/* 删除按钮 */}
            {/*<Button*/}
            {/*  type="text"*/}
            {/*  size="small"*/}
            {/*  danger*/}
            {/*  icon={<DeleteOutlined />}*/}
            {/*  onClick={(e) => {*/}
            {/*    e.stopPropagation(); // 防止触发行点击事件*/}
            {/*    console.log('删除交易 - ID:', record.id);*/}
            {/*    Modal.confirm({*/}
            {/*      title: '确认删除',*/}
            {/*      content: `确定要删除 ${parentStock.symbol} 在 ${record.execution.date} 的交易记录吗？`,*/}
            {/*      okText: '删除',*/}
            {/*      okType: 'danger',*/}
            {/*      cancelText: '取消',*/}
            {/*      onOk: () => handleDeleteTransaction(record.id), // 直接使用 record.id*/}
            {/*    });*/}
            {/*  }}*/}
            {/*/>*/}
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={transactionColumns}
        dataSource={transactions}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ margin: '8px 0' }}
      />
    );
  };

  // 股票表格列
  const stockColumns = [
    {
      title: '代号',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 70,
      render: (symbol: string) => (
        <Tag color="blue" style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {symbol}
        </Tag>
      ),
    },
   {
      title: '价格',
      dataIndex: 'price',
      width: 120,
      render: (_: any, record: UserStock) => {
        const price = record?.position?.price ?? 0
        const avgPrice = record?.position?.averageCost ?? null
        const priceStr = formatPrice(Math.abs(price))
        return avgPrice
          ? `${priceStr} (${formatPrice(Math.abs(avgPrice))})`
          : priceStr
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_: any, record: UserStock) => record.position?.quantity ?? '-',
    },
    {
      title: '日收益',
      key: 'dailyProfit',
      width: 120,
      render: (_: any, record: UserStock) => {
        const dailyProfit = record.performance?.returns["1D"];
        const isPositive = dailyProfit >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '▲' : '▼'} {Math.abs(dailyProfit).toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '周收益',
      key: 'weekPercent',
      width: 120,
      render: (_: any, record: UserStock) => {
        const tmpProfit = record.performance?.returns["1W"];
        const isPositive = tmpProfit >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '▲' : '▼'} {Math.abs(tmpProfit).toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '月收益',
      key: 'monthPercent',
      width: 120,
      render: (_: any, record: UserStock) => {
        const tmpProfit = record.performance?.returns["1M"];
        const isPositive = tmpProfit >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '▲' : '▼'} {(Math.abs(tmpProfit)|| 0).toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '总收益',
      key: 'totalPercent',
      width: 120,
      render: (_: any, record: UserStock) => {
        const tmpProfit = record.performance?.returns.sinceInception;
        const isPositive = tmpProfit >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '▲' : '▼'} {Math.abs(tmpProfit).toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '总市值',
      key: 'totalProfit',
      width: 120,
      render: (_: any, record: UserStock) => (
        <span style={{ color: (record.position?.currentValue || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatPrice(record.position?.currentValue || 0)} ({(record.position?.weight * 100 || 0).toFixed(2)}%)
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 30,
      render: (_: any, record: UserStock) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'buy',
            label: '记录一次买入',
            icon: <ShoppingCartOutlined />,
            onClick: () => handleBuyStock(record),
          },
          {
            key: 'view',
            label: '查看',
            icon: <EyeOutlined />,
            onClick: () => handleViewStock(record),
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDeleteTransaction(record.id, record.symbol),
          },
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // 生成投资组合数据
  const generatePortfolioData = () => {
    return userStocks.map(stock => {
      // 检查数据结构是否存在
      if (!stock || !stock.position) {
        console.warn('股票数据结构不完整:', stock);
        return {
          symbol: stock?.symbol || 'Unknown',
          profitLossPercent: 0,
          currentValue: 0,
          investment: 0,
          weight: 0,
        };
      }

      return {
        symbol: stock.symbol,
        profitLossPercent: stock.performance?.returns?.sinceInception || 0,
        currentValue: stock.position.currentValue || 0,
        investment: stock.position.averageCost || 0,  // 注意字段名
        weight: stock.position.weight || 0,
      };
    });
  };

  // 生成饼图数据
   const generatePieData = () => {
      // 过滤掉无效数据
      const validStocks = userStocks.filter(stock =>
        stock && stock.position && typeof stock.position.weight === 'number'
      );

      return validStocks.map((stock, index) => ({
        name: stock.symbol,
        value: stock.position.weight || 0,
        color: COLORS[index % COLORS.length],
      }));
    };

  if (loading) {
    return (
      <div style={{
        height: '60vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>加载投资组合数据...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
    {/* 投资组合汇总 */}
      {portfolioSummary && (
        <Row gutter={[8, 16]} style={{ marginBottom: '24px', width: '100%' }}>
          <Col flex="1">
            <Card
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                margin: '0 4px',
                display: 'flex',
                flexDirection: 'column',
                height: '140px'
              }}
              bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
            >
              {/* 上半部分：累计收益率 */}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                  累计收益率：
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RiseOutlined style={{ fontSize: '14px', color: '#52c41a', marginRight: '4px' }} />
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                    {Number(portfolioSummary.performance.returns.sinceInception).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* 下半部分：投入资金 / 持仓市值 */}
              <div style={{
                fontSize: '12px',
                color: '#221616',
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px' // 控制与上半部分间距
              }}>
                <span>投入资金：${portfolioSummary.overview.totalCost}</span>
                <span>持仓市值：${portfolioSummary.overview.totalValue}</span>
              </div>
            </Card>
          </Col>

          <Col flex="1">
            <Card
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                margin: '0 4px',
                display: 'flex',
                flexDirection: 'column',
                height: '140px'
              }}
              bodyStyle={{ padding: 0, height: '100%' }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                年化收益率：
              </div>
              <div style={{
                textAlign: 'center',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FallOutlined style={{ fontSize: '14px', color: '#ff4d4f', marginRight: '4px' }} />
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {Number(portfolioSummary.performance.returns.annualized).toFixed(2)}%
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#221616',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>总盈亏：${portfolioSummary.performance.totalGainLoss}</span>
                <span>总盈亏百分比：{Number(portfolioSummary.performance.totalGainLossPercent).toFixed(2)}%</span>
              </div>
            </Card>
          </Col>

          <Col flex="1">
            <Card
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                margin: '0 4px',
                display: 'flex',
                flexDirection: 'column',
                height: '140px'
              }}
              bodyStyle={{ padding: 0, height: '100%' }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                夏普比率：
              </div>
              <div style={{
                textAlign: 'center',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SearchOutlined style={{ fontSize: '14px', color: '#1890ff', marginRight: '4px' }} />
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                  {portfolioSummary.performance.sharpe}
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#221616',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>索提诺：{Number(portfolioSummary.performance.sortino).toFixed(4)}</span>
                <span>Beta系数：{Number(portfolioSummary.performance.beta).toFixed(4)}</span>
              </div>
            </Card>
          </Col>

          <Col flex="1">
            <Card
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                margin: '0 4px',
                display: 'flex',
                flexDirection: 'column',
                height: '140px'
              }}
              bodyStyle={{ padding: 0, height: '100%' }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                最大回撤：
              </div>
              <div style={{
                textAlign: 'center',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FallOutlined style={{ fontSize: '14px', color: '#ff4d4f', marginRight: '4px' }} />
                <span style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: portfolioSummary.performance.drawdown.maxDrawdown >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  {portfolioSummary.performance.drawdown.maxDrawdown}%
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#221616',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>回撤持续时间：{portfolioSummary.performance.drawdown.drawdowndurationdays}</span>
                <span>
                  回撤恢复时间：
                  {portfolioSummary.performance.drawdown.recoverydate
                    ? new Date(portfolioSummary.performance.drawdown.recoverydate).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }).replace(/-/g, '/')
                    : '未恢复'
                  }
                </span>
              </div>
            </Card>
          </Col>

          <Col flex="1">
            <Card
              style={{
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                margin: '0 4px',
                display: 'flex',
                flexDirection: 'column',
                height: '140px'
              }}
              bodyStyle={{ padding: 0, height: '100%' }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                波动率：
              </div>
              <div style={{
                textAlign: 'center',
                margin: '8px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <LineChartOutlined style={{ fontSize: '14px', color: '#52c41a', marginRight: '4px' }} />
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                  {portfolioSummary.performance.volatility}%
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#221616',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>赫芬达尔指数：{Number(portfolioSummary.composition.herfindahlIndex).toFixed(2)}</span>
                <span>有效股票数量：{Number(portfolioSummary.composition.effectiveStocks).toFixed(2)} </span>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* 收益率对比图表 */}
        <Col xs={24} md={24} lg={16} xl={16}>
          <PortfolioComparisonChart
            comparisonData={comparisonData}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            customDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
            onPeriodChange={fetchDataForPeriod}
            TIME_PERIODS={TIME_PERIODS}
          />
        </Col>

        {/* 雷达图 */}
       <Col xs={24} md={24} lg={8} xl={8}>
          <Card
            title="投资风格雷达"
            style={{
              height: '95%',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            extra={
              <Tooltip title="基于历史数据分析的投资风格特征">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            }
            bodyStyle={{ padding: '20px' }}
          >
            {(() => {
              // 与饼图保持一致的颜色方案
              const RADAR_COLORS = {
                momentum: '#1890ff',    // 蓝色 (类似UNH)
                quality: '#52c41a',     // 绿色 (类似BRK-B)
                scale: '#faad14',       // 橙色 (类似AMD)
                profitability: '#f5222d', // 红色 (类似NVDA)
                growth: '#722ed1',      // 紫色 (类似ORCL)
                value: '#13c2c2'        // 青色 (类似TSLA)
              };

              const mockStyleData = {
                momentum: 75,
                value: 60,
                quality: 85,
                growth: 70,
                scale: 40,
                profitability: 90
              };

              const radarData = [
                {
                  subject: '动量',
                  value: mockStyleData.momentum,
                  color: RADAR_COLORS.momentum,
                  percentage: '75%'
                },
                {
                  subject: '质量',
                  value: mockStyleData.quality,
                  color: RADAR_COLORS.quality,
                  percentage: '85%'
                },
                {
                  subject: '规模',
                  value: mockStyleData.scale,
                  color: RADAR_COLORS.scale,
                  percentage: '40%'
                },
                {
                  subject: '红利',
                  value: mockStyleData.profitability,
                  color: RADAR_COLORS.profitability,
                  percentage: '90%'
                },
                {
                  subject: '成长',
                  value: mockStyleData.growth,
                  color: RADAR_COLORS.growth,
                  percentage: '70%'
                },
                {
                  subject: '价值',
                  value: mockStyleData.value,
                  color: RADAR_COLORS.value,
                  percentage: '60%'
                }
              ];

              return (
                <div>
                  {/* 雷达图 */}
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>

                      {/* 简洁的网格 */}
                      <PolarGrid
                        stroke="#f0f0f0"
                        strokeWidth={1}
                        gridType="polygon"
                      />

                      {/* 维度标签 - 与饼图标签风格一致 */}
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                          fontSize: 12,
                          fill: '#666',
                          fontWeight: '500'
                        }}
                      />

                      {/* 简化的径向轴 */}
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={false}  // 隐藏刻度，保持简洁
                        axisLine={false}
                      />

                      {/* 雷达区域 - 使用渐变但保持简洁 */}
                      <Radar
                        name="投资风格"
                        dataKey="value"
                        stroke="#1890ff"
                        strokeWidth={2}
                        fill="rgba(24, 144, 255, 0.1)"
                        fillOpacity={0.8}
                        dot={{
                          fill: '#1890ff',
                          strokeWidth: 2,
                          stroke: '#fff',
                          r: 4
                        }}
                      />

                      {/* 简洁的图例 */}
                      <Legend
                        verticalAlign="bottom"
                        height={30}
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: '12px',
                          color: '#666'
                        }}
                      />

                      {/* 工具提示 - 与饼图风格一致 */}
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{
                                backgroundColor: 'white',
                                padding: '8px 12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '6px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                fontSize: '12px'
                              }}>
                                <div style={{
                                  fontWeight: 'bold',
                                  color: data.color || '#1890ff'
                                }}>
                                  {data.subject} {data.percentage}
                                </div>
                                <div style={{ color: '#666', fontSize: '11px' }}>
                                  得分: {data.value}/100
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>

                  {/* 底部数据标签 - 模仿饼图的标签样式 */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '12px',
                    marginTop: '16px',
                    fontSize: '12px'
                  }}>
                    {radarData.map((item, index) => (
                      <div
                        key={item.subject}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#666'
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: item.color
                          }}
                        />
                        <span style={{ fontWeight: '500' }}>
                          {item.subject} {item.percentage}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 简洁的分析总结 */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#666'
                  }}>
                    <Text style={{ fontWeight: '500' }}>
                      最强: 红利(90%) | 最弱: 规模(40%) | 平均: 70分
                    </Text>
                  </div>
                </div>
              );
            })()}
          </Card>
        </Col>
      </Row>

      {/* 股票搜索弹窗 */}
      <Modal
        title="添加新股票"
        open={searchModalVisible}
        onCancel={() => {
          setSearchModalVisible(false);
          setSearchResults([]);
          setSearchValue('');
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">
            搜索股票代码或公司名称，选择后即可添加到您的投资组合
          </Text>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <AutoComplete
            value={searchValue}
            style={{ flex: 1 }}
            onSearch={handleSearch}
            onChange={setSearchValue}
            onSelect={(value) => {
              console.log('选择添加股票:', value);
              handleAddStock(value);
            }}
            notFoundContent={
              searchLoading ? (
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <Spin size="small" />
                  <div style={{ marginTop: '8px' }}>搜索中...</div>
                </div>
              ) : searchValue.trim() ? (
                <div style={{ textAlign: 'center', padding: '12px', color: '#999' }}>
                  未找到相关股票
                </div>
              ) : null
            }
            options={searchResults.map(result => ({
              value: result.symbol,
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <div>
                    <div>
                      <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}>
                        {result.symbol}
                      </span>
                      <Tag color="blue" style={{ fontSize: '10px', marginLeft: '8px' }}>
                        {result.type}
                      </Tag>
                    </div>
                    <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
                      {result.name}
                    </div>
                  </div>
                  <Button type="link" size="small" style={{ padding: 0 }}>
                    添加 →
                  </Button>
                </div>
              ),
            }))}
            filterOption={false}
            placeholder="输入股票代码（如 AAPL）或公司名称..."
            size="large"
            allowClear
          />

          <Button
            type="primary"
            size="large"
            onClick={() => {
              if (searchValue.trim() && /^[A-Z]{1,5}$/.test(searchValue.trim().toUpperCase())) {
                handleAddStock(searchValue.trim().toUpperCase());
              } else {
                message.warning('请输入有效的股票代码（1-5个字母）');
              }
            }}
            disabled={!searchValue.trim()}
            style={{ minWidth: '80px' }}
          >
            添加
          </Button>
        </div>

        {/* 搜索结果统计 */}
        {searchResults.length > 0 && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              找到 {searchResults.length} 个结果，点击任意选项即可添加到投资组合
            </Text>
          </div>
        )}

        {/* 热门股票推荐 */}
        {searchResults.length === 0 && !searchLoading && !searchValue.trim() && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong>热门股票推荐</Text>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'].map(symbol => (
                <Button
                  key={symbol}
                  size="small"
                  onClick={() => handleAddStock(symbol)}
                  style={{ marginBottom: '8px' }}
                >
                  {symbol}
                </Button>
              ))}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              点击快速添加，或使用上方搜索框查找其他股票
            </Text>
          </div>
        )}

        {/* 操作提示 */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：添加股票后，您可以在持仓列表中记录买入交易，系统将自动计算收益和统计数据
          </Text>
        </div>
      </Modal>
      <Row gutter={[16, 16]}>
        {/* 股票列表 */}
        <Col xs={24} xl={16}>
          <Card
              title="持仓股票"
            extra={
              <Space>
                <Dropdown
                  menu={{
                    items: getSortableColumns().map(col => ({
                      key: col.key,
                      label: (
                        <Space>
                          {col.label}
                          {sortField === col.key && (
                            <span style={{ color: '#1890ff' }}>
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Space>
                      ),
                      onClick: () => handleSort(col.key),
                    })),
                  }}
                  trigger={['click']}
                >
                  <Button type="text" size="small">
                    <SwapOutlined style={{ marginRight: 4 }} />
                    {getSortDisplayText()} <DownOutlined />
                  </Button>
                </Dropdown>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setVisualizationVisible(true)}
                >
                  <LineChartOutlined  />
                  可视化
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setSearchModalVisible(true)}
                >
                  投资
                </Button>
              </Space>
            }
          >
            {userStocks.length > 0 ? (
              <Table
                columns={stockColumns}
                dataSource={userStocks}
                rowKey="id"
                pagination={false}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '0 24px' }}>
                      {record.transactions && renderTransactionTable(record.transactions, record)}
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleBuyStock(record)}
                        style={{ marginTop: '8px' }}
                      >
                        再记录一笔购买交易
                      </Button>
                    </div>
                  ),
                  defaultExpandAllRows: false,
                }}
                scroll={{ x: 800 }}
              />
            ) : (
              <Empty description="暂无股票数据">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={refreshAllData}
                >
                  加载数据
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* 图表区域 */}
        <Col xs={24} xl={8}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card title="收益率对比" size="small">
              {userStocks.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={generatePortfolioData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="profitLossPercent" fill="#1890ff" name="收益率(%)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无持仓数据" />
              )}
            </Card>

            <Card title="持仓资金占比" size="small">
              {generatePieData().length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={generatePieData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                     label={(props: any) => {
                        const { name, percent } = props;
                        return `${name} ${((percent ?? 0) * 100).toFixed(0)}%`;
                      }}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {generatePieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无数据" />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 投资热力图模态框 */}
      <Modal
        title="投资组合可视化"
        open={visualizationVisible}
        onCancel={() => setVisualizationVisible(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        <HeatmapVisualization />
      </Modal>

      {/* 交易模态框 */}
      <Modal
        title={`${tradeType === 'buy' ? '买入' : '卖出'} ${selectedStock?.symbol}`}
        open={tradeModalVisible}
        onCancel={() => {
          setTradeModalVisible(false);
          tradeForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={tradeForm}
          layout="vertical"
          onFinish={handleExecuteTrade}
        >
          {/* 所有隐藏字段放在一起 */}
          <Form.Item name="trade_id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="price"
            label="价格"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              {
                validator: (_, value) => {
                  if (tradeType === 'sell') {
                    const maxQty = tradeForm.getFieldValue('maxQuantity');
                    if (value > maxQty) {
                      return Promise.reject(new Error(`最多只能卖出 ${maxQty} 股`));
                    }
                  }
                  if (value <= 0) {
                    return Promise.reject(new Error('数量必须大于0'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={tradeType === 'sell' ? undefined : undefined}
              precision={0}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="交易日期"
            rules={[{ required: true, message: '请选择交易日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {tradeType === 'sell' && (
            <div style={{
              marginBottom: 16,
              padding: 8,
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 4
            }}>
              <Text type="secondary">
                最多可卖出: {selectedStock?.position.quantity || 0} 股
              </Text>
            </div>
          )}

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  backgroundColor: tradeType === 'buy' ? '#52c41a' : '#ff4d4f',
                  borderColor: tradeType === 'buy' ? '#52c41a' : '#ff4d4f'
                }}
              >
                确认{tradeType === 'buy' ? '买入' : '卖出'}
              </Button>
              <Button onClick={() => setTradeModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 股票详情模态框 */}
      <Modal
        title={`股票详情 - ${selectedStock?.symbol}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedStock && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateStock}
          >
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <div>
                <Text strong>公司名称：</Text>
                <Text>{selectedStock.stock.companyName}</Text>
              </div>
              <div>
                <Text strong>当前价格：</Text>
                <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatPrice(selectedStock.position.price)}
                </Text>
              </div>
              <div>
                <Text strong>涨跌幅：</Text>
                {formatChange(selectedStock.stock.market.change, selectedStock.stock.market.changePercent)}
              </div>
            </Space>

            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={3} placeholder="添加您的投资备注..." />
            </Form.Item>

            <Form.Item name="alertPrice" label="价格提醒">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="设置价格提醒..."
                prefix="$"
                min={0.01}
                step={0.01}
                precision={2}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  保存设置
                </Button>
                <Button onClick={() => setModalVisible(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default PortfolioPage;