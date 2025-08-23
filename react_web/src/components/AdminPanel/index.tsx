// src/components/AdminPanel/index.tsx - 新风格版本
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  Input,
  Switch,
  InputNumber,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Alert,
  Tabs,
  Avatar,
  Tooltip,
  Progress,
  Spin,
  Badge,
  Divider,
  Empty,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  StockOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  SecurityScanOutlined,
  SafetyOutlined,
  FileTextOutlined,
  WarningOutlined,
  ClearOutlined,
  CloudUploadOutlined,
  SearchOutlined,
  BugOutlined,
  MonitorOutlined,
  ApiOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { useAuth, APIClient } from '../../hooks/useAuth';
import { User } from '../../types/auth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 接口定义
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalStocks: number;
  totalApiCalls: number;
  systemUptime: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  lastBackup: string;
}

interface UserActivity {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

interface AdminUser extends User {
  loginCount: number;
  lastLoginIp?: string;
}

const AdminPanel: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // 数据状态
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);

  // UI状态
  const [usersLoading, setUsersLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // 分页状态
  const [usersPagination, setUsersPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [activitiesPagination, setActivitiesPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 筛选状态
  const [userFilters, setUserFilters] = useState({ search: '' });
  const [activityFilters, setActivityFilters] = useState({
    userId: '',
    action: '',
    level: '',
    startDate: '',
    endDate: '',
  });

  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  // 获取系统统计
  const fetchStats = useCallback(async () => {
    try {
      const response = await APIClient.get('/admin/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取系统统计失败:', error);
      // 使用模拟数据作为后备
      setStats({
        totalUsers: 156,
        activeUsers: 89,
        totalStocks: 2341,
        totalApiCalls: 45678,
        systemUptime: '15天 7小时',
        memoryUsage: 68,
        cpuUsage: 45,
        diskUsage: 72,
        lastBackup: '2小时前',
      });
    }
  }, []);

  // 获取用户列表
  const fetchUsers = useCallback(async (page: number = 1, search?: string) => {
    // 1. 权限检查，没有权限就直接返回
    console.log('fetchUsers triggered', page);
    if (!hasPermission('user.read')) {
      console.log('No permission to read users');
      return;
    }

    try {
      // 2. 设置 loading 状态，通常用来显示 spinner
      setUsersLoading(true);
      console.log('Loading users...');

      // 3. 构造请求参数
      const params: any = { page, limit: usersPagination.pageSize };
      if (search || userFilters.search) {
        params.search = search || userFilters.search;
      }
      console.log('fetchUsers-》Request params:', params);  // 打印请求参数

      // 4. 调用 APIClient 封装的 GET 方法
      const response = await APIClient.get('/admin/users', params);

      console.log('fetchUsers-》API response:', response);  // 打印API响应

      // 5. 如果后端返回成功
      if (response.success) {
        // 保存用户列表
        setUsers(response.users || []);
        // 更新分页数据
        setUsersPagination(prev => ({
          ...prev,
          current: response.page || page,
          total: response.total || 0,
          perPage: response.per_page || 10 // 每页数据条数，默认 10
        }));
        console.log('fetchUsers-》 Users updated:', response.users);
      } else {
        console.error('fetchUsers-》API error: Response success is false', response);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);

      // 使用模拟数据作为后备
      const mockUsers: AdminUser[] = [
        {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@stockmanager.com',
          role: 'admin',
          avatar: '👨‍💼',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLogin: '2025-08-20T06:30:00.000Z',
          isActive: true,
          loginCount: 245,
          lastLoginIp: '192.168.1.10',
        },
        {
          id: 'user-001',
          username: 'demo',
          email: 'demo@stockmanager.com',
          role: 'user',
          avatar: '👤',
          createdAt: '2024-01-15T00:00:00.000Z',
          lastLogin: '2025-08-19T14:22:00.000Z',
          isActive: true,
          loginCount: 89,
          lastLoginIp: '192.168.1.100',
        },
        {
          id: 'user-002',
          username: 'investor',
          email: 'investor@stockmanager.com',
          role: 'user',
          avatar: '📈',
          createdAt: '2024-02-01T00:00:00.000Z',
          lastLogin: '2025-08-20T05:15:00.000Z',
          isActive: true,
          loginCount: 156,
          lastLoginIp: '192.168.1.101',
        },
      ];

      // 过滤模拟数据
      const filtered = search
        ? mockUsers.filter(user =>
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())
          )
        : mockUsers;

      console.log('Filtered users:', filtered); // 打印过滤后的用户数据
      setUsers(filtered);
      setUsersPagination(prev => ({ ...prev, total: filtered.length }));
    } finally {
      setUsersLoading(false); // 6. 请求完成，关闭 loading
      console.log('Finished loading users');
    }
  }, [hasPermission, usersPagination.pageSize, userFilters.search]);


  // 获取活动日志
  const fetchActivities = useCallback(async (page: number = 1) => {
    if (!hasPermission('system.logs')) return;

    try {
      setActivitiesLoading(true);
      const params: any = {
        page,
        limit: activitiesPagination.pageSize,
        ...activityFilters
      };

      const response = await APIClient.get('/admin/logs', params);
      if (response.success) {
        setActivities(response.data.logs || []);
        setActivitiesPagination(prev => ({
          ...prev,
          current: response.data.page || page,
          total: response.data.total || 0,
        }));
      }
    } catch (error) {
      console.error('获取活动日志失败:', error);
      // 使用模拟数据作为后备
      const mockActivities: UserActivity[] = [
        {
          id: '1',
          userId: 'user-001',
          username: 'demo',
          action: '登录系统',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          details: 'IP: 192.168.1.100',
          level: 'info',
          ipAddress: '192.168.1.100',
        },
        {
          id: '2',
          userId: 'user-002',
          username: 'investor',
          action: '添加股票',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          details: '股票代码: AAPL',
          level: 'info',
          ipAddress: '192.168.1.101',
        },
        {
          id: '3',
          userId: 'user-001',
          username: 'demo',
          action: '删除股票',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          details: '股票代码: TSLA',
          level: 'warning',
          ipAddress: '192.168.1.100',
        },
        {
          id: '4',
          userId: 'admin-001',
          username: 'admin',
          action: '系统配置更新',
          timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          details: '更新刷新间隔设置',
          level: 'info',
          ipAddress: '192.168.1.10',
        },
        {
          id: '5',
          userId: 'user-002',
          username: 'investor',
          action: '导出数据',
          timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
          details: '导出投资组合数据',
          level: 'info',
          ipAddress: '192.168.1.101',
        },
      ];
      setActivities(mockActivities);
      setActivitiesPagination(prev => ({ ...prev, total: mockActivities.length }));
    } finally {
      setActivitiesLoading(false);
    }
  }, [hasPermission, activitiesPagination.pageSize, activityFilters]);

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          console.log('开始初始化程序，记录当前堆栈信息'),
          fetchStats(),
          fetchUsers(),
          fetchActivities(),
          console.log('初始化数据结束，谢谢惠顾'),
        ]);
      } catch (error) {
        console.error('初始化管理面板失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchStats, fetchUsers, fetchActivities]);

  // 创建/更新用户
  const handleSaveUser = async (values: any) => {
     console.log('handleSaveUser triggered', values);
    try {
      if (editingUser) {
        await APIClient.put(`/admin/users/${editingUser.id}`, values);
        message.success('用户信息已更新');
      } else {
        await APIClient.post('/admin/users', values);
        message.success('用户创建成功');
      }

      setUserModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers(usersPagination.current);
    } catch (error) {
      message.error(editingUser ? '更新用户失败' : '创建用户失败');
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!hasPermission('user.delete')) {
      message.error('权限不足：您没有删除用户的权限');
      return;
    }

    try {
      await APIClient.delete(`/admin/users/${userId}`);
      message.success(`用户 "${username}" 已成功删除`);
      fetchUsers(usersPagination.current);
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  // 重置用户密码
  const handleResetPassword = async (userId: string, username: string) => {
    if (!hasPermission('user.update')) {
      message.error('权限不足：您没有重置密码的权限');
      return;
    }

    try {
      const response = await APIClient.post(`/admin/users/${userId}/reset-password`);
      const tempPassword = response.data?.temporaryPassword || `temp${Math.random().toString(36).substr(2, 8)}`;

      Modal.success({
        title: '密码重置成功',
        content: (
          <div>
            <p>用户 "{username}" 的密码已重置</p>
            <p>临时密码: <Text code copyable>{tempPassword}</Text></p>
            <p style={{ color: '#faad14' }}>请及时将临时密码告知用户，并要求其首次登录时修改密码</p>
          </div>
        ),
      });
    } catch (error) {
      message.error('重置密码失败');
    }
  };

  // 保存系统配置
  const handleSaveConfig = async (values: any) => {
    try {
      await APIClient.put('/admin/config', values);
      message.success('系统配置已保存');
    } catch (error) {
      message.error('保存配置失败');
    }
  };

  // 系统维护操作
  const handleMaintenance = async (action: 'backup' | 'cleanup' | 'restart') => {
    try {
      let result;
      switch (action) {
        case 'backup':
          result = await APIClient.post('/admin/backup');
          message.success(`系统备份完成：${result.data?.filename || 'backup.sql'}`);
          break;
        case 'cleanup':
          result = await APIClient.post('/admin/cleanup-logs');
          message.success(`日志清理完成，删除了 ${result.data?.deletedCount || 0} 条记录`);
          break;
        case 'restart':
          await APIClient.post('/admin/restart');
          message.success('系统重启指令已发送');
          break;
      }
      fetchStats();
    } catch (error) {
      const actionText = action === 'backup' ? '备份' : action === 'cleanup' ? '清理' : '重启';
      message.error(`${actionText}操作失败`);
    }
  };

  // 刷新所有数据
  const handleRefreshAll = async () => {
    await Promise.all([
      fetchStats(),
      fetchUsers(usersPagination.current),
      fetchActivities(activitiesPagination.current),
    ]);
    message.success('数据已刷新');
  };

  // 用户表格列定义
  const userColumns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_: any, record: AdminUser) => (
        <Space>
          <Avatar size="large">
            {record.avatar || record.username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{record.username}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active: boolean) => (
        <Badge
          status={is_active ? 'success' : 'default'}
          text={is_active ? '活跃' : '停用'}
        />
      ),
    },
    // {
    //   title: '登录次数',
    //   dataIndex: 'loginCount',
    //   key: 'loginCount',
    //   render: (count: number) => <Text>{count.toLocaleString()}</Text>,
    // },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString('zh-CN')}>
          <Text>{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_Login',
      key: 'last_Login',
      render: (date: string) => (
        date ? (
          <Tooltip title={new Date(date).toLocaleString('zh-CN')}>
            <Text>{dayjs(date).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">从未登录</Text>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: any, record: AdminUser) => (
        <Space size="small">
          {hasPermission('user.update') && (
            <Tooltip title="编辑用户">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  setEditingUser(record);
                  form.setFieldsValue(record);
                  setUserModalVisible(true);
                }}
              />
            </Tooltip>
          )}
          {hasPermission('user.update') && (
            <Tooltip title="重置密码">
              <Popconfirm
                title="确定要重置密码吗？"
                description="将生成新的临时密码"
                onConfirm={() => handleResetPassword(record.id, record.username)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  icon={<SecurityScanOutlined />}
                  size="small"
                />
              </Popconfirm>
            </Tooltip>
          )}
          {hasPermission('user.delete') && record.role !== 'admin' && (
            <Tooltip title="删除用户">
              <Popconfirm
                title="确定要删除用户吗？"
                description="此操作不可撤销"
                onConfirm={() => handleDeleteUser(record.id, record.username)}
                okText="删除"
                okType="danger"
                cancelText="取消"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 活动日志表格列定义
  const activityColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp: string) => (
        <Tooltip title={new Date(timestamp).toLocaleString('zh-CN')}>
          <Text>{dayjs(timestamp).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username: string) => (
        username ? <Tag color="blue">{username}</Tag> : <Text type="secondary">系统</Text>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const colors = { info: 'blue', warning: 'orange', error: 'red' };
        const icons = {
          info: <FileTextOutlined />,
          warning: <WarningOutlined />,
          error: <ExclamationCircleOutlined />,
        };
        return (
          <Tag
            color={colors[level as keyof typeof colors]}
            icon={icons[level as keyof typeof icons]}
            style={{ fontSize: '12px' }}
          >
            {level.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: { showTitle: false },
      render: (details: string) => (
        details ? (
          <Tooltip title={details}>
            <Text ellipsis style={{ maxWidth: 200 }}>{details}</Text>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 120,
      render: (ip: string) => ip ? <Text code style={{ fontSize: '12px' }}>{ip}</Text> : '-',
    },
  ];

  // 生成性能数据
  const generatePerformanceData = () => {
    if (!stats) return [];

    const hours = Array.from({ length: 24 }, (_, i) => {
      const time = `${i.toString().padStart(2, '0')}:00`;
      return {
        time,
        cpu: Math.max(0, Math.min(100, Math.floor(Math.random() * 30) + stats.cpuUsage - 15)),
        memory: Math.max(0, Math.min(100, Math.floor(Math.random() * 20) + stats.memoryUsage - 10)),
        disk: Math.max(0, Math.min(100, Math.floor(Math.random() * 10) + stats.diskUsage - 5)),
      };
    });

    return hours;
  };

  // 生成用户活动统计
  const generateUserActivityData = () => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return days.map(day => ({
      day,
      登录: Math.floor(Math.random() * 100) + 20,
      注册: Math.floor(Math.random() * 20) + 5,
      操作: Math.floor(Math.random() * 150) + 50,
    }));
  };

  // 权限检查
  if (!hasPermission('system.config')) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <Alert
          message="访问被拒绝"
          description="您没有权限访问管理员面板"
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        height: '60vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Spin size="large" />
        <div style={{ marginLeft: '16px' }}>加载管理面板数据...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        tabBarExtraContent={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshAll}
            type="primary"
            size="small"
          >
            刷新数据
          </Button>
        }
      >
        {/* 系统概览 */}
        <TabPane
          tab={<span><MonitorOutlined />系统概览</span>}
          key="overview"
        >
          {stats && (
            <>
              {/* 统计卡片 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="总用户数"
                      value={stats.totalUsers}
                      prefix={<TeamOutlined />}
                      valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="活跃用户"
                      value={stats.activeUsers}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="API调用"
                      value={stats.totalApiCalls}
                      prefix={<ApiOutlined />}
                      valueStyle={{ color: '#faad14', fontSize: '24px' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="运行时间"
                      value={stats.systemUptime}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#722ed1', fontSize: '18px' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 性能监控图表 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                  <Card title="系统性能监控（24小时）" size="small">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={generatePerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" fontSize={12} />
                        <YAxis fontSize={12} />
                        <RechartsTooltip />
                        <Area
                          type="monotone"
                          dataKey="cpu"
                          stackId="1"
                          stroke="#1890ff"
                          fill="#1890ff"
                          fillOpacity={0.6}
                          name="CPU使用率(%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="memory"
                          stackId="1"
                          stroke="#52c41a"
                          fill="#52c41a"
                          fillOpacity={0.6}
                          name="内存使用率(%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="disk"
                          stackId="1"
                          stroke="#faad14"
                          fill="#faad14"
                          fillOpacity={0.6}
                          name="磁盘使用率(%)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Card title="当前资源使用" size="small">
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text>CPU 使用率</Text>
                          <Text strong>{stats.cpuUsage}%</Text>
                        </div>
                        <Progress
                          percent={stats.cpuUsage}
                          status={stats.cpuUsage > 80 ? 'exception' : 'normal'}
                          strokeColor={stats.cpuUsage > 80 ? '#ff4d4f' : '#1890ff'}
                          size="small"
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text>内存使用率</Text>
                          <Text strong>{stats.memoryUsage}%</Text>
                        </div>
                        <Progress
                          percent={stats.memoryUsage}
                          status={stats.memoryUsage > 80 ? 'exception' : 'normal'}
                          strokeColor={stats.memoryUsage > 80 ? '#ff4d4f' : '#52c41a'}
                          size="small"
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text>磁盘使用率</Text>
                          <Text strong>{stats.diskUsage}%</Text>
                        </div>
                        <Progress
                          percent={stats.diskUsage}
                          status={stats.diskUsage > 80 ? 'exception' : 'normal'}
                          strokeColor={stats.diskUsage > 80 ? '#ff4d4f' : '#faad14'}
                          size="small"
                        />
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* 用户活动统计 */}
              <Card title="用户活动统计（最近7天）" size="small">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={generateUserActivityData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} />
                    <RechartsTooltip />
                    <Bar dataKey="登录" fill="#1890ff" />
                    <Bar dataKey="注册" fill="#52c41a" />
                    <Bar dataKey="操作" fill="#faad14" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </TabPane>

        {/* 用户管理 */}
        {hasPermission('user.read') && (
          <TabPane
            tab={<span><TeamOutlined />用户管理</span>}
            key="users"
          >
            <Card
              title={`用户管理 (${usersPagination.total})`}
              size="small"
              extra={
                <Space>
                  <Input.Search
                    placeholder="搜索用户..."
                    style={{ width: 200 }}
                    onSearch={(value) => {
                      setUserFilters({ search: value });
                      fetchUsers(1, value);
                    }}
                    allowClear
                    size="small"
                  />
                  {hasPermission('user.create') && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={() => {
                        setEditingUser(null);
                        form.resetFields();
                        setUserModalVisible(true);
                      }}
                    >
                      添加用户
                    </Button>
                  )}
                </Space>
              }
            >
              <Table
                columns={userColumns}
                dataSource={users}
                loading={usersLoading}
                rowKey="id"
                size="small"
                pagination={{
                  current: usersPagination.current,
                  pageSize: usersPagination.pageSize,
                  total: usersPagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `显示 ${range[0]}-${range[1]} 条，共 ${total} 条数据`,
                  onChange: (page, pageSize) => {
                    setUsersPagination(prev => ({ ...prev, pageSize: pageSize || 10 }));
                    fetchUsers(page);
                  },
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          </TabPane>
        )}

        {/* 系统设置 */}
        <TabPane
          tab={<span><ControlOutlined />系统设置</span>}
          key="system"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="系统配置" size="small" extra={<SafetyOutlined />}>
                <Form
                  form={configForm}
                  layout="vertical"
                  onFinish={handleSaveConfig}
                  initialValues={{
                    refreshInterval: 30,
                    autoRefresh: true,
                    enableTwoFactor: true,
                    logUserActivity: true,
                    sessionTimeout: 60,
                  }}
                >
                  <Form.Item
                    name="refreshInterval"
                    label="数据刷新间隔 (秒)"
                    rules={[
                      { required: true, message: '请输入刷新间隔' },
                      { type: 'number', min: 10, max: 300, message: '刷新间隔必须在10-300秒之间' }
                    ]}
                  >
                    <InputNumber min={10} max={300} style={{ width: '100%' }} size="small" />
                  </Form.Item>

                  <Form.Item
                    name="autoRefresh"
                    label="自动刷新"
                    valuePropName="checked"
                  >
                    <Switch size="small" />
                  </Form.Item>

                  <Form.Item
                    name="enableTwoFactor"
                    label="启用双因素认证"
                    valuePropName="checked"
                  >
                    <Switch size="small" />
                  </Form.Item>

                  <Form.Item
                    name="logUserActivity"
                    label="记录用户活动"
                    valuePropName="checked"
                  >
                    <Switch size="small" />
                  </Form.Item>

                  <Form.Item
                    name="sessionTimeout"
                    label="会话超时 (分钟)"
                    rules={[
                      { required: true, message: '请输入会话超时时间' },
                      { type: 'number', min: 15, max: 480, message: '会话超时必须在15-480分钟之间' }
                    ]}
                  >
                    <InputNumber min={15} max={480} style={{ width: '100%' }} size="small" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" size="small">
                      保存设置
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="系统维护" size="small" extra={<WarningOutlined />}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    icon={<DatabaseOutlined />}
                    onClick={() => handleMaintenance('backup')}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    立即备份数据
                  </Button>

                  <Button
                    icon={<ClearOutlined />}
                    onClick={() => handleMaintenance('cleanup')}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    清理系统日志
                  </Button>

                  <Popconfirm
                    title="确定要重启系统吗？"
                    description="系统重启将影响所有在线用户"
                    onConfirm={() => handleMaintenance('restart')}
                    okText="确认重启"
                    cancelText="取消"
                  >
                    <Button
                      danger
                      icon={<ReloadOutlined />}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      重启系统
                    </Button>
                  </Popconfirm>

                  <Divider style={{ margin: '12px 0' }} />

                  <Alert
                    message="系统状态"
                    description={
                      <div style={{ fontSize: '12px' }}>
                        <p style={{ margin: '4px 0' }}>最后备份: {stats?.lastBackup}</p>
                        <p style={{ margin: '4px 0' }}>运行时间: {stats?.systemUptime}</p>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 活动日志 */}
        {hasPermission('system.logs') && (
          <TabPane
            tab={<span><FileTextOutlined />活动日志</span>}
            key="logs"
          >
            <Card
              title="系统活动日志"
              size="small"
              extra={
                <Space wrap size="small">
                  <Select
                    placeholder="用户筛选"
                    style={{ width: 100 }}
                    allowClear
                    size="small"
                    value={activityFilters.userId}
                    onChange={(value) =>
                      setActivityFilters(prev => ({ ...prev, userId: value || '' }))
                    }
                  >
                    {users.map(user => (
                      <Option key={user.id} value={user.id}>
                        {user.username}
                      </Option>
                    ))}
                  </Select>

                  <Select
                    placeholder="操作类型"
                    style={{ width: 100 }}
                    allowClear
                    size="small"
                    value={activityFilters.action}
                    onChange={(value) =>
                      setActivityFilters(prev => ({ ...prev, action: value || '' }))
                    }
                  >
                    <Option value="login">登录</Option>
                    <Option value="logout">登出</Option>
                    <Option value="create">创建</Option>
                    <Option value="update">更新</Option>
                    <Option value="delete">删除</Option>
                  </Select>

                  <Select
                    placeholder="级别"
                    style={{ width: 80 }}
                    allowClear
                    size="small"
                    value={activityFilters.level}
                    onChange={(value) =>
                      setActivityFilters(prev => ({ ...prev, level: value || '' }))
                    }
                  >
                    <Option value="info">Info</Option>
                    <Option value="warning">Warn</Option>
                    <Option value="error">Error</Option>
                  </Select>

                  <RangePicker
                    size="small"
                    onChange={(dates) => {
                      setActivityFilters(prev => ({
                        ...prev,
                        startDate: dates?.[0]?.format('YYYY-MM-DD') || '',
                        endDate: dates?.[1]?.format('YYYY-MM-DD') || '',
                      }));
                    }}
                  />

                  <Button
                    icon={<SearchOutlined />}
                    onClick={() => fetchActivities(1)}
                    size="small"
                    type="primary"
                  >
                    搜索
                  </Button>

                  <Button
                    onClick={() => {
                      setActivityFilters({
                        userId: '',
                        action: '',
                        level: '',
                        startDate: '',
                        endDate: '',
                      });
                      fetchActivities(1);
                    }}
                    size="small"
                  >
                    重置
                  </Button>
                </Space>
              }
            >
              <Table
                columns={activityColumns}
                dataSource={activities}
                loading={activitiesLoading}
                rowKey="id"
                size="small"
                pagination={{
                  current: activitiesPagination.current,
                  pageSize: activitiesPagination.pageSize,
                  total: activitiesPagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `显示 ${range[0]}-${range[1]} 条，共 ${total} 条数据`,
                  onChange: (page, pageSize) => {
                    setActivitiesPagination(prev => ({ ...prev, pageSize: pageSize || 20 }));
                    fetchActivities(page);
                  },
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          </TabPane>
        )}
      </Tabs>

      {/* 用户模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onCancel={() => {
          setUserModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveUser}
          size="small"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少需要3个字符' },
                  { max: 20, message: '用户名不能超过20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                ]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  <Option value="user">普通用户</Option>
                  <Option value="admin">管理员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="用户状态"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                  defaultChecked
                  size="small"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="avatar" label="头像">
            <Input placeholder="请输入头像表情符号或图标" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码至少需要6个字符' }
              ]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setUserModalVisible(false)} size="small">
                取消
              </Button>
              <Button type="primary" htmlType="submit" size="small">
                {editingUser ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPanel;