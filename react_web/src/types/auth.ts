// src/types/auth.ts - 统一类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
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

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  isAdmin: () => boolean;
  hasPermission: (permission: string) => boolean;
}