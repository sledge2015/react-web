// src/services/api.ts - 增强版本
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

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: Array<(config: RequestInit) => RequestInit> = [];
  private responseInterceptors: Array<(response: any) => any> = [];

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:8000/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // 添加默认的请求拦截器
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
      return config;
    });
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit): void {
    this.requestInterceptors.push(interceptor);
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors.push(interceptor);
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // 应用请求拦截器
    let config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    console.log('🌍 API Request:', {
      url,
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body
    });

    try {
      const response = await fetch(url, config);

      console.log('📥 API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // 处理HTTP错误状态
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      // 解析响应数据
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('Failed to parse response as JSON:', parseError);
        data = { success: false, message: 'Invalid response format' };
      }

      // 应用响应拦截器
      for (const interceptor of this.responseInterceptors) {
        data = interceptor(data);
      }

      console.log('✅ Parsed Response:', data);
      return data;

    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);

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

  // 处理HTTP错误
  private async handleHttpError(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const status = response.status;
    let message = errorData.message || `HTTP ${status}: ${response.statusText}`;
    let code = errorData.code || 'HTTP_ERROR';

    // 根据状态码提供更友好的错误信息
    switch (status) {
      case 400:
        message = '请求参数错误';
        code = 'BAD_REQUEST';
        break;
      case 401:
        message = '认证失败，请重新登录';
        code = 'UNAUTHORIZED';
        // 自动处理认证失败
        this.handleUnauthorized();
        break;
      case 403:
        message = '权限不足';
        code = 'FORBIDDEN';
        break;
      case 404:
        message = '请求的资源不存在';
        code = 'NOT_FOUND';
        break;
      case 429:
        message = '请求过于频繁，请稍后重试';
        code = 'RATE_LIMITED';
        break;
      case 500:
        message = '服务器内部错误';
        code = 'INTERNAL_ERROR';
        break;
    }

    throw new ApiError(message, status, code);
  }

  // 处理认证失败
  private handleUnauthorized(): void {
    // 清除认证信息
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    // 可以在这里触发全局状态更新或页面跳转
    // 例如：window.location.href = '/login';
  }

  // GET请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // PATCH请求
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

// 导出单例
export const apiClient = new ApiClient();

// 初始化时检查API连接
apiClient.healthCheck().then(isHealthy => {
  console.log(`🏥 API Health Check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
});