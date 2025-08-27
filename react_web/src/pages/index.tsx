// src/layouts/MainLayout.tsx - 主布局组件
import React, { useState, useCallback } from 'react';
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
  StockOutlined,
  DollarOutlined,
  RiseOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  SafetyOutlined,
  HeartOutlined,
  StarOutlined,
  TrophyOutlined,
  ReloadOutlined,
  MonitorOutlined,
  ControlOutlined,
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
  permission?: string;
  children?: MenuItem[];
}

// 布局组件属性
interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  onMenuChange: (key: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// 用户下拉菜单组件
const UserDropdown: React.FC<{ onMenuChange: (key: string) => void }> = ({ onMenuChange }) => {
  const { user, logout, hasPermission } = useAuth();

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

    // 快速切换菜单项
    {
      key: 'portfolio',
      icon: <DashboardOutlined />,
      label: '返回投资组合',
    },

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
      case 'portfolio':
      case 'admin':
        onMenuChange(key);
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
  onMenuChange,
  refreshing = false,
  onRefresh,
}) => {
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // 菜单配置
  const menuItems: MenuItem[] = [
    {
      key: 'portfolio',
      icon: <DashboardOutlined />,
      label: '投资组合',
    },
    {
      key: 'watchlist',
      icon: <HeartOutlined />,
      label: '关注列表',
    },
    {
      key: 'market',
      icon: <BarChartOutlined />,
      label: '市场行情',
    },
    {
      key: 'analysis',
      icon: <TrophyOutlined />,
      label: '分析工具',
    },
    {
      key: 'favorites',
      icon: <StarOutlined />,
      label: '收藏夹',
    },
    // 管理员菜单
    ...(hasPermission('system.config') ? [{
      key: 'admin',
      icon: <TeamOutlined />,
      label: '系统管理',
      permission: 'system.config',
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
          selectedKeys={[activeMenu]}
          style={{ borderRight: 0, marginTop: 8 }}
          onClick={({ key }) => onMenuChange(key)}
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
            {/* 刷新按钮 - 所有页面通用 */}
            <Tooltip title="刷新数据">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={refreshing}
                type="text"
                style={{ fontSize: '16px', width: 48, height: 48 }}
              />
            </Tooltip>

            {/* 通知 - 所有页面通用 */}
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

            {/* 用户菜单 - 所有页面通用 */}
            <UserDropdown onMenuChange={onMenuChange} />
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