// src/services/authService.ts
import { apiClient, ApiResponse } from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

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

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (!response.success || !response.data) throw new Error(response.message || '登录失败');
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('user_data', JSON.stringify(response.data.user));
    if (response.data.refreshToken) localStorage.setItem('refresh_token', response.data.refreshToken);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (!response.success || !response.data) throw new Error(response.message || '注册失败');
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('user_data', JSON.stringify(response.data.user));
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
    }
  }

  getCurrentUser(): User | null {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  getCurrentToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!(this.getCurrentToken() && this.getCurrentUser());
  }
}

// 单例服务
export const authService = new AuthService();
