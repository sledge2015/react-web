// src/services/api.ts - 统一的API客户端
import TokenManager from '../utils/tokenManager';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type RequestInterceptor = (config: RequestInit & { headers: Record<string, string> }) => RequestInit & { headers: Record<string, string> };
type ResponseInterceptor = (response: any) => any;

// 调试工具类
class ApiDebugger {
  private static isDebugMode = process.env.REACT_APP_DEBUG === 'true';

  static log(message: string, data?: any) {
    if (this.isDebugMode) {
      console.log(`[API Debug] ${message}`, data || '');
    }
  }

  static warn(message: string, data?: any) {
    if (this.isDebugMode) {
      console.warn(`[API Debug] ${message}`, data || '');
    }
  }

  static error(message: string, data?: any) {
    if (this.isDebugMode) {
      console.error(`[API Debug] ${message}`, data || '');
    }
  }

  static group(label: string) {
    if (this.isDebugMode) {
      console.group(`[API Debug] ${label}`);
    }
  }

  static groupEnd() {
    if (this.isDebugMode) {
      console.groupEnd();
    }
  }
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: Array<RequestInterceptor> = [];
  private responseInterceptors: Array<ResponseInterceptor> = [];
  private requestCount = 0;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:8000') {
    this.baseURL = baseURL+"/api/v1";
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };

    ApiDebugger.log('ApiClient initialized', {
      baseURL: this.baseURL,
      environment: process.env.NODE_ENV
    });

    this.setupDefaultInterceptors();
    this.setupTokenRefreshListener();
  }

  private setupDefaultInterceptors() {
    // 🔐 认证拦截器
    this.addRequestInterceptor((config) => {
      const token = TokenManager.getAccessToken();

      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        ApiDebugger.log('✅ 请求已添加认证头');
      } else {
        ApiDebugger.warn('⚠️ 无访问令牌，请求将是未认证的');
      }

      return config;
    });

    // 📥 响应调试拦截器
    this.addResponseInterceptor((response) => {
      ApiDebugger.log('Response intercepted:', {
        success: response.success,
        hasData: !!response.data
      });
      return response;
    });
  }

  private setupTokenRefreshListener() {
    // 🔄 监听令牌即将过期事件，自动刷新
    TokenManager.addEventListener('tokenExpiring', async () => {
      console.log('🔄 访问令牌即将过期，尝试自动刷新...');

      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('无刷新令牌');
        }

        const response = await this.refreshAccessToken(refreshToken);

        if (response.success && response.data) {
          TokenManager.setAccessToken(
            response.data.tokens.token,
            response.data.tokens.expiresIn
          );
          console.log('✅ 访问令牌自动刷新成功');
        } else {
          throw new Error('刷新响应无效');
        }
      } catch (error) {
        console.error('❌ 自动刷新失败:', error);
        TokenManager.clearAllTokens();

        // 触发全局认证过期事件
        window.dispatchEvent(new CustomEvent('auth:expired', {
          detail: { reason: 'refresh_failed', error }
        }));
      }
    });
  }

  // 🔄 刷新访问令牌的API调用
  private async refreshAccessToken(refreshToken: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        },
        body: JSON.stringify({ grant_type: 'refresh_token' })
      });

      if (!response.ok) {
        throw new Error(`刷新失败: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('刷新令牌API调用失败:', error);
      throw error;
    }
  }

  // 拦截器管理
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
    ApiDebugger.log(`Request interceptor added. Total: ${this.requestInterceptors.length}`);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
    ApiDebugger.log(`Response interceptor added. Total: ${this.responseInterceptors.length}`);
  }

  // Headers处理
  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (!headers) return normalized;

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        normalized[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        normalized[key] = value;
      });
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        normalized[key] = value;
      });
    }

    return normalized;
  }

  // 🌐 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const requestId = `req-${++this.requestCount}`;
    const url = `${this.baseURL}${endpoint}`;

    ApiDebugger.group(`API Request ${requestId}`);
    ApiDebugger.log('Request details:', {
      requestId,
      method: options.method || 'GET',
      endpoint
    });

    // 合并headers
    let config: RequestInit & { headers: Record<string, string> } = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...this.normalizeHeaders(options.headers),
      },
    };

    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      try {
        config = interceptor(config);
      } catch (error) {
        ApiDebugger.error('Request interceptor failed:', error);
      }
    }

    try {
      const startTime = performance.now();
      const response = await fetch(url, config);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      ApiDebugger.log('Response received:', {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`
      });

      if (!response.ok) {
        await this.handleHttpError(response, requestId);
      }

      // 解析响应
      let data: ApiResponse<T>;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : { success: true };
      } catch (parseError) {
        ApiDebugger.error('JSON parse error:', parseError);
        data = { success: false, message: 'Invalid response format' };
      }

      // 应用响应拦截器
      for (const interceptor of this.responseInterceptors) {
        try {
          data = interceptor(data);
        } catch (error) {
          ApiDebugger.error('Response interceptor failed:', error);
        }
      }

      ApiDebugger.groupEnd();
      return data;

    } catch (error) {
      ApiDebugger.error(`Request failed (${requestId}):`, error);
      ApiDebugger.groupEnd();

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // ❌ HTTP错误处理
  private async handleHttpError(response: Response, requestId: string): Promise<never> {
    let errorData: any;
    try {
      const text = await response.text();
      errorData = text ? JSON.parse(text) : {};
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const status = response.status;
    let message = errorData.message || errorData.error || `HTTP ${status}: ${response.statusText}`;
    let code = errorData.code || 'HTTP_ERROR';

    // 状态码映射
    const statusMessages: Record<number, { message: string; code: string }> = {
      400: { message: '请求参数错误', code: 'BAD_REQUEST' },
      401: { message: '认证失败，请重新登录', code: 'UNAUTHORIZED' },
      403: { message: '权限不足', code: 'FORBIDDEN' },
      404: { message: '请求的资源不存在', code: 'NOT_FOUND' },
      422: { message: '数据验证失败', code: 'VALIDATION_ERROR' },
      429: { message: '请求过于频繁，请稍后重试', code: 'RATE_LIMITED' },
      500: { message: '服务器内部错误', code: 'INTERNAL_ERROR' },
      502: { message: '网关错误', code: 'BAD_GATEWAY' },
      503: { message: '服务暂时不可用', code: 'SERVICE_UNAVAILABLE' },
    };

    const statusInfo = statusMessages[status];
    if (statusInfo) {
      message = errorData.message || statusInfo.message;
      code = statusInfo.code;
    }

    // 🚨 处理401认证失败
    if (status === 401) {
      this.handleUnauthorized();
    }

    ApiDebugger.error('HTTP Error:', { status, message, code });
    throw new ApiError(message, status, code);
  }

  // 🚨 认证失败处理
  private handleUnauthorized(): void {
    ApiDebugger.warn('Authentication failed - clearing tokens');
    TokenManager.clearAllTokens();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { timestamp: new Date().toISOString(), source: 'ApiClient' }
      }));
    }
  }

  // ==================== HTTP方法 ====================

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: 'POST' };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    return this.request<T>(endpoint, options);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: 'PUT' };
    if (data) {
      options.body = data instanceof FormData ? data : JSON.stringify(data);
    }
    return this.request<T>(endpoint, options);
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: 'PATCH' };
    if (data) {
      options.body = data instanceof FormData ? data : JSON.stringify(data);
    }
    return this.request<T>(endpoint, options);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 📁 文件上传
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.post<T>(endpoint, formData);
  }

  // 🏥 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/');
      return response.success;
    } catch (error) {
      ApiDebugger.error('Health check failed:', error);
      return false;
    }
  }

  // ⚙️ 获取配置信息
  getConfig() {
    return {
      baseURL: this.baseURL,
      hasAccessToken: !!TokenManager.getAccessToken(),
      hasRefreshToken: !!TokenManager.getRefreshToken(),
      debugMode: process.env.REACT_APP_DEBUG === 'true',
      environment: process.env.NODE_ENV,
      tokenDebug: TokenManager.getDebugInfo()
    };
  }
}

// 导出单例
export const apiClient = new ApiClient();

// 全局错误处理
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', (event) => {
    console.warn('🚨 全局认证失败事件:', (event as CustomEvent).detail);
  });

  window.addEventListener('auth:expired', (event) => {
    console.warn('🚨 认证过期事件:', (event as CustomEvent).detail);
  });
}

// 初始化检查
apiClient.healthCheck().then(isHealthy => {
  console.log(`🏥 API健康检查: ${isHealthy ? '✅ 正常' : '❌ 异常'}`);
}).catch(() => {
  console.warn('⚠️ 健康检查请求失败');
});

export { ApiDebugger };