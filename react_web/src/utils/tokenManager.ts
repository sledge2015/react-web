// src/utils/tokenManager.ts - 独立的Token管理器
export interface TokenInfo {
  token: string;
  expiresIn?: number;
  refreshToken?: string;
  tokenType?: string;
  issuedAt: number;
}

export type TokenEventType = 'tokenSet' | 'tokenRemoved' | 'tokenExpiring' | 'tokenExpired';

class TokenManager {
  // 配置常量
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly ACCESS_EXPIRES_KEY = 'access_expiresIn';
  private static readonly REFRESH_TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_EXPIRES_KEY = 'auth_expiresIn';
  private static readonly USER_KEY = 'app_user';

  // 事件系统
  private static listeners: Map<TokenEventType, Function[]> = new Map();

  // 定时器
  private static refreshTimer: NodeJS.Timeout | null = null;

  // ==================== 核心Token管理 ====================

  /**
   * 设置访问令牌 (1分钟有效期)
   */
  static setAccessToken(token: string, expiresIn: number): boolean {
    try {
      console.log('🔑 设置访问令牌:', { tokenLength: token.length, expiresIn });

      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
      localStorage.setItem(this.ACCESS_EXPIRES_KEY, expiresIn.toString());

      // 设置自动刷新定时器 (提前10秒刷新)
      this.setupRefreshTimer(Math.max(expiresIn - 10, 5));

      this.emitEvent('tokenSet', { type: 'access', token, expiresIn });

      console.log('✅ 访问令牌设置成功');
      return true;
    } catch (error) {
      console.error('❌ 设置访问令牌失败:', error);
      return false;
    }
  }

  /**
   * 设置刷新令牌 (7天有效期)
   */
  static setRefreshToken(token: string, expiresIn: number): boolean {
    try {
      console.log('🔑 设置刷新令牌:', { tokenLength: token.length, expiresIn });

      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
      localStorage.setItem(this.REFRESH_EXPIRES_KEY, expiresIn.toString());

      console.log('✅ 刷新令牌设置成功');
      return true;
    } catch (error) {
      console.error('❌ 设置刷新令牌失败:', error);
      return false;
    }
  }

