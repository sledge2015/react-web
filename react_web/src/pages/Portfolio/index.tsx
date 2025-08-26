// src/pages/Portfolio/index.tsx - 支持交易操作的投资组合页面
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
  Tooltip,
  Modal,
  Form,
  AutoComplete,
  InputNumber,
  DatePicker,
  Tag,
  Dropdown,
  Collapse,
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
  // SellOutlined,
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
import { APIClient } from '../../hooks/useAuth';
import { SortOrder } from 'antd/es/table/interface';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// 接口定义
interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  lastUpdated: string;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  date: string;
  price: number;
  quantity: number;
  totalAmount: number;
  profit?: number;
  profitPercent?: number;
}

interface UserStock {
  id: string;
  symbol: string;
  addedAt: string;
  notes?: string;
  quantity?: number;
  alertPrice?: number;
  currentValue?: number;
  totalInvestment?: number;
  weight?: number;
  totalProfit?: number;
  profitPercent?: number;
  transactions?: Transaction[];
  stock: Stock;
}

interface PortfolioSummary {
  totalValue: number;
  totalInvestment: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  stockCount: number;
  total_investment_cash: number;
  total_interest: number;
  total_profit: number;
  invest_profit_percent: number;
}

interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
}

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

  // 获取用户股票列表
  const fetchUserStocks = useCallback(async () => {
    try {
      const response = await APIClient.get('/stocks/user');
      if (response.success) {
        setUserStocks(response.data || []);
      }
    } catch (error) {
      console.error('获取股票列表失败:', error);
      // 使用模拟数据作为后备
      setUserStocks([
        {
          id: 'us-1',
          symbol: 'GOVX',
          addedAt: '2024-01-15T00:00:00.000Z',
          notes: 'Geovax Labs Inc',
          quantity: 1463,
          currentValue: 1106.91,
          totalInvestment: 3000,
          weight: 0.45,
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
            change: -13.75,
            changePercent: -1.23,
            volume: 52467890,
            marketCap: 2750000000000,
            lastUpdated: new Date().toISOString(),
          },
        },
        {
          id: 'us-2',
          symbol: 'GOOGL',
          addedAt: '2024-01-20T00:00:00.000Z',
          notes: 'Google母公司',
          quantity: 50,
          currentValue: 7128,
          totalInvestment: 7500,
          weight: 0.35,
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
    }
  }, []);

  // 获取投资组合汇总 - 保持不变
  const fetchPortfolioSummary = useCallback(async () => {
    try {
      const response = await APIClient.get('/stocks/portfolio/summary');
      if (response.success) {
        setPortfolioSummary(response.data);
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

  // 搜索股票 - 保持不变
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const response = await APIClient.get(`/stocks/search?q=${encodeURIComponent(value)}`);
      if (response.success) {
        setSearchResults(response.data || []);
      }
    } catch (error) {
      console.error('搜索股票失败:', error);
      setSearchResults([
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Equity' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity' },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity' },
      ].filter(stock =>
        stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
        stock.name.toLowerCase().includes(value.toLowerCase())
      ));
    } finally {
      setSearchLoading(false);
    }
  };

  // 添加股票 - 保持不变
  const handleAddStock = async (symbol: string) => {
    try {
      const response = await APIClient.post('/stocks/user', { symbol });
      if (response.success) {
        setUserStocks(prev => [...prev, response.data]);
        setSearchResults([]);
        message.success(`已添加 ${symbol} 到您的投资组合`);
        fetchPortfolioSummary();
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
      date: dayjs(),
    });
    setTradeModalVisible(true);
  };

  // 卖出股票
  const handleSellStock = (stock: UserStock) => {
    setSelectedStock(stock);
    setTradeType('sell');
    tradeForm.setFieldsValue({
      symbol: stock.symbol,
      type: 'sell',
      price: stock.stock.price,
      date: dayjs(),
      maxQuantity: stock.quantity
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

      const response = await APIClient.post(`/stocks/user/${selectedStock.id}/trade`, tradeData);

      if (response.success) {
        message.success(`${tradeType === 'buy' ? '买入' : '卖出'}操作成功`);
        setTradeModalVisible(false);
        tradeForm.resetFields();
        fetchUserStocks();
        fetchPortfolioSummary();
      }
    } catch (error) {
      message.error(`${tradeType === 'buy' ? '买入' : '卖出'}操作失败`);
    }
  };

  // 删除股票 - 保持不变
  const handleRemoveStock = async (userStockId: string, symbol: string) => {
    try {
      await APIClient.delete(`/stocks/user/${userStockId}`);
      setUserStocks(prev => prev.filter(stock => stock.id !== userStockId));
      message.success(`已从投资组合中移除 ${symbol}`);
      fetchPortfolioSummary();
    } catch (error) {
      message.error('删除股票失败');
    }
  };

  // 查看股票详情 - 保持不变
  const handleViewStock = (stock: UserStock) => {
    setSelectedStock(stock);
    form.setFieldsValue({
      notes: stock.notes,
      alertPrice: stock.alertPrice,
    });
    setModalVisible(true);
  };

  // 更新股票信息 - 保持不变
  const handleUpdateStock = async (values: any) => {
    if (!selectedStock) return;
    try {
      await APIClient.put(`/stocks/user/${selectedStock.id}`, values);
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

  // 刷新所有数据 - 保持不变
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchUserStocks(),
      fetchPortfolioSummary(),
    ]);
    message.success('投资组合数据已刷新');
  }, [fetchUserStocks, fetchPortfolioSummary]);

  // 初始化数据 - 保持不变
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

  // 监听全局刷新事件 - 保持不变
  useEffect(() => {
    const handleGlobalRefresh = () => {
      refreshAllData();
    };

    window.addEventListener('refreshData', handleGlobalRefresh);
    return () => window.removeEventListener('refreshData', handleGlobalRefresh);
  }, [refreshAllData]);

  // 格式化价格
  const formatPrice = (price: number) => `${price.toFixed(2)}`;

  // 格式化变化
  const formatChange = (change: number, changePercent: number) => {
    const isPositive = change >= 0;
    const sign = isPositive ? '▲' : '▼';
    const color = isPositive ? '#52c41a' : '#ff4d4f';
    return (
      <span style={{ color }}>
        {sign} {change.toFixed(2)} ({changePercent.toFixed(2)}%)
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
            {formatPrice(record.profit || 0)} ▼ {(record.profitPercent || 0).toFixed(2)}%
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
        render: () => (
          <Button type="text" size="small" icon={<MoreOutlined />} />
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

  // 股票表格列 - 修改为支持展开的格式
  const stockColumns = [
    {
      title: '代号',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 100,
      render: (symbol: string, record: UserStock) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue" style={{ fontSize: '12px', fontWeight: 'bold' }}>
            {symbol}
          </Tag>
        </Space>
      ),
    },
    {
      title: '名称',
      key: 'name',
      width: 200,
      render: (_: any, record: UserStock) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '14px' }}>{record.stock.companyName}</Text>
        </Space>
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
          <Space direction="vertical" size={0}>
            <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
              {isPositive ? '▲' : '▼'} {Math.abs(dailyProfit).toFixed(2)}
            </span>
          </Space>
        );
      },
    },
    {
      title: '股价',
      dataIndex: ['stock', 'price'],
      key: 'stockPrice',
      width: 100,
      render: (price: number) => formatPrice(price),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: UserStock) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'buy',
                label: '买入',
                icon: <ShoppingCartOutlined />,
                onClick: () => handleBuyStock(record),
              },
              {
                key: 'sell',
                label: '卖出',
                icon: <FallOutlined />,
                onClick: () => handleSellStock(record),
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
                onClick: () => handleRemoveStock(record.id, record.symbol),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // 生成投资组合数据 - 保持不变
  const generatePortfolioData = () => {
    let totalValue = 0;
    let totalCost = 0;

    const stockContributions = userStocks.map(stock => {
      const currentValue = stock.currentValue || 0;
      const investment = stock.totalInvestment || 0;
      const profitLoss = currentValue - investment;
      const weight = stock.weight || 0;

      totalValue += currentValue;
      totalCost += investment;

      return {
        symbol: stock.symbol,
        profitLoss: profitLoss,
        profitLossPercent: investment > 0 ? (profitLoss / investment * 100) : 0,
        weight: weight,
        contribution: profitLoss * weight / 100,
        currentValue: currentValue,
        investment: investment
      };
    });

    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost * 100) : 0;

    return {
      stocks: stockContributions,
      total: {
        profitLoss: totalProfitLoss,
        profitLossPercent: totalProfitLossPercent,
        totalValue,
        totalCost
      }
    };
  };

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
      }}>
        <Spin size="large" />
        <div style={{ marginLeft: '16px' }}>加载投资组合数据...</div>
      </div>
    );
  }

  return (
    <>
      {/* 投资组合汇总 - 保持不变 */}
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

      {/* 股票搜索 - 保持不变 */}
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
                <Button type="text" size="small">
                  按名称排序 <DownOutlined />
                </Button>
                <Button type="text" size="small">
                  可视化
                </Button>
                <Button type="primary" size="small" icon={<PlusOutlined />}>
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
                <Button type="primary" icon={<PlusOutlined />}>
                  添加第一只股票
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* 图表区域 - 保持不变 */}
        <Col xs={24} xl={8}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card title="收益率与收益贡献对比" size="small">
              {userStocks.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={generatePortfolioData().stocks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis yAxisId="left" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="profitLossPercent" fill="#1890ff" name="收益率(%)" />
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
            <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
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

      {/* 股票详情模态框 - 保持不变 */}
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
            <Space direction="vertical" style={{ width: '100%' }}>
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

            <Form.Item name="notes" label="备注" style={{ marginTop: 16 }}>
              <Input.TextArea rows={3} placeholder="添加您的投资备注..." />
            </Form.Item>

            <Form.Item name="alertPrice" label="价格提醒">
              <Input type="number" placeholder="设置价格提醒..." prefix="$" />
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
    </>
  );
};

export default PortfolioPage;
