// services/adminService.ts
// 管理员相关的API服务

import { apiClient, ApiResponse } from './api';
import { User } from '../types/auth';

export interface AdminUser extends User {
  isActive: boolean;
  lastLoginIp?: string;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalStocks: number;
  activeStocks: number;
  totalApiCalls: number;
  systemUptime: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  lastBackup: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  updatedAt: string;
  updatedBy: string;
}

class AdminService {
  // 获取所有用户
  async getAllUsers(page: number = 1, limit: number = 20, search?: string): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });

      const response = await apiClient.get<{
        users: AdminUser[];
        total: number;
        page: number;
        limit: number;
      }>(`/admin/users?${params}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取用户列表失败');
    } catch (error) {
      console.error('Get all users failed:', error);
      throw error;
    }
  }

  // 创建用户
  async createUser(userData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminUser> {
    try {
      const response = await apiClient.post<AdminUser>('/admin/users', userData);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '创建用户失败');
    } catch (error) {
      console.error('Create user failed:', error);
      throw error;
    }
  }

  // 更新用户
  async updateUser(userId: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    try {
      const response = await apiClient.put<AdminUser>(`/admin/users/${userId}`, updates);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '更新用户失败');
    } catch (error) {
      console.error('Update user failed:', error);
      throw error;
    }
  }

  // 删除用户
  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/admin/users/${userId}`);

      if (!response.success) {
        throw new Error(response.message || '删除用户失败');
      }
    } catch (error) {
      console.error('Delete user failed:', error);
      throw error;
    }
  }

  // 重置用户密码
  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
    try {
      const response = await apiClient.post<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '重置密码失败');
    } catch (error) {
      console.error('Reset user password failed:', error);
      throw error;
    }
  }

  // 获取系统统计
  async getSystemStats(): Promise<SystemStats> {
    try {
      const response = await apiClient.get<SystemStats>('/admin/stats');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取系统统计失败');
    } catch (error) {
      console.error('Get system stats failed:', error);
      throw error;
    }
  }

  // 获取活动日志
  async getActivityLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: string;
      action?: string;
      level?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    logs: ActivityLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await apiClient.get<{
        logs: ActivityLog[];
        total: number;
        page: number;
        limit: number;
      }>(`/admin/logs?${params}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '获取活动日志失败');
    } catch (error) {
      console.error('Get activity logs failed:', error);
      throw error;
    }
  }

  // 获取系统配置
  async getSystemConfig(): Promise<SystemConfig[]> {
    try {
      const response = await apiClient.get<SystemConfig[]>('/admin/config');

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Get system config failed:', error);
      return [];
    }
  }

  // 更新系统配置
  async updateSystemConfig(configId: string, value: string): Promise<SystemConfig> {
    try {
      const response = await apiClient.put<SystemConfig>(`/admin/config/${configId}`, { value });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '更新系统配置失败');
    } catch (error) {
      console.error('Update system config failed:', error);
      throw error;
    }
  }

  // 执行系统备份
  async performBackup(): Promise<{ backupId: string; filename: string }> {
    try {
      const response = await apiClient.post<{ backupId: string; filename: string }>('/admin/backup');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '系统备份失败');
    } catch (error) {
      console.error('Perform backup failed:', error);
      throw error;
    }
  }

  // 清理系统日志
  async cleanupLogs(daysToKeep: number = 30): Promise<{ deletedCount: number }> {
    try {
      const response = await apiClient.post<{ deletedCount: number }>('/admin/cleanup-logs', { daysToKeep });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || '清理日志失败');
    } catch (error) {
      console.error('Cleanup logs failed:', error);
      throw error;
    }
  }

  // 重启系统服务
  async restartSystem(): Promise<void> {
    try {
      const response = await apiClient.post('/admin/restart');

      if (!response.success) {
        throw new Error(response.message || '重启系统失败');
      }
    } catch (error) {
      console.error('Restart system failed:', error);
      throw error;
    }
  }
}

// 创建管理员服务实例
export const adminService = new AdminService();