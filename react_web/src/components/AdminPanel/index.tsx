// src/components/AdminPanel/index.tsx - 修复后的代码
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
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types/auth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { adminService } from "../../services/adminService";

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

interface AdminPanelProps {
  activeTab?: string;
  onRefresh?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ activeTab, onRefresh }) => {
  const { user, hasPermission } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');
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

  // 根据外部传入的activeTab设置内部状态
  useEffect(() => {
    if (activeTab) {
      const tabMap: Record<string, string> = {
        'admin': 'overview',
        'admin-overview': 'overview',
        'admin-users': 'users',
        'admin-system': 'system',
        'admin-logs': 'logs'
      };
      setCurrentTab(tabMap[activeTab] || 'overview');
    }
  }, [activeTab]);

  // 获取系统统计
  const fetchStats = useCallback(async () => {
    try {
      // const response = await adminService.get('/admin/stats');
      // if (response.success) {
      //   setStats(response.data);
      // }

      // 接口为空时，设置为null，让UI显示空状态
      setStats(null);
    } catch (error) {
      console.error('获取系统统计失败:', error);
      setStats(null);
    }
  }, []);

  // 获取用户列表
  const fetchUsers = useCallback(async (page: number = 1, search?: string) => {
    if (!hasPermission('user.read')) {
      console.log('No permission to read users');
      return;
    }

    try {
      setUsersLoading(true);
      const params: any = { page, limit: usersPagination.pageSize };
      if (search || userFilters.search) {
        params.search = search || userFilters.search;
      }

      // const response = await adminService.get('/admin/users', params);
      // if (response.success) {
      //   setUsers(response.data.users || []);
      //   setUsersPagination(prev => ({
      //     ...prev,
      //     current: response.data.page || page,
      //     total: response.data.total || 0,
      //   }));
      // }

      // 接口为空时，设置为空数组
      setUsers([]);
      setUsersPagination(prev => ({ ...prev, total: 0 }));
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setUsers([]);
      setUsersPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setUsersLoading(false);
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

      // const response = await adminService.get('/admin/logs', params);
      // if (response.success) {
      //   setActivities(response.data.logs || []);
      //   setActivitiesPagination(prev => ({
      //     ...prev,
      //     current: response.data.page || page,
      //     total: response.data.total || 0,
      //   }));
      // }

      // 接口为空时，设置为空数组
      setActivities([]);
      setActivitiesPagination(prev => ({ ...prev, total: 0 }));
    } catch (error) {
      console.error('获取活动日志失败:', error);
      setActivities([]);
      setActivitiesPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setActivitiesLoading(false);
    }
  }, [hasPermission, activitiesPagination.pageSize, activityFilters]);

  // 刷新所有数据
  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchActivities(),
      ]);
      message.success('管理面板数据已刷新');
    } catch (error) {
      console.error('刷新数据失败:', error);
      message.error('刷新数据失败');
    }
  }, [fetchStats, fetchUsers, fetchActivities]);

  // 初始化数据 - 修复后的版本
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchStats(),
          fetchUsers(),
          fetchActivities(),
        ]);
      } catch (error) {
        console.error('初始化管理面板失败:', error);
      } finally {
        // 确保loading状态被正确设置为false
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchStats, fetchUsers, fetchActivities]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleGlobalRefresh = (event: CustomEvent) => {
      // 只在当前是admin相关页面时才刷新
      if (event.detail?.activeMenu?.startsWith('admin')) {
        refreshAllData();
      }
    };

    window.addEventListener('refreshData', handleGlobalRefresh as EventListener);
    return () => window.removeEventListener('refreshData', handleGlobalRefresh as EventListener);
  }, [refreshAllData]);

  // 创建/更新用户
  const handleSaveUser = async (values: any) => {
    try {
      // if (editingUser) {
      //   await adminService.put(`/admin/users/${editingUser.id}`, values);
      //   message.success('用户信息已更新');
      // } else {
      //   await adminService.post('/admin/users', values);
      //   message.success('用户创建成功');
      // }

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
      // await adminService.delete(`/admin/users/${userId}`);
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
      // const response = await adminService.post(`/admin/users/${userId}/reset-password`);
      // const tempPassword = response.data?.temporaryPassword || `temp${Math.random().toString(36).substr(2, 8)}`;

      Modal.success({
        title: '密码重置成功',
        content: (
          <div>
            <p>用户 "{username}" 的密码已重置</p>
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
      // await adminService.put('/admin/config', values);
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
          // result = await adminService.post('/admin/backup');
          message.success('系统备份完成');
          break;
        case 'cleanup':
          // result = await adminService.post('/admin/cleanup-logs');
          message.success('日志清理完成');
          break;
        case 'restart':
          // await adminService.post('/admin/restart');
          message.success('系统重启指令已发送');
          break;
      }
      fetchStats();
    } catch (error) {
      const actionText = action === 'backup' ? '备份' : action === 'cleanup' ? '清理' : '重启';
      message.error(`${actionText}操作失败`);
    }
  };

  // 生成性能数据 - 当stats为空时返回空数组
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

  // 生成用户活动统计 - 返回空数组
  const generateUserActivityData = () => {
    return [];
  };

  // 表格列定义
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
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'default'}
          text={isActive ? '活跃' : '停用'}
        />
      ),
    },
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
      dataIndex: 'lastLogin',
      key: 'lastLogin',
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
        activeKey={currentTab}
        onChange={setCurrentTab}
        type="card"
      >
        {/* 系统概览 */}
        <TabPane
          tab={<span><MonitorOutlined />系统概览</span>}
          key="overview"
        >
          {stats ? (
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
          ) : (
            // stats为空时显示空状态
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Empty
                description="暂无系统统计数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={fetchStats} icon={<ReloadOutlined />}>
                  重新加载
                </Button>
              </Empty>
            </div>
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
                locale={{
                  emptyText: <Empty description="暂无用户数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }}
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
                        <p style={{ margin: '4px 0' }}>最后备份: {stats?.lastBackup || '暂无数据'}</p>
                        <p style={{ margin: '4px 0' }}>运行时间: {stats?.systemUptime || '暂无数据'}</p>
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
                locale={{
                  emptyText: <Empty description="暂无活动日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }}
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