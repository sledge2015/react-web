// src/config/menuConfig.ts - 菜单配置
import {
  DashboardOutlined,
  HeartOutlined,
  BarChartOutlined,
  TrophyOutlined,
  StarOutlined,
  TeamOutlined,
  MonitorOutlined,
  ControlOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

export interface MenuConfig {
  key: string;
  icon: string;
  label: string;
  component?: string;
  permission?: string;
  children?: MenuConfig[];
}

export const mainMenuConfig: MenuConfig[] = [
  {
    key: 'portfolio',
    icon: 'DashboardOutlined',
    label: '投资组合',
    component: 'Portfolio',
  },
  {
    key: 'watchlist',
    icon: 'HeartOutlined',
    label: '关注列表',
    component: 'Watchlist',
  },
  {
    key: 'market',
    icon: 'BarChartOutlined',
    label: '市场行情',
    component: 'Market',
  },
  {
    key: 'analysis',
    icon: 'TrophyOutlined',
    label: '分析工具',
    component: 'Analysis',
  },
  {
    key: 'favorites',
    icon: 'StarOutlined',
    label: '收藏夹',
    component: 'Favorites',
  },
  {
    key: 'admin',
    icon: 'TeamOutlined',
    label: '系统管理',
    component: 'AdminPanel',
    permission: 'system.config',
    children: [
      {
        key: 'admin-overview',
        icon: 'MonitorOutlined',
        label: '系统概览',
        permission: 'system.config',
      },
      {
        key: 'admin-users',
        icon: 'TeamOutlined',
        label: '用户管理',
        permission: 'user.read',
      },
      {
        key: 'admin-system',
        icon: 'ControlOutlined',
        label: '系统设置',
        permission: 'system.config',
      },
      {
        key: 'admin-logs',
        icon: 'FileTextOutlined',
        label: '操作日志',
        permission: 'system.logs',
      },
    ],
  },
];

// 获取菜单标题映射
export const getMenuTitleMap = (): Record<string, string> => {
  const titleMap: Record<string, string> = {};

  const extractTitles = (menuItems: MenuConfig[]) => {
    menuItems.forEach(item => {
      titleMap[item.key] = item.label;
      if (item.children) {
        extractTitles(item.children);
      }
    });
  };

  extractTitles(mainMenuConfig);
  return titleMap;
};

// 获取有权限的菜单项
export const getFilteredMenuItems = (
  menuItems: MenuConfig[],
  hasPermission: (permission: string) => boolean
): MenuConfig[] => {
  return menuItems
    .filter(item => !item.permission || hasPermission(item.permission))
    .map(item => ({
      ...item,
      children: item.children
        ? getFilteredMenuItems(item.children, hasPermission)
        : undefined,
    }));
};