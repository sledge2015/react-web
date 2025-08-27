// src/services/api.ts - 整理后的API客户端
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

  static table(data: any) {
    if (this.isDebugMode) {
      console.table(data);
    }
  }
}

//解析token
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}


// 令牌管理器
class TokenManager {
  //auth_token和auth_expiresIn刷新令牌属于权限默认周期7天，其中auth_expiresIn有效时间秒，access_token和access_expiresIn访问令牌有效期1分钟，
  private static readonly TOKEN_KEYS = ['auth_token', 'auth_expiresIn','access_token','access_expiresIn'];

  static getToken(key: string = 'auth_token'): { token: string | null, expiresIn: string | null } {
    try {
      let token: string | null = null;
      let expiresIn: string | null = null;

      if (key === 'auth_token') {
        token = localStorage.getItem('auth_token');
        expiresIn = localStorage.getItem('auth_expiresIn');
      } else if (key === 'access_token') {
        token = localStorage.getItem('access_token');
        expiresIn = localStorage.getItem('access_expiresIn');
      }

      if (token && expiresIn) {
        ApiDebugger.log(`Token found with key: ${key}`);
      }

      return { token, expiresIn };
    } catch (error) {
      ApiDebugger.error('Failed to get token:', error);
      return { token: null, expiresIn: null };
    }
  }

  private static setToken(token: string, key: string = 'auth_token'): void {
    try {
      localStorage.setItem('access_token', token);
      ApiDebugger.log(`Token set with key: ${key}`);
    } catch (error) {
      ApiDebugger.error('Failed to set access token:', error);
    }
  }

  static setAccessToken(token: string, expiresin:number): void {
    try {
      this.setToken(token,'access_token');
      this.setToken(expiresin.toString(),'access_expiresIn');
      ApiDebugger.log(`access_expiresIn set with time: ${expiresin}`);
    } catch (error) {
      ApiDebugger.error('Failed to set access token:', error);
    }
  }
  
  static setAuthToken(token: string, expiresin:number): void {
    try {
      this.setToken(token,'auth_token');
      this.setToken(expiresin.toString(),'access_expiresIn');
    } catch (error) {
      ApiDebugger.error('Failed to set access token:', error);
    }
  }

