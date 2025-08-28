// src/layouts/MainLayout/index.tsx - 修复后的主布局组件
import React, {useState, useCallback, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Space,
  Avatar,
  Dropdown,
  Typography,
  Badge,
  Tooltip,
  message,
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  BarChartOutlined,
  TeamOutlined,
  ReloadOutlined,
  HeartOutlined,
  StarOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import type { MenuProps } from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// 菜单项接口
interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  permission?: string;
  children?: MenuItem[];
}

// 布局组件属性
interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// 用户下拉菜单组件
const UserDropdown: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    { type: 'divider' },
    // 管理员快速入口
    ...(hasPermission('system.config') ? [{
      key: 'admin',
      icon: <TeamOutlined />,
      label: '管理面板',
    }] : []),

    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'logout':
        logout();
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'profile':
        message.info('个人资料功能开发中...');
        break;
      case 'settings':
        message.info('设置功能开发中...');
        break;
      default:
        console.log('User menu clicked:', key);
    }
  };

  return (
    <Dropdown
      menu={{
        items: userMenuItems,
        onClick: handleMenuClick,
      }}
      placement="bottomRight"
      arrow
    >
      <Space style={{ cursor: 'pointer' }}>
        <Avatar size="small">
          {user?.avatar || user?.username?.charAt(0).toUpperCase()}
        </Avatar>
        <Text>{user?.username}</Text>
      </Space>
    </Dropdown>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeMenu,
  refreshing = false,
  onRefresh,
}) => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // 菜单配置
  const menuItems: MenuItem[] = [
    {
      key: 'portfolio',
      icon: <DashboardOutlined />,
      label: '投资组合',
      path: '/portfolio',
    },
    {
      key: 'watchlist',
      icon: <HeartOutlined />,
      label: '关注列表',
      path: '/watchlist',
    },
    {
      key: 'market',
      icon: <BarChartOutlined />,
      label: '市场行情',
      path: '/market',
    },
    {
      key: 'analysis',
      icon: <TrophyOutlined />,
      label: '分析工具',
      path: '/analysis',
    },
    {
      key: 'favorites',
      icon: <StarOutlined />,
      label: '收藏夹',
      path: '/favorites',
    },
    // 管理员菜单
    ...(hasPermission('system.config') ? [{
      key: 'admin',
      icon: <TeamOutlined />,
      label: '系统管理',
      path: '/admin',
      permission: 'system.config',
      children: [
        {
          key: 'admin-overview',
          icon: <DashboardOutlined />,
          label: '系统概览',
          path: '/admin/overview',
          permission: 'system.config',
        },
        {
          key: 'admin-users',
          icon: <TeamOutlined />,
          label: '用户管理',
          path: '/admin/users',
          permission: 'user.read',
        },
        {
          key: 'admin-system',
          icon: <SettingOutlined />,
          label: '系统设置',
          path: '/admin/system',
          permission: 'system.config',
        },
        {
          key: 'admin-logs',
          icon: <UserOutlined />,
          label: '操作日志',
          path: '/admin/logs',
          permission: 'system.logs',
        },
      ],
    }] : []),
  ];

  // 获取当前页面标题
  const getCurrentPageTitle = (menuKey: string): string => {
    const menuTitles: Record<string, string> = {
      'portfolio': '投资组合',
      'watchlist': '关注列表',
      'market': '市场行情',
      'analysis': '分析工具',
      'favorites': '收藏夹',
      'admin': '系统管理',
      'admin-overview': '系统概览',
      'admin-users': '用户管理',
      'admin-system': '系统设置',
      'admin-logs': '操作日志',
    };
    return menuTitles[menuKey] || '投资管理系统';
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // 处理菜单点击
  const handleMenuClick = useCallback((key: string) => {
    const findMenuItem = (items: MenuItem[], targetKey: string): MenuItem | null => {
      for (const item of items) {
        if (item.key === targetKey) return item;
        if (item.children) {
          const found = findMenuItem(item.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };

    const menuItem = findMenuItem(menuItems, key);
    if (menuItem) {
      navigate(menuItem.path);
    }
  }, [menuItems, navigate]);

  // 处理刷新
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      // 触发全局刷新事件
      window.dispatchEvent(new CustomEvent('refreshData', { detail: { activeMenu } }));
    }
  }, [onRefresh, activeMenu]);

  // 转换菜单项为Antd格式
  const getMenuItems = (items: MenuItem[]): MenuProps['items'] => {
    return items
      .filter(item => !item.permission || hasPermission(item.permission))
      .map(item => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children ? getMenuItems(item.children) : undefined,
      }));
  };

  // 获取选中的菜单键
  const getSelectedKeys = (): string[] => {
    // 如果是管理员子页面，需要选中对应的子菜单
    if (activeMenu.startsWith('admin-')) {
      return [activeMenu];
    }
    return [activeMenu];
  };

  // 初始化展开的菜单键
  useEffect(() => {
    if (activeMenu.startsWith('admin')) {
      setOpenKeys(['admin']);
    }
  }, [activeMenu]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}
      >
        {/* Logo区域 */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
          borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          <div style={{
            color: 'white',
            fontSize: collapsed ? '24px' : '20px',
            fontWeight: 'bold',
          }}>
            {collapsed ? '📈' : '📈 投资分析'}
          </div>
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          // openKeys={getOpenKeys()}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          style={{ borderRight: 0, marginTop: 8 }}
          onClick={({ key }) => handleMenuClick(key)}
          items={getMenuItems(menuItems)}
        />
      </Sider>

      {/* 主要内容区域 */}
      <Layout>
        {/* 共享的顶部菜单栏 */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 999,
        }}>
          {/* 左侧区域 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 48, height: 48 }}
            />
            <Title level={4} style={{ margin: '0 0 0 16px', color: '#1f2937' }}>
              {getCurrentPageTitle(activeMenu)}
            </Title>
          </div>

          {/* 右侧区域 */}
          <Space size="middle">
            {/* 刷新按钮 */}
            <Tooltip title="刷新数据">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={refreshing}
                type="text"
                style={{ fontSize: '16px', width: 48, height: 48 }}
              />
            </Tooltip>

            {/* 通知 */}
            <Tooltip title="通知">
              <Badge count={3} size="small">
                <Button
                  icon={<BellOutlined />}
                  type="text"
                  style={{ fontSize: '16px', width: 48, height: 48 }}
                  onClick={() => message.info('通知功能开发中...')}
                />
              </Badge>
            </Tooltip>

            {/* 用户菜单 */}
            <UserDropdown />
          </Space>
        </Header>

        {/* 内容区域 */}
        <Content style={{
          padding: '24px',
          background: '#f5f5f5',
          overflow: 'auto',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;