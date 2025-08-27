// src/services/authService.ts - 优化版本
import { apiClient, ApiResponse } from './api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  // 登录 - 优先API，后备本地验证
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const api_response = await apiClient.post<AuthResponse>('/auth/login', credentials);

    if (!api_response.success || !api_response.data) {
      throw new Error(api_response.error || 'API登录失败');
    }

    apiClient.setAccessToken(
      api_response.data.tokens.token,
      api_response.data.tokens.expiresIn
    );
    apiClient.setAuthToken(
      api_response.data.tokens.refreshToken || '',
      api_response.data.tokens.refreshExpiresIn || 0
    );

    return api_response;
  }

  // 注册
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);

      if (response.success && response.data) {
        apiClient.setAccessToken(
            response.data.tokens.token,
            response.data.tokens.expiresIn
        );
        apiClient.setAuthToken(
            response.data.tokens.refreshToken || '',
            response.data.tokens.refreshExpiresIn || 0
    );
        return response.data;
      }

      throw new Error(response.error || '注册失败');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Token验证
  // async validateToken(): Promise<User> {
  //   try {
  //     const response = await apiClient.get<User>('/auth/validate');
  //
  //     if (response.success && response.data) {
  //       localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
  //       return response.data;
  //     }
  //
  //     throw new Error('Token validation failed');
  //   } catch (error) {
  //     this.clearAuthData();
  //     throw error;
  //   }
  // }

  // 登出
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      apiClient.clearAuthToken(true)
    }
  }

  // 保存认证数据
  // private saveAuthData(authData: AuthResponse): void {
  //   localStorage.setItem(this.TOKEN_KEY, authData.token);
  //   localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));
  //   if (authData.refreshToken) {
  //     localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
  //   }
  // }
  //
  // // 清除认证数据
  // private clearAuthData(): void {
  //   localStorage.removeItem(this.TOKEN_KEY);
  //   localStorage.removeItem(this.USER_KEY);
  //   localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  // }

  // 获取当前用户
  // getCurrentUser(): User | null {
  //   try {
  //     const userData = localStorage.getItem(this.USER_KEY);
  //     return userData ? JSON.parse(userData) : null;
  //   } catch (error) {
  //     console.error('Error parsing user data:', error);
  //     this.clearAuthData();
  //     return null;
  //   }
  // }
  //
  // // 获取当前Token
  // getCurrentToken(): string | null {
  //   return localStorage.getItem(this.TOKEN_KEY);
  // }
  //
  // // 检查是否已认证
  // isAuthenticated(): boolean {
  //   return !!(this.getCurrentToken() && this.getCurrentUser());
  // }
}

export const authService = new AuthService();