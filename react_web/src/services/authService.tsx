// src/services/authService.ts - 优化版本
import { apiClient, ApiResponse } from './api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  // 登录 - 优先API，后备本地验证
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🔑 AuthService.login called with:', credentials);

    try {
      // 1. 尝试API登录
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

      if (response.success && response.data) {
        console.log('✅ API login successful');
        this.saveAuthData(response.data);
        return response.data;
      }

      throw new Error(response.message || 'API登录失败');
    } catch (apiError) {
      console.warn('⚠️ API login failed, trying fallback accounts:', apiError);

      // 3. 都失败时抛出错误
      throw new Error('用户名或密码错误');
    }
  }

  // 注册
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);

      if (response.success && response.data) {
        this.saveAuthData(response.data);
        return response.data;
      }

      throw new Error(response.message || '注册失败');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Token验证
  async validateToken(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/validate');

      if (response.success && response.data) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
        return response.data;
      }

      throw new Error('Token validation failed');
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  // 登出
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  // 保存认证数据
  private saveAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authData.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));
    if (authData.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
    }
  }

  // 清除认证数据
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.clearAuthData();
      return null;
    }
  }

  // 获取当前Token
  getCurrentToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    return !!(this.getCurrentToken() && this.getCurrentUser());
  }
}

export const authService = new AuthService();