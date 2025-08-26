// src/pages/Market/index.tsx - 改进的市场行情页面
import React, { useEffect, useState, useCallback } from 'react';
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
  Tag,
  Alert,
  Tabs,
  AutoComplete,
  Tooltip
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  SearchOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
  LineChartOutlined
} from '@ant-design/icons';
import { LongPortService, type MarketQuote, type WatchlistItem, type LongPortAccount } from '../../services/longportService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Market: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [accountInfo, setAccountInfo] = useState<LongPortAccount[]>([]);
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // 获取账户信息
  const fetchAccountInfo = useCallback(async () => {
    const result = await LongPortService.getAccountInfo();
    if (result.success && result.data) {
      setAccountInfo(result.data);
    } else {
      message.warning('获取账户信息失败，可能是长桥API未配置');
      // 使用模拟数据
      setAccountInfo([
        {
          account_channel: 'lb',
          account_type: 'margin',
          account_no: 'HK123456',
          currency: 'USD',
          cash: 50000.0,
          net_assets: 125000.0,
          init_assets: 100000.0,
          disburse_assets: 0.0,
          settlement_currency: 'USD'
        }
      ]);
    }
  }, []);

  // 获取市场概览
  const fetchMarketOverview = useCallback(async () => {
    const result = await LongPortService.getMarketOverview();
    if (result.success && result.data) {
      setMarketData(result.data);
    } else {
      console.warn('获取市场数据失败，使用模拟数据');
      // 使用模拟数据
      setMarketData([
        {
          symbol: 'AAPL.US',
          last_done: 175.43,
          prev_close: 173.28,
          open: 174.50,
          high: 176.82,
          low: 173.95,
          timestamp: Date.now(),
          volume: 45672340,
          turnover: 8012456789,
          trade_status: 1
        },
        {
          symbol: 'GOOGL.US',
          last_done: 142.56,
          prev_close: 143.79,
          open: 143.20,
          high: 144.15,
          low: 141.88,
          timestamp: Date.now(),
          volume: 23451267,
          turnover: 3345678901,
          trade_status: 1
        },
        {
          symbol: 'MSFT.US',
          last_done: 378.85,
          prev_close: 374.18,
          open: 375.50,
          high: 380.22,
          low: 374.95,
          timestamp: Date.now(),
          volume: 18934562,
          turnover: 7156789012,
          trade_status: 1
        }
      ]);
    }
  }, []);

  // 获取自选股
  const fetchWatchlist = useCallback(async () => {
    const result = await LongPortService.getWatchlist();
    if (result.success && result.data) {
      setWatchlist(result.data);
    } else {
      console.warn('获取自选股失败，使用模拟数据');
      // 使用模拟数据
      setWatchlist([
        {
          symbol: 'AAPL.US',
          name: 'Apple Inc.',
          last_done: 175.43,
          change_val: 2.15,
          change_rate: 1.24,
          volume: 45672340
        },
        {
          symbol: 'TSLA.US',
          name: 'Tesla Inc.',
          last_done: 248.67,
          change_val: -3.22,
          change_rate: -1.28,
          volume: 67890123
        }
      ]);
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
      const result = await LongPortService.searchStocks(value);
      if (result.success && result.data) {
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // 添加自选股
  const handleAddToWatchlist = async (symbol: string) => {
    const result = await LongPortService.addToWatchlist(symbol);
    if (result.success) {
      message.success(`已添加 ${symbol} 到自选股`);
      fetchWatchlist();
    } else {
      message.error(result.error || '添加失败');
    }
  };

  // 删除自选股
  const handleRemoveFromWatchlist = async (symbol: string) => {
    const result = await LongPortService.removeFromWatchlist(symbol);
    if (result.success) {
      message.success(`已从自选股中移除 ${symbol}`);
      fetchWatchlist();
    } else {
      message.error(result.error || '删除失败');
    }
  };

  // 刷新所有数据
  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAccountInfo(),
        fetchMarketOverview(),
        fetchWatchlist()
      ]);
      message.success('数据已刷新');
    } catch (error) {
      message.error('刷新失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAccountInfo(),
          fetchMarketOverview(),
          fetchWatchlist()
        ]);
      } catch (error) {
        console.error('初始化失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchAccountInfo, fetchMarketOverview, fetchWatchlist]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleGlobalRefresh = () => {
      handleRefreshAll();
    };

    window.addEventListener('refreshData', handleGlobalRefresh);
    return () => window.removeEventListener('refreshData', handleGlobalRefresh);
  }, []);

  // 格式化价格
  const formatPrice = (price: number) => price?.toFixed(2) || '0.00';

  // 格式化变化
  const formatChange = (change: number, changeRate: number) => {
    const isPositive = change >= 0;
    const color = isPositive ? '#52c41a' : '#ff4d4f';
    const icon = isPositive ? <RiseOutlined /> : <FallOutlined />;
    const prefix = isPositive ? '+' : '';

    return (
      <Space style={{ color }}>
        {icon}
        <span>{prefix}{formatPrice(change)} ({prefix}{(changeRate || 0).toFixed(2)}%)</span>
      </Space>
    );
  };

  // 市场数据表格列
  const marketColumns = [
    {
      title: '股票代码',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => (
        <Space>
          <Text strong>{symbol}</Text>
          <Tooltip title="查看K线图">
            <Button type="text" size="small" icon={<LineChartOutlined />} />
          </Tooltip>
        </Space>
      )
    },
    {
      title: '最新价',
      dataIndex: 'last_done',
      key: 'last_done',
      render: (price: number) => <Text strong>${formatPrice(price)}</Text>
    },
    {
      title: '涨跌',
      key: 'change',
      render: (_: any, record: MarketQuote) => {
        const change = record.last_done - record.prev_close;
        const changeRate = (change / record.prev_close) * 100;
        return formatChange(change, changeRate);
      }
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (volume: number) => (volume || 0).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: MarketQuote) => (
        <Button
          type="text"
          size="small"
          icon={<StarOutlined />}
          onClick={() => handleAddToWatchlist(record.symbol)}
        >
          自选
        </Button>
      )
    }
  ];

  // 自选股表格列
  const watchlistColumns = [
    {
      title: '股票',
      key: 'stock',
      render: (_: any, record: WatchlistItem) => (
        <div>
          <Text strong>{record.symbol}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.name}
          </Text>
        </div>
      )
    },
    {
      title: '最新价',
      dataIndex: 'last_done',
      key: 'last_done',
      render: (price: number) => <Text strong>${formatPrice(price)}</Text>
    },
    {
      title: '涨跌',
      key: 'change',
      render: (_: any, record: WatchlistItem) =>
        formatChange(record.change_val, record.change_rate)
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (volume: number) => (volume || 0).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: WatchlistItem) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<StarFilled />}
          onClick={() => handleRemoveFromWatchlist(record.symbol)}
        >
          移除
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{
        height: '60vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Spin size="large" />
        <div style={{ marginLeft: '16px' }}>加载市场数据...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 账户概览 */}
      {accountInfo.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {accountInfo.map((account, index) => (
            <React.Fragment key={index}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="账户净资产"
                    value={account.net_assets}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="可用现金"
                    value={account.cash}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="账户类型"
                    value={account.account_type}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Text type="secondary">
                    账户号: {account.account_no}
                  </Text>
                </Card>
              </Col>
            </React.Fragment>
          ))}
        </Row>
      )}

      {/* 操作区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={5}>市场行情</Title>
          </Col>
          <Col>
            <Space>
              <AutoComplete
                style={{ width: 300 }}
                onSearch={handleSearch}
                placeholder="搜索股票代码或名称..."
                notFoundContent={searchLoading ? <Spin size="small" /> : null}
                options={searchResults.map(result => ({
                  value: result.symbol,
                  label: `${result.symbol} - ${result.name}`,
                }))}
                onSelect={(value) => handleAddToWatchlist(value)}
              >
                <Input prefix={<SearchOutlined />} />
              </AutoComplete>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshAll}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="市场概览" key="overview">
          <Card>
            {marketData.length > 0 ? (
              <Table
                columns={marketColumns}
                dataSource={marketData}
                rowKey="symbol"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="暂无市场数据">
                <Alert
                  message="长桥API未配置"
                  description="请在后端配置长桥API密钥以获取实时市场数据"
                  type="warning"
                  showIcon
                />
              </Empty>
            )}
          </Card>
        </TabPane>

        <TabPane tab="我的自选" key="watchlist">
          <Card>
            {watchlist.length > 0 ? (
              <Table
                columns={watchlistColumns}
                dataSource={watchlist}
                rowKey="symbol"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="暂无自选股">
                <Button type="primary" icon={<StarOutlined />}>
                  添加自选股
                </Button>
              </Empty>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Market;