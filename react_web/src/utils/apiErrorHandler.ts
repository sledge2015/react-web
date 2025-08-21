// utils/apiErrorHandler.ts - API错误处理和拦截器
import { message } from 'antd';

// 错误类型定义
export interface APIError {
  code: string;
  message: string;
  details?: any;
  status: number;
}

// 错误处理类
export class APIErrorHandler {
  // 通用错误处理
  static handleError(error: any): never {
    console.error('API Error:', error);

    // 网络错误
    if (!navigator.onLine) {
      message.error('网络连接已断开，请检查网络设置');
      throw new Error('网络连接已断开');
    }

    // HTTP状态码错误
    if (error.status) {
      switch (error.status) {
        case 400:
          message.error('请求参数错误');
          break;
        case 401:
          message.error('未授权访问，请重新登录');
          // 这里可以触发重新登录逻辑
          break;
        case 403:
          message.error('权限不足，无法执行此操作');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 429:
          message.error('请求过于频繁，请稍后重试');
          break;
        case 500:
          message.error('服务器内部错误，请稍后重试');
          break;
        case 502:
        case 503:
        case 504:
          message.error('服务器暂时不可用，请稍后重试');
          break;
        default:
          message.error(`请求失败 (${error.status})`);
      }
    } else if (error.message) {
      // 自定义错误消息
      if (!error.message.includes('fetch')) {
        message.error(error.message);
      } else {
        message.error('网络请求失败，请检查网络连接');
      }
    } else {
      message.error('未知错误，请重试');
    }

    throw error;
  }

  // 处理登录错误
  static handleLoginError(error: any): never {
    if (error.message?.includes('用户名') || error.message?.includes('密码')) {
      // 不显示通用错误消息，让组件自己处理
      throw error;
    }

    return this.handleError(error);
  }

  // 处理注册错误
  static handleRegisterError(error: any): never {
    if (error.message?.includes('用户名已存在') ||
        error.message?.includes('邮箱已存在') ||
        error.message?.includes('邀请码')) {
      // 不显示通用错误消息，让组件自己处理
      throw error;
    }

    return this.handleError(error);
  }
}

// 网络状态监控
export class NetworkMonitor {
  private static listeners: Array<(online: boolean) => void> = [];

  static init() {
    window.addEventListener('online', () => {
      message.success('网络连接已恢复');
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      message.warning('网络连接已断开');
      this.notifyListeners(false);
    });
  }

  static addListener(callback: (online: boolean) => void) {
    this.listeners.push(callback);
  }

  static removeListener(callback: (online: boolean) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private static notifyListeners(online: boolean) {
    this.listeners.forEach(callback => callback(online));
  }

  static isOnline(): boolean {
    return navigator.onLine;
  }
}

// 请求重试机制
export class RetryManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒

  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES,
    delay: number = this.RETRY_DELAY
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // 不重试的错误类型
        if (error.status === 401 || error.status === 403 || error.status === 400) {
          throw error;
        }

        // 最后一次尝试失败
        if (i === maxRetries) {
          break;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }

    throw lastError;
  }
}

// 增强的API客户端
export class EnhancedAPIClient {
  private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  private static timeout = 10000; // 10秒超时

  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('stock_app_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private static async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    useRetry: boolean = true
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
    };

    const requestFn = async () => {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: APIError = {
            code: errorData.code || 'HTTP_ERROR',
            message: errorData.message || `HTTP ${response.status}`,
            details: errorData.details,
            status: response.status,
          };
          throw error;
        }

        return response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new Error('请求超时，请重试');
        }

        throw error;
      }
    };

    try {
      if (useRetry) {
        return await RetryManager.withRetry(requestFn);
      } else {
        return await requestFn();
      }
    } catch (error) {
      APIErrorHandler.handleError(error);
    }
  }

  // GET 请求
  static async get(endpoint: string, useRetry: boolean = true) {
    return this.makeRequest(endpoint, { method: 'GET' }, useRetry);
  }

  // POST 请求
  static async post(endpoint: string, data: any, useRetry: boolean = false) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, useRetry);
  }

  // PUT 请求
  static async put(endpoint: string, data: any, useRetry: boolean = false) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, useRetry);
  }

  // DELETE 请求
  static async delete(endpoint: string, useRetry: boolean = false) {
    return this.makeRequest(endpoint, { method: 'DELETE' }, useRetry);
  }

  // 文件上传
  static async upload(endpoint: string, file: File, onProgress?: (progress: number) => void) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            resolve({ success: true });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('POST', `${this.baseURL}${endpoint}`);

      // 添加认证头
      const authHeaders = this.getAuthHeaders();
      Object.entries(authHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.timeout = 60000; // 文件上传60秒超时
      xhr.send(formData);
    });
  }
}

// 请求缓存管理
export class RequestCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  static get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  static clear() {
    this.cache.clear();
  }

  static delete(key: string) {
    this.cache.delete(key);
  }

  // 清理过期缓存
  static cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 在应用启动时初始化
export const initializeAPIUtils = () => {
  NetworkMonitor.init();

  // 定期清理过期缓存
  setInterval(() => {
    RequestCache.cleanup();
  }, 5 * 60 * 1000); // 每5分钟清理一次
};

export default EnhancedAPIClient;