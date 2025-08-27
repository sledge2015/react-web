// src/hooks/useAuth.tsx - 专注状态管理的useAuth
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { message } from 'antd';
import { authService } from '../services/authService';
import TokenManager from '../utils/tokenManager';

// 用户类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  permissions?: string[];
}

// 认证状态接口
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastActivity: number;
}

// 认证上下文类型
interface AuthContextType extends AuthState {
  // 🔥 状态管理方法
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updateLastActivity: () => void;

  // 🔥 权限和业务方法
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;

  // 🔥 状态查询方法
  getTokenRemainingTime: () => number;
  isTokenExpiring: (minutes?: number) => boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 权限定义
const PERMISSIONS = {
  // 用户管理权限
  'user.read': ['admin'],
  'user.create': ['admin'],
  'user.update': ['admin'],
  'user.delete': ['admin'],

  // 系统管理权限
  'system.config': ['admin'],
  'system.logs': ['admin'],

  // 股票数据权限
  'stock.read': ['admin', 'user'],
  'stock.create': ['admin', 'user'],
  'stock.update': ['admin', 'user'],
  'stock.delete': ['admin', 'user'],

  // 投资组合权限
  'portfolio.read': ['admin', 'user'],
  'portfolio.create': ['admin', 'user'],
  'portfolio.update': ['admin', 'user'],
  'portfolio.delete': ['admin', 'user'],
};

// 🏗️ 认证提供者组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 🔥 状态定义
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // 计算派生状态
  const isAuthenticated = Boolean(user && TokenManager.isAuthenticated());

  // 🔄 初始化认证状态
  useEffect(() => {
    initializeAuth();
  }, []);

  // 🔄 设置令牌事件监听
  useEffect(() => {
    const handleTokenRemoved = () => {
      console.log('🔄 检测到令牌被移除，清除用户状态');
      setUser(null);
      setLastActivity(Date.now());
    };

    const handleTokenSet = () => {
      console.log('🔄 检测到令牌被设置，更新最后活动时间');
      setLastActivity(Date.now());
    };

    // 监听TokenManager事件
    TokenManager.addEventListener('tokenRemoved', handleTokenRemoved);
    TokenManager.addEventListener('tokenSet', handleTokenSet);

    // 监听全局认证事件
    const handleAuthUnauthorized = () => {
      console.log('🚨 收到全局认证失败事件');
      handleLogout();
    };

    const handleAuthExpired = () => {
      console.log('🚨 收到认证过期事件');
      handleLogout();
      message.warning('登录已过期，请重新登录');
    };

    window.addEventListener('auth:unauthorized', handleAuthUnauthorized);
    window.addEventListener('auth:expired', handleAuthExpired);

    // 清理函数
    return () => {
      TokenManager.removeEventListener('tokenRemoved', handleTokenRemoved);
      TokenManager.removeEventListener('tokenSet', handleTokenSet);
      window.removeEventListener('auth:unauthorized', handleAuthUnauthorized);
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  // 🔄 初始化认证状态
  const initializeAuth = async () => {
    console.log('🔄 初始化认证状态...');
    setIsLoading(true);

    try {
      // 检查自动登录
      const autoLoginResult = await authService.checkAutoLogin();

      if (autoLoginResult.shouldAutoLogin && autoLoginResult.user) {
        setUser(autoLoginResult.user);
        console.log('✅ 自动登录成功:', autoLoginResult.user.username);
      } else {
        console.log('ℹ️ 无需自动登录或自动登录失败');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ 初始化认证状态失败:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 登录处理 (由LoginForm调用)
  const login = useCallback((userData: User, token: string) => {
    console.log('🔐 useAuth.login 被调用:', userData.username);

    setUser(userData);
    setLastActivity(Date.now());

    console.log('✅ useAuth状态已更新');
  }, []);

  // 🚪 登出处理
  const handleLogout = useCallback(async () => {
    console.log('🚪 useAuth.logout 开始');

    try {
      // 调用AuthService登出（清除令牌和调用API）
      await authService.logout();
    } catch (error) {
      console.error('❌ 登出过程出错:', error);
    } finally {
      // 清除本地状态
      setUser(null);
      setLastActivity(Date.now());
      console.log('✅ 用户状态已清除');
    }
  }, []);

  // 🔄 刷新认证状态
  const refreshAuthState = useCallback(async () => {
    console.log('🔄 刷新认证状态...');

    try {
      if (TokenManager.isAuthenticated()) {
        const validatedUser = await authService.validateToken();
        if (validatedUser) {
          setUser(validatedUser);
          setLastActivity(Date.now());
          console.log('✅ 认证状态刷新成功');
        } else {
          throw new Error('令牌验证失败');
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('❌ 刷新认证状态失败:', error);
      setUser(null);
    }
  }, []);

  // 👤 更新用户信息
  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      TokenManager.setUser(updatedUser); // 同步到存储
      setLastActivity(Date.now());
      console.log('👤 用户信息已更新');
    }
  }, [user]);

  // ⏰ 更新最后活动时间
  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // 🔒 权限检查方法
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // 检查用户是否有明确的权限
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    // 根据角色检查权限
    const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
    return allowedRoles ? allowedRoles.includes(user.role) : false;
  }, [user]);

  // 👑 角色检查方法
  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role;
  }, [user]);

  // ⏱️ 获取令牌剩余时间
  const getTokenRemainingTime = useCallback((): number => {
    return authService.getTokenRemainingTime('access');
  }, []);

  // ⚠️ 检查令牌是否即将过期
  const isTokenExpiring = useCallback((minutes: number = 5): boolean => {
    return authService.isAccessTokenExpiring(minutes);
  }, []);

  // 🎯 构建上下文值
  const contextValue: AuthContextType = {
    // 状态
    user,
    isLoading,
    isAuthenticated,
    lastActivity,

    // 方法
    login,
    logout: handleLogout,
    refreshAuthState,
    updateUser,
    updateLastActivity,
    hasPermission,
    hasRole,
    getTokenRemainingTime,
    isTokenExpiring,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 🎣 使用认证hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 🛡️ 权限守卫Hook
export const usePermission = (permission: string) => {
  const { hasPermission, isLoading, isAuthenticated } = useAuth();

  return {
    hasPermission: hasPermission(permission),
    isLoading,
    isAuthenticated
  };
};

// 👑 角色守卫Hook
export const useRole = (role: string) => {
  const { hasRole, isLoading, isAuthenticated } = useAuth();

  return {
    hasRole: hasRole(role),
    isLoading,
    isAuthenticated
  };
};

// 🔄 自动刷新状态Hook
export const useAuthRefresh = (intervalMinutes: number = 30) => {
  const { refreshAuthState, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('🔄 定时刷新认证状态...');
      refreshAuthState();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAuthState, intervalMinutes]);
};

export default useAuth;