  static clearTokens(allremove: boolean = false): void {
    try {
      const keysToRemove = this.TOKEN_KEYS;
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key) && allremove) {
          localStorage.removeItem(key);
          ApiDebugger.log(`Removed key: ${key}`);
        }else {
          //access_token清除和全部清除这两种情况
          localStorage.removeItem('access_token');
          localStorage.removeItem('access_expiresIn');
          ApiDebugger.log(`Removed key access_token`);
        }
      });
    } catch (error) {
      ApiDebugger.error('Failed to clear auth tokens:', error);
    }
  }

  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string' || token.length < 10) {
      return false;
    }
    return true;
  }

  //前端权限调试函数
  static diagnoseAuth() {
    ApiDebugger.group('Authentication Diagnosis');

    const diagnosis = {
      localStorage: {
        available: typeof localStorage !== 'undefined',
        itemCount: this.getStorageKeys().length,
      },
      tokens: {} as Record<string, any>,
      recommendations: [] as string[]
    };

    // 检查所有可能的token keys
    this.TOKEN_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      diagnosis.tokens[key] = {
        exists: !!value,
        length: value?.length || 0,
        isValid: value ? this.validateTokenFormat(value) : false
      };
    });

    // 生成建议
    const hasValidTokens = Object.values(diagnosis.tokens).some((token: any) => token.exists && token.isValid);
    if (!hasValidTokens) {
      diagnosis.recommendations.push('No valid authentication tokens found. User needs to log in.');
    }

    ApiDebugger.table(diagnosis.tokens);
    ApiDebugger.log('Full diagnosis:', diagnosis);
    ApiDebugger.groupEnd();

    return diagnosis;
  }

  private static getStorageKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: Array<RequestInterceptor> = [];
  private responseInterceptors: Array<ResponseInterceptor> = [];
  private requestCount = 0;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:8000/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };

    ApiDebugger.log('ApiClient initialized', {
      baseURL: this.baseURL,
      environment: process.env.NODE_ENV,
      debugMode: process.env.REACT_APP_DEBUG
    });

    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors() {
    // 添加认证拦截器
    this.addRequestInterceptor((config) => {
      const token = TokenManager.getToken();

      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        ApiDebugger.log('Authorization header added');
      } else {
        ApiDebugger.warn('No token available - request will be unauthenticated');
      }

      return config;
    });

    // 添加响应调试拦截器
    this.addResponseInterceptor((response) => {
      ApiDebugger.log('Response intercepted:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
        error: response.error
      });
      return response;
    });
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

  // 令牌管理
  setAuthToken(token: string, expiresin:number): void {
    TokenManager.setAuthToken(token,expiresin);
  }

  setAccessToken(token: string, expiresin:number): void {
    TokenManager.setAccessToken(token, expiresin);
  }

  clearAuthToken(allremove: boolean = false): void {
    TokenManager.clearTokens(allremove);
  }

  getToken(token: string): { token: string | null, expiresIn: string | null } {
    return  TokenManager.getToken(token);
  }

  // bufferSeconds是即将过期前就刷新，比如提前 10 秒
  isTokenExpired(token: string, bufferSeconds = 0): boolean {
    try {
      const payload = parseJwt(token);
      if (!payload || !payload.exp) return true;
      const now = Math.floor(Date.now() / 1000);
      return now >= (payload.exp - bufferSeconds);
    } catch {
      return true;
    }
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

  // 通用请求方法
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
      endpoint,
      fullUrl: url
    });

    // 合并并标准化headers
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

  // HTTP错误处理
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

    // 根据状态码提供友好的错误信息
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

    // 处理认证失败
    if (status === 401) {
      this.handleUnauthorized();
    }

    ApiDebugger.error('HTTP Error:', { status, message, code });
    throw new ApiError(message, status, code);
  }

  // 认证失败处理
  private handleUnauthorized(): void {
    ApiDebugger.warn('Authentication failed - clearing tokens');
    this.clearAuthToken();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { timestamp: new Date().toISOString(), source: 'ApiClient' }
      }));
    }
  }

  // HTTP方法
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

    ApiDebugger.log('GET request', { endpoint, params, finalUrl: url });
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: 'POST' };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
        ApiDebugger.log('POST with FormData', { endpoint });
      } else {
        options.body = JSON.stringify(data);
        ApiDebugger.log('POST with JSON', { endpoint });
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
    ApiDebugger.log('DELETE request', { endpoint });
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 文件上传
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    ApiDebugger.log('File upload', {
      endpoint,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    return this.post<T>(endpoint, formData);
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      ApiDebugger.log('Performing health check...');
      const response = await this.get('/health');
      const isHealthy = response.success;
      ApiDebugger.log('Health check result:', { healthy: isHealthy });
      return isHealthy;
    } catch (error) {
      ApiDebugger.error('Health check failed:', error);
      return false;
    }
  }

  // 获取配置信息
  getConfig() {
    const config = {
      baseURL: this.baseURL,
      defaultHeaders: { ...this.defaultHeaders },
      hasToken: !!TokenManager.getToken(),
      debugMode: process.env.REACT_APP_DEBUG === 'true',
      environment: process.env.NODE_ENV,
      interceptorCounts: {
        request: this.requestInterceptors.length,
        response: this.responseInterceptors.length
      }
    };

    ApiDebugger.log('Current API configuration:', config);
    return config;
  }

  // 诊断认证状态
  diagnoseAuth() {
    return TokenManager.diagnoseAuth();
  }
}

// 导出单例
export const apiClient = new ApiClient();

// 导出工厂函数
export function createApiClient(baseURL?: string): ApiClient {
  return new ApiClient(baseURL);
}

// 全局错误处理
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', (event) => {
    ApiDebugger.warn('Global auth failure event received', (event as CustomEvent).detail);
  });
}

// 初始化检查
apiClient.healthCheck().then(isHealthy => {
  ApiDebugger.log(`API Health Check: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);

  if (isHealthy || process.env.REACT_APP_DEBUG === 'true') {
    const config = apiClient.getConfig();
    ApiDebugger.log('API Configuration:', config);

    if (process.env.REACT_APP_DEBUG === 'true') {
      apiClient.diagnoseAuth();
    }
  }
}).catch(() => {
  ApiDebugger.warn('Health check request failed - API might be unavailable');
});

// 导出调试工具
export { ApiDebugger };