  /**
   * 获取访问令牌
   */
  static getAccessToken(): string | null {
    try {
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const expiresIn = localStorage.getItem(this.ACCESS_EXPIRES_KEY);

      if (!token || !expiresIn) return null;

      // 检查是否过期
      if (this.isTokenExpired('access')) {
        console.log('⚠️ 访问令牌已过期');
        this.clearAccessToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('❌ 获取访问令牌失败:', error);
      return null;
    }
  }

  /**
   * 获取刷新令牌
   */
  static getRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const expiresIn = localStorage.getItem(this.REFRESH_EXPIRES_KEY);

      if (!token || !expiresIn) return null;

      // 检查是否过期
      if (this.isTokenExpired('refresh')) {
        console.log('⚠️ 刷新令牌已过期');
        this.clearAllTokens();
        return null;
      }

      return token;
    } catch (error) {
      console.error('❌ 获取刷新令牌失败:', error);
      return null;
    }
  }

  /**
   * 检查令牌是否过期
   */
  private static isTokenExpired(type: 'access' | 'refresh'): boolean {
    try {
      const key = type === 'access' ? this.ACCESS_EXPIRES_KEY : this.REFRESH_EXPIRES_KEY;
      const expiresIn = localStorage.getItem(key);

      if (!expiresIn) return true;

      const expirationTime = parseInt(expiresIn) * 1000; // 转换为毫秒
      return Date.now() >= expirationTime;
    } catch {
      return true;
    }
  }

  /**
   * 清除访问令牌
   */
  static clearAccessToken(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.ACCESS_EXPIRES_KEY);
      this.clearRefreshTimer();

      console.log('🗑️ 访问令牌已清除');
      this.emitEvent('tokenRemoved', { type: 'access' });
    } catch (error) {
      console.error('❌ 清除访问令牌失败:', error);
    }
  }

  /**
   * 清除所有令牌
   */
  static clearAllTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.ACCESS_EXPIRES_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_EXPIRES_KEY);
      localStorage.removeItem(this.USER_KEY);

      // 清理其他可能的token keys (兼容性)
      localStorage.removeItem('stock_app_token');
      localStorage.removeItem('stock_app_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');

      this.clearRefreshTimer();

      console.log('🗑️ 所有令牌已清除');
      this.emitEvent('tokenRemoved', { type: 'all' });
    } catch (error) {
      console.error('❌ 清除令牌失败:', error);
    }
  }

  // ==================== 用户信息管理 ====================

  /**
   * 设置用户信息
   */
  static setUser(user: any): boolean {
    try {
      const userJson = JSON.stringify(user);
      localStorage.setItem(this.USER_KEY, userJson);

      // 兼容性存储
      localStorage.setItem('stock_app_user', userJson);

      console.log('👤 用户信息已保存');
      return true;
    } catch (error) {
      console.error('❌ 保存用户信息失败:', error);
      return false;
    }
  }

  /**
   * 获取用户信息
   */
  static getUser(): any {
    try {
      const userData = localStorage.getItem(this.USER_KEY) ||
                      localStorage.getItem('stock_app_user');

      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ 获取用户信息失败:', error);
      return null;
    }
  }

  // ==================== 自动刷新机制 ====================

  /**
   * 设置自动刷新定时器
   */
  private static setupRefreshTimer(delaySeconds: number): void {
    this.clearRefreshTimer();

    this.refreshTimer = setTimeout(() => {
      console.log('⏰ 访问令牌即将过期，触发刷新事件');
      this.emitEvent('tokenExpiring');
    }, delaySeconds * 1000);

    console.log(`⏰ 刷新定时器已设置: ${delaySeconds}秒后执行`);
  }

  /**
   * 清除刷新定时器
   */
  private static clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ==================== 事件系统 ====================

  /**
   * 添加事件监听器
   */
  static addEventListener(event: TokenEventType, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    console.log(`📡 添加事件监听器: ${event}`);
  }

  /**
   * 移除事件监听器
   */
  static removeEventListener(event: TokenEventType, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`📡 移除事件监听器: ${event}`);
      }
    }
  }

  /**
   * 触发事件
   */
  private static emitEvent(event: TokenEventType, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ 事件回调执行失败 [${event}]:`, error);
        }
      });
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 检查是否已认证
   */
  static isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser();
  }

  /**
   * 获取令牌剩余时间
   */
  static getTokenRemainingTime(type: 'access' | 'refresh' = 'access'): number {
    try {
      const key = type === 'access' ? this.ACCESS_EXPIRES_KEY : this.REFRESH_EXPIRES_KEY;
      const expiresIn = localStorage.getItem(key);

      if (!expiresIn) return 0;

      const expirationTime = parseInt(expiresIn) * 1000;
      const remainingTime = Math.max(0, expirationTime - Date.now());

      return Math.floor(remainingTime / 1000); // 返回秒数
    } catch {
      return 0;
    }
  }

  /**
   * 获取调试信息
   */
  static getDebugInfo() {
    return {
      hasAccessToken: !!this.getAccessToken(),
      hasRefreshToken: !!this.getRefreshToken(),
      hasUser: !!this.getUser(),
      accessTokenRemaining: this.getTokenRemainingTime('access'),
      refreshTokenRemaining: this.getTokenRemainingTime('refresh'),
      listeners: Array.from(this.listeners.entries()).map(([event, callbacks]) => ({
        event,
        callbackCount: callbacks.length
      })),
      storage: {
        access_token: !!localStorage.getItem(this.ACCESS_TOKEN_KEY),
        auth_token: !!localStorage.getItem(this.REFRESH_TOKEN_KEY),
        user: !!localStorage.getItem(this.USER_KEY)
      }
    };
  }
}

export default TokenManager;