// hooks/useAuth.tsx - 真实API版本
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';

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

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  updateUser: (userData: Partial<User>) => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token 存储工具
class TokenStorage {
  private static TOKEN_KEY = 'stock_app_token';
  private static USER_KEY = 'stock_app_user';

  static saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static saveUser(user: User) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('解析用户数据失败:', error);
        this.removeUser();
      }
    }
    return null;
  }

  static removeUser() {
    localStorage.removeItem(this.USER_KEY);
  }

  static clear() {
    this.removeToken();
    this.removeUser();
  }
}

// API 客户端
class AuthAPI {
  private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  static async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseURL}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Token验证失败:', error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    const token = TokenStorage.getToken();
    if (token) {
      try {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      } catch (error) {
        console.error('API退出登录失败:', error);
      }
    }
  }

  static async refreshToken(): Promise<{ user: User; token: string } | null> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        return response.json();
      }
      return null;
    } catch (error) {
      console.error('刷新Token失败:', error);
      return null;
    }
  }
}

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

// 认证提供者组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化认证状态
  useEffect(() => {
    initializeAuth();

    // 返回空的清理函数
    return () => {};
  }, []);

  // 设置Token刷新定时器
  useEffect(() => {
    if (token) {
      // 每25分钟刷新一次token（假设token有效期30分钟）
      const refreshInterval = setInterval(async () => {
        try {
          const refreshResult = await AuthAPI.refreshToken();
          if (refreshResult) {
            setUser(refreshResult.user);
            setToken(refreshResult.token);
            TokenStorage.saveToken(refreshResult.token);
            TokenStorage.saveUser(refreshResult.user);
          } else {
            // 刷新失败，清除认证状态
            console.log('Token刷新失败，清除认证状态');
            setUser(null);
            setToken(null);
            TokenStorage.clear();
            message.warning('登录已过期，请重新登录');
          }
        } catch (error) {
          console.error('Token刷新出错:', error);
          // 刷新出错也清除认证状态
          setUser(null);
          setToken(null);
          TokenStorage.clear();
        }
      }, 25 * 60 * 1000); // 25分钟

      return () => clearInterval(refreshInterval);
    }

    // 如果没有token，返回一个空的清理函数
    return () => {};
  }, [token]); // 移除 logout 依赖，避免循环依赖

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // 从本地存储获取保存的token和用户信息
      const savedToken = TokenStorage.getToken();
      const savedUser = TokenStorage.getUser();

      if (savedToken && savedUser) {
        // 验证token是否仍然有效
        const validatedUser = await AuthAPI.validateToken(savedToken);

        if (validatedUser) {
          setUser(validatedUser);
          setToken(savedToken);
          TokenStorage.saveUser(validatedUser); // 更新用户信息
        } else {
          // Token无效，清除本地存储
          TokenStorage.clear();
        }
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error);
      TokenStorage.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);

    // 保存到本地存储
    TokenStorage.saveToken(userToken);
    TokenStorage.saveUser(userData);
  };

  const logout = async () => {
    try {
      // 调用API注销
      await AuthAPI.logout();
    } catch (error) {
      console.error('注销API调用失败:', error);
    } finally {
      // 清除本地状态和存储
      setUser(null);
      setToken(null);
      TokenStorage.clear();

      message.success('已安全退出');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // 检查用户是否有明确的权限
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    // 根据角色检查权限
    const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
    if (allowedRoles && allowedRoles.includes(user.role)) {
      return true;
    }

    return false;
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      TokenStorage.saveUser(updatedUser);
    }
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    hasPermission,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HTTP客户端工具（为其他API调用提供认证header）
export class APIClient {
  private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  static async request(endpoint: string, options: RequestInit = {}) {
    const token = TokenStorage.getToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      // 如果token过期，尝试刷新
      if (response.status === 401) {
        const refreshResult = await AuthAPI.refreshToken();
        if (refreshResult) {
          TokenStorage.saveToken(refreshResult.token);
          TokenStorage.saveUser(refreshResult.user);

          // 重试原始请求
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${refreshResult.token}`,
          };

          return fetch(`${this.baseURL}${endpoint}`, config);
        } else {
          // 刷新失败，重定向到登录页面
          TokenStorage.clear();
          window.location.reload();
          throw new Error('认证过期，请重新登录');
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  static get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default useAuth;