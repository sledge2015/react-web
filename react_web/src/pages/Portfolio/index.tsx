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
} from 'recharts';
import dayjs from 'dayjs';
import { stockService, UserStock, StockSearchResult, PortfolioSummary, Transaction } from '../../services/stockService';
const { Title, Text } = Typography;

// 接口定义
// interface Stock {
//   id: string;
//   symbol: string;
//   companyName: string;
//   price: number;
//   change: number;
//   changePercent: number;
//   volume: number;
//   marketCap: number;
//   lastUpdated: string;
// }



// interface UserStock {
//   id: string;
//   symbol: string;
//   addedAt: string;
//   notes?: string;
//   quantity?: number;
//   alertPrice?: number;
//   currentValue?: number;
//   totalInvestment?: number;
//   weight?: number;
//   totalProfit?: number;
//   profitPercent?: number;
//   transactions?: Transaction[];
//   stock: Stock;
// }

// interface PortfolioSummary {
//   totalValue: number;
//   totalInvestment: number;
//   totalGainLoss: number;
//   totalGainLossPercent: number;
//   stockCount: number;
//   total_investment_cash: number;
//   total_interest: number;
//   total_profit: number;
//   invest_profit_percent: number;
// }

// interface StockSearchResult {
//   symbol: string;
//   name: string;
//   type: string;
// }

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

  // 获取用户股票列表
  const fetchUserStocks = useCallback(async () => {
    try {
      const response = await stockService.getUserStocks()
      if (response) {
        const stockData = response as UserStock[];
        // 如果API返回空数据，使用模拟数据
        if (!stockData || stockData.length === 0) {
          setUserStocks([
            {
              id: 'us-1',
              symbol: 'GOVX',
              addedAt: '2024-01-15T00:00:00.000Z',
              notes: 'Geovax Labs Inc',
              quantity: 1463,
              weight: 45,
              totalProfit: -1893.09,
              profitPercent: -63.10,
              transactions: [
                {
                  id: 't1',
                  type: 'buy',
                  date: '2024-10-10',
                  price: 2.61,
                  quantity: 963,
                  totalAmount: 1788.68,
                  profit: -1370.37,
                  profitPercent: -71.06
                },
                {
                  id: 't2',
                  type: 'buy',
                  date: '2025-06-18',
                  price: 1.18,
                  quantity: 500,
                  totalAmount: 211.70,
                  profit: -169.70,
                  profitPercent: -35.88
                }
              ],
              stock: {
                id: 'stock-govx',
                symbol: 'GOVX',
                companyName: 'Geovax Labs Inc',
                price: 0.76,
                change: -0.13,
                changePercent: -14.61,
                volume: 52467890,
                marketCap: 2750000000,
                lastUpdated: new Date().toISOString(),
              },
            },
            {
              id: 'us-2',
              symbol: 'GOOGL',
              addedAt: '2024-01-20T00:00:00.000Z',
              notes: 'Google母公司',
              quantity: 50,
              weight: 35,
              totalProfit: -372,
              profitPercent: -4.96,
              transactions: [
                {
                  id: 't3',
                  type: 'buy',
                  date: '2024-01-20',
                  price: 150.00,
                  quantity: 50,
                  totalAmount: 7500,
                  profit: -372,
                  profitPercent: -4.96
                }
              ],
              stock: {
                id: 'stock-googl',
                symbol: 'GOOGL',
                companyName: 'Alphabet Inc.',
                price: 142.56,
                change: -1.23,
                changePercent: -0.86,
                volume: 25789123,
                marketCap: 1800000000000,
                lastUpdated: new Date().toISOString(),
              },
            }
          ]);
        } else {
          setUserStocks(stockData);
          console.log("获取股票值不为空:",stockData)
        }
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
        // setPortfolioSummary(response as PortfolioSummary);
      }
    } catch (error) {
      console.error('获取投资组合汇总失败:', error);
      setPortfolioSummary({
        totalValue: 34142,
        totalInvestment: 31500,
        totalGainLoss: 2642,
        totalGainLossPercent: 8.39,
        stockCount: 3,
        total_investment_cash: 50000,
        total_interest: 1500,
        total_profit: 2642,
        invest_profit_percent: 8.39,
      });
    }
  }, []);

  // 搜索股票
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const response = await stockService.searchStocks(value);
      if (response) {
        // setSearchResults((response.data as StockSearchResult[]) || []);
      }
    } catch (error) {
      console.error('搜索股票失败:', error);
      const fallbackResults: StockSearchResult[] = [
        // { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity' },
        // { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Equity' },
        // { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity' },
        // { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity' },
        // { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity' },
      ];
      setSearchResults(fallbackResults.filter(stock =>
        stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
        stock.name.toLowerCase().includes(value.toLowerCase())
      ));
    } finally {
      setSearchLoading(false);
    }
  };

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
          aValue = a.stock.price;
          bValue = b.stock.price;
          break;
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case 'dailyProfit':
          aValue = a.stock.change * (a.quantity || 0);
          bValue = b.stock.change * (b.quantity || 0);
          break;
        case 'totalProfit':
          aValue = a.totalProfit || 0;
          bValue = b.totalProfit || 0;
          break;
        case 'profitPercent':
          aValue = a.profitPercent || 0;
          bValue = b.profitPercent || 0;
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
    { key: 'name', label: '名称' },
    { key: 'price', label: '价格' },
    { key: 'quantity', label: '数量' },
    { key: 'dailyProfit', label: '日收益' },
    { key: 'totalProfit', label: '总收益' },
    { key: 'profitPercent', label: '收益率' },
  ];

  // 生成热力图数据
  const generateHeatmapData = () => {
    if (!userStocks.length) return [];

    // 计算总投资价值用于相对大小
    const maxValue = Math.max(...userStocks.map(stock => stock.weight || 0));
    const minValue = Math.min(...userStocks.map(stock => stock.weight || 0));
    const valueRange = maxValue - minValue;

    return userStocks.map(stock => {
      const currentValue = stock.weight || 0;
      const profitPercent = stock.profitPercent || 0;
      const dailyChange = stock.stock.changePercent || 0;

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
        totalProfit: stock.totalProfit || 0,
        quantity: stock.quantity || 0,
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

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={4}>直观呈现您的投资信息</Title>
          <Text type="secondary">
            每个方框的大小表示投资组合中相应投资的总价值，颜色表示当天的收益。
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
              { label: '+1', color: '#ffaaa5' },
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

        {/* 热力图网格 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px',
            maxHeight: '400px',
            overflow: 'hidden'
          }}
        >
          {heatmapData.map((item) => {
            const baseSize = 120;
            const width = Math.max(baseSize * item.sizeRatio, 60);
            const height = Math.max(80 * item.sizeRatio, 50);

            return (
              <div
                key={item.symbol}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  backgroundColor: getHeatmapColor(item.colorType, item.colorIntensity),
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  fontSize: width < 100 ? '12px' : '14px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => {
                  const stock = userStocks.find(s => s.symbol === item.symbol);
                  if (stock) handleViewStock(stock);
                }}
              >
                <div style={{
                  fontWeight: 'bold',
                  fontSize: width < 100 ? '14px' : '18px',
                  color: '#000',
                  textAlign: 'center'
                }}>
                  {item.symbol}
                </div>
                <div style={{
                  fontSize: width < 100 ? '11px' : '13px',
                  color: '#333',
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  {item.dailyChange >= 0 ? '+' : ''}{item.dailyChange.toFixed(2)}%
                </div>
                {width > 100 && (
                  <div style={{
                    fontSize: '10px',
                    color: '#666',
                    textAlign: 'center',
                    marginTop: '2px'
                  }}>
                    ${item.currentValue.toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
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
      const response = await stockService.addUserStock(symbol);
      if (response) {
        message.success(`已添加 ${symbol} 到您的投资组合`);
        setSearchResults([]);
        // 将新股票添加到列表中
        // const newStock = response.data as UserStock;
        // setUserStocks(prev => [...prev, newStock]);
        // fetchPortfolioSummary();
      }
    } catch (error) {
      message.error('添加股票失败');
    }
  };

  // 买入股票
  const handleBuyStock = (stock: UserStock) => {
    setSelectedStock(stock);
    setTradeType('buy');
    tradeForm.setFieldsValue({
      symbol: stock.symbol,
      type: 'buy',
      price: stock.stock.price,
      quantity: 1,
      date: dayjs(),
    });
    setTradeModalVisible(true);
  };

  // 卖出股票
  const handleSellStock = (transaction: Transaction) => {
    // setSelectedStock(stock);
    setTradeType('sell');
    tradeForm.setFieldsValue({
      symbol: transaction.symbol,
      type: 'sell',
      price: transaction.price,
      quantity: 1,
      date: dayjs(),
      maxQuantity: transaction.quantity
    });
    setTradeModalVisible(true);
  };

  // 执行交易
  const handleExecuteTrade = async (values: any) => {
    if (!selectedStock) return;

    try {
      const tradeData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        totalAmount: values.price * values.quantity
      };
      // const response = await stockService.getTrendingStocks(20)

      // if (response) {
      //   message.success(`${tradeType === 'buy' ? '买入' : '卖出'}操作成功`);
      //   setTradeModalVisible(false);
      //   tradeForm.resetFields();
      //   fetchUserStocks();
      //   fetchPortfolioSummary();
      // }
    } catch (error) {
      message.error(`${tradeType === 'buy' ? '买入' : '卖出'}操作失败`);
    }
  };

  // 删除股票
  const handleRemoveStock = async (userStockId: string) => {
    try {
      await stockService.removeUserStock(userStockId)
      setUserStocks(prev => prev.filter(stock => stock.id !== userStockId));
      fetchPortfolioSummary();
    } catch (error) {
      message.error('删除股票失败');
    }
  };

  // 查看股票详情
  const handleViewStock = (stock: UserStock) => {
    setSelectedStock(stock);
    form.setFieldsValue({
      notes: stock.notes,
      alertPrice: stock.alertPrice,
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

  // 刷新所有数据
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchUserStocks(),
      fetchPortfolioSummary(),
    ]);
    setLoading(false);
    message.success('投资组合数据已刷新');
  }, [fetchUserStocks, fetchPortfolioSummary]);

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchUserStocks(),
          fetchPortfolioSummary(),
        ]);
      } catch (error) {
        console.error('初始化失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchUserStocks, fetchPortfolioSummary]);

  // 格式化价格
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

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
  const renderTransactionTable = (transactions: Transaction[]) => {
    const transactionColumns = [
      {
        title: '购买日期',
        dataIndex: 'date',
        key: 'date',
        width: 120,
      },
      {
        title: '购买价格',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        render: (price: number) => formatPrice(price),
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 80,
        render: (quantity: number) => (
          <Text>
            {quantity} <EditOutlined style={{ fontSize: '12px', color: '#bfbfbf', cursor: 'pointer' }} />
          </Text>
        ),
      },
      {
        title: '总收益',
        key: 'profit',
        width: 120,
        render: (_: any, record: Transaction) => (
          <span style={{ color: (record.profit || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {formatPrice(record.profit || 0)} ({(record.profitPercent || 0).toFixed(2)}%)
          </span>
        ),
      },
      {
        title: '股价',
        key: 'currentPrice',
        width: 100,
        render: () => formatPrice(selectedStock?.stock.price || 0),
      },
      {
        title: '',
        key: 'actions',
        width: 40,
           render: (_: any, record: Transaction) => {
              const menuItems: MenuProps['items'] = [
                {
                  key: 'sell',
                  label: '卖出',
                  icon: <FallOutlined />,
                  onClick: () => handleSellStock(record),
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleRemoveStock(record.id),
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
      title: '名称',
      key: 'name',
      width: 180,
      render: (_: any, record: UserStock) => (
        <Text strong style={{ fontSize: '12px' }}>{record.stock.companyName}</Text>
      ),
    },
    {
      title: '价格',
      dataIndex: ['stock', 'price'],
      key: 'price',
      width: 100,
      render: (price: number) => (
        <Text strong style={{ fontSize: '14px' }}>
          {formatPrice(price)}
        </Text>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (quantity: number) => (
        <Text>
          {(quantity || 0).toLocaleString()} <EditOutlined style={{ fontSize: '12px', color: '#bfbfbf' }} />
        </Text>
      ),
    },
    {
      title: '日收益',
      key: 'dailyProfit',
      width: 120,
      render: (_: any, record: UserStock) => {
        const dailyProfit = record.stock.change * (record.quantity || 0);
        const isPositive = dailyProfit >= 0;
        return (
          <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '▲' : '▼'} {formatPrice(Math.abs(dailyProfit))}
          </span>
        );
      },
    },
    {
      title: '总收益',
      key: 'totalProfit',
      width: 120,
      render: (_: any, record: UserStock) => (
        <span style={{ color: (record.totalProfit || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatPrice(record.totalProfit || 0)} ({(record.profitPercent || 0).toFixed(2)}%)
        </span>
      ),
    },
    {
      title: '股价',
      key: 'totalProfit',
      width: 120,
      render: (_: any, record: UserStock) => (
        <span style={{ color: (record.totalProfit || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {formatPrice(record.totalProfit || 0)} ({(record.profitPercent || 0).toFixed(2)}%)
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: UserStock) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'buy',
            label: '买入',
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
            onClick: () => handleRemoveStock(record.id),
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
    return userStocks.map(stock => ({
      symbol: stock.symbol,
      profitLossPercent: stock.profitPercent || 0,
      currentValue: stock.profitPercent || 0,
      investment: stock.profitPercent || 0,
      weight: stock.weight || 0,
    }));
  };

  // 生成饼图数据
  const generatePieData = () => {
    return userStocks.map((stock, index) => ({
      name: stock.symbol,
      value: stock.weight || 0,
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
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="原始投资金额"
                value={portfolioSummary.total_investment_cash}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="持仓投资金额"
                value={portfolioSummary.totalInvestment}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="持仓市值"
                value={portfolioSummary.totalValue}
                precision={2}
                valueStyle={{ color: '#1890ff' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="投资资金变化"
                value={portfolioSummary.invest_profit_percent}
                precision={2}
                suffix="%"
                valueStyle={{
                  color: portfolioSummary.invest_profit_percent >= 0 ? '#52c41a' : '#ff4d4f'
                }}
                prefix={
                  portfolioSummary.invest_profit_percent >= 0 ? <RiseOutlined /> : <FallOutlined />
                }
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 股票搜索 */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={5}>添加新股票</Title>
        <AutoComplete
          style={{ width: '100%', maxWidth: '400px' }}
          onSearch={handleSearch}
          onSelect={(value) => handleAddStock(value)}
          notFoundContent={searchLoading ? <Spin size="small" /> : null}
          options={searchResults.map(result => ({
            value: result.symbol,
            label: `${result.symbol} - ${result.name}`,
          }))}
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder="输入股票代码或公司名称搜索..."
            size="large"
          />
        </AutoComplete>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 股票列表 */}
        <Col xs={24} xl={16}>
          <Card
            title="我的股票"
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
                    {getSortDisplayText()} <DownOutlined />
                  </Button>
                </Dropdown>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setVisualizationVisible(true)}
                >
                  可视化
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={refreshAllData}
                >
                  刷新数据
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
                      {record.transactions && renderTransactionTable(record.transactions)}
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
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
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
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={tradeType === 'sell' ? selectedStock?.quantity || 0 : undefined}
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
                最多可卖出: {selectedStock?.quantity || 0} 股
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
                  {formatPrice(selectedStock.stock.price)}
                </Text>
              </div>
              <div>
                <Text strong>涨跌幅：</Text>
                {formatChange(selectedStock.stock.change, selectedStock.stock.changePercent)}
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