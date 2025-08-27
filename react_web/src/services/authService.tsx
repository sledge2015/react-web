// src/services/authService.ts - 简化的认证服务
import { apiClient, ApiResponse } from './api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';
import TokenManager from '../utils/tokenManager';

class AuthService {

  // 🔐 用户登录
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    console.log('🔐 AuthService.login 开始:', { username: credentials.username });

    try {
      // 调用登录API
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

      console.log('📥 登录API响应:', {
        success: response.success,
        hasData: !!response.data,
        hasTokens: !!(response.data?.tokens)
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'API登录失败');
      }

      const { tokens, user } = response.data;

      // 验证响应数据完整性
      if (!tokens?.token || !tokens?.refreshToken || !user) {
        throw new Error('服务器响应数据不完整');
      }

      // 🔑 保存令牌到TokenManager
      const accessTokenSet = TokenManager.setAccessToken(
        tokens.token,
        tokens.expiresIn
      );

      const refreshTokenSet = TokenManager.setRefreshToken(
        tokens.refreshToken,
        tokens.refreshExpiresIn || (7 * 24 * 60 * 60) // 默认7天
      );

      if (!accessTokenSet || !refreshTokenSet) {
        throw new Error('令牌保存失败');
      }

      // 👤 保存用户信息
      const userSaved = TokenManager.setUser(user);
      if (!userSaved) {
        console.warn('⚠️ 用户信息保存失败，但登录继续');
      }

      console.log('✅ AuthService.login 登录成功');

      return response;

    } catch (error: any) {
      console.error('💥 AuthService.login 失败:', error);

      // 根据错误类型提供友好的错误消息
      if (error.status === 401) {
        throw new Error('用户名或密码错误');
      } else if (error.status === 403) {
        throw new Error('账户被禁用，请联系管理员');
      } else if (error.message?.includes('网络')) {
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        throw new Error(error.message || '登录失败，请重试');
      }
    }
  }

  // 📝 用户注册
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    console.log('📝 AuthService.register 开始');

    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);

      console.log('📥 注册API响应:', {
        success: response.success,
        hasData: !!response.data
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '注册失败');
      }

      const { tokens, user } = response.data;

      // 注册成功后也保存令牌（自动登录）
      if (tokens?.token && tokens?.refreshToken) {
        TokenManager.setAccessToken(tokens.token, tokens.expiresIn);
        TokenManager.setRefreshToken(
          tokens.refreshToken,
          tokens.refreshExpiresIn || (7 * 24 * 60 * 60)
        );
        TokenManager.setUser(user);
      }

      console.log('✅ AuthService.register 注册成功');
      return response;

    } catch (error: any) {
      console.error('💥 注册失败:', error);

      if (error.message?.includes('用户名已存在')) {
        throw new Error('用户名已被占用，请选择其他用户名');
      } else if (error.message?.includes('邮箱已存在')) {
        throw new Error('邮箱已被注册，请使用其他邮箱或直接登录');
      } else if (error.message?.includes('邀请码')) {
        throw new Error('邀请码无效或已过期');
      } else {
        throw new Error(error.message || '注册失败，请重试');
      }
    }
  }

  // 🔄 令牌验证
  async validateToken(): Promise<User | null> {
    console.log('🔍 AuthService.validateToken 开始');

    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');

      if (response.success && response.data?.user) {
        const user = response.data.user;
        TokenManager.setUser(user); // 更新用户信息
        console.log('✅ 令牌验证成功');
        return user;
      }

      throw new Error('Token validation failed');
    } catch (error) {
      console.error('❌ 令牌验证失败:', error);
      TokenManager.clearAllTokens(); // 清除无效令牌
      throw error;
    }
  }

  // 🚪 用户登出
  async logout(): Promise<void> {
    console.log('🚪 AuthService.logout 开始');

    try {
      // 调用登出API（通知服务器）
      await apiClient.post('/auth/logout');
      console.log('✅ 登出API调用成功');
    } catch (error) {
      console.warn('⚠️ 登出API调用失败:', error);
      // 即使API调用失败，也要清除本地令牌
    } finally {
      // 清除所有本地令牌和用户信息
      TokenManager.clearAllTokens();
      console.log('✅ 本地认证数据已清除');
    }
  }

  // 🔄 刷新访问令牌（通常由ApiClient自动调用）
  async refreshAccessToken(): Promise<{ token: string; expiresIn: number } | null> {
    console.log('🔄 AuthService.refreshAccessToken 开始');

    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('无刷新令牌');
      }

      const response = await apiClient.post<{
        tokens: {
          token: string;
          expiresIn: number;
        }
      }>('/auth/refresh', {
        grant_type: 'refresh_token'
      });

      if (response.success && response.data?.tokens) {
        const { token, expiresIn } = response.data.tokens;

        TokenManager.setAccessToken(token, expiresIn);
        console.log('✅ 访问令牌刷新成功');

        return { token, expiresIn };
      }

      throw new Error('刷新响应无效');
    } catch (error) {
      console.error('❌ 刷新访问令牌失败:', error);
      return null;
    }
  }

  // ==================== 状态查询方法 ====================

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return TokenManager.getUser();
  }

  /**
   * 获取当前访问令牌
   */
  getCurrentAccessToken(): string | null {
    return TokenManager.getAccessToken();
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return TokenManager.isAuthenticated();
  }

  /**
   * 获取令牌剩余时间
   */
  getTokenRemainingTime(type: 'access' | 'refresh' = 'access'): number {
    return TokenManager.getTokenRemainingTime(type);
  }

  /**
   * 检查访问令牌是否即将过期
   */
  isAccessTokenExpiring(minutes: number = 1): boolean {
    const remainingSeconds = this.getTokenRemainingTime('access');
    return remainingSeconds <= (minutes * 60);
  }

  // ==================== 自动登录相关 ====================

  /**
   * 检查自动登录
   */
  async checkAutoLogin(): Promise<{
    shouldAutoLogin: boolean;
    user?: User;
    error?: string;
  }> {
    console.log('🔍 检查自动登录...');

    try {
      const hasTokens = TokenManager.isAuthenticated();
      if (!hasTokens) {
        console.log('ℹ️ 无有效令牌，跳过自动登录');
        return { shouldAutoLogin: false };
      }

      // 验证令牌有效性
      const user = await this.validateToken();
      if (user) {
        console.log('✅ 自动登录成功');
        return { shouldAutoLogin: true, user };
      }

      return { shouldAutoLogin: false, error: '令牌验证失败' };
    } catch (error: any) {
      console.warn('⚠️ 自动登录检查失败:', error);
      return { shouldAutoLogin: false, error: error.message };
    }
  }

  // ==================== 调试和工具方法 ====================

  /**
   * 获取认证状态详情（调试用）
   */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasAccessToken: !!this.getCurrentAccessToken(),
      hasRefreshToken: !!TokenManager.getRefreshToken(),
      hasUser: !!this.getCurrentUser(),
      accessTokenRemaining: this.getTokenRemainingTime('access'),
      refreshTokenRemaining: this.getTokenRemainingTime('refresh'),
      user: this.getCurrentUser(),
      tokenManagerDebug: TokenManager.getDebugInfo()
    };
  }

  /**
   * 强制清除所有认证数据（调试用）
   */
  forceLogout() {
    console.log('🧹 强制清除所有认证数据');
    TokenManager.clearAllTokens();
  }
}

// 导出单例
export const authService = new AuthService();