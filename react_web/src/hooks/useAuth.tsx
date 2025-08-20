// hooks/useAuth.ts
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../services/api'; // 👈 统一 API 客户端

// =================== 类型定义 ===================
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<boolean>;
  logout: () => void;
  register: (data: RegisterRequest) => Promise<boolean>;
  isAdmin: () => boolean;
}

// =================== 上下文 ===================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 恢复登录状态
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  // =================== 登录 ===================
  const login = async (data: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/login', data);
      const { user, token } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      setUser(user);
      return true;
    } catch (err) {
      console.error('登录失败:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // =================== 注册 ===================
  const register = async (data: RegisterRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/register', data);
      const { user, token } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      setUser(user);
      return true;
    } catch (err) {
      console.error('注册失败:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // =================== 登出 ===================
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return context;
};

// =================== 路由保护 ===================
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <div>加载中...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <Component {...props} />;
  };
};
