// src/hooks/useAuth.ts - 统一版本
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User, LoginRequest, RegisterRequest, AuthContextType } from '../types/auth';

// 权限定义
const PERMISSIONS = {
  admin: [
    'user.create', 'user.read', 'user.update', 'user.delete',
    'stock.create', 'stock.read', 'stock.update', 'stock.delete',
    'system.config', 'system.logs', 'analytics.view', 'export.data'
  ],
  user: [
    'stock.read', 'stock.create', 'stock.update', 'portfolio.manage'
  ]
} as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getCurrentToken();
        const storedUser = authService.getCurrentUser();

        if (storedToken && storedUser) {
          // 如果是内置账户token，直接使用
          if (storedToken.startsWith('fallback_')) {
            setToken(storedToken);
            setUser(storedUser);
            return;
          }

          // API token需要验证
          try {
            const validatedUser = await authService.validateToken();
            setToken(storedToken);
            setUser(validatedUser);
          } catch (error) {
            console.warn('Token validation failed, using stored user data');
            setToken(storedToken);
            setUser(storedUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 登录
  const login = async (data: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('🔑 useAuth.login called');
      const authResponse = await authService.login(data);
      setUser(authResponse.user);
      setToken(authResponse.token);
      console.log('✅ useAuth.login successful');
      return true;
    } catch (error) {
      console.error('❌ useAuth.login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 注册
  const register = async (data: RegisterRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const authResponse = await authService.register(data);
      setUser(authResponse.user);
      setToken(authResponse.token);
      return true;
    } catch (error) {
      console.error('Register failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  // 检查是否为管理员
  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  // 权限检查
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const userPermissions = PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission as any);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAdmin,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 路由保护组件
export const RequireAuth: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <div className="login-required">Please login to continue</div>;
  }

  return <>{children}</>;
};