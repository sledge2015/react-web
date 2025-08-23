// src/services/adminAPI.ts
import { User } from '../types/auth';
import { SystemStats, UserActivity, AdminSettings } from '../types/admin';

class AdminAPI {
  private baseURL = '/api/admin';

  async getSystemStats(): Promise<SystemStats> {
    try {
      const response = await fetch(`${this.baseURL}/stats`);
      if (!response.ok) throw new Error('获取系统统计失败');
      return await response.json();
    } catch (error) {
      console.error('获取系统统计失败:', error);
      // 返回模拟数据作为后备
      return {
        totalUsers: 156,
        activeUsers: 89,
        totalStocks: 2341,
        systemUptime: '15天 7小时',
        lastBackup: '2小时前',
        memoryUsage: 68,
        cpuUsage: 45,
        diskUsage: 72,
      };
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${this.baseURL}/users`);
      if (!response.ok) throw new Error('获取用户列表失败');
      return await response.json();
    } catch (error) {
      console.error('获取用户列表失败:', error);
      // 返回模拟数据作为后备
      return [
        {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@stockmanager.com',
          role: 'admin',
          avatar: '👨‍💼',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLogin: '2025-08-20T06:30:00.000Z',
          isActive: true,
        },
        {
          id: 'user-001',
          username: 'demo',
          email: 'demo@stockmanager.com',
          role: 'user',
          avatar: '👤',
          createdAt: '2024-01-15T00:00:00.000Z',
          lastLogin: '2025-08-19T14:22:00.000Z',
          isActive: true,
        },
      ];
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('删除用户失败');
  }

  async resetPassword(userId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/users/${userId}/reset-password`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('重置密码失败');
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const response = await fetch(`${this.baseURL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('创建用户失败');
    return await response.json();
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await fetch(`${this.baseURL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('更新用户失败');
    return await response.json();
  }

  async getActivities(filters?: {
    user?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<UserActivity[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }

      const response = await fetch(`${this.baseURL}/activities?${queryParams}`);
      if (!response.ok) throw new Error('获取活动日志失败');
      return await response.json();
    } catch (error) {
      console.error('获取活动日志失败:', error);
      // 返回模拟数据作为后备
      return [
        {
          id: '1',
          username: 'demo',
          action: '登录系统',
          timestamp: '2025-08-20T06:30:00.000Z',
          details: 'IP: 192.168.1.100',
          level: 'info',
        },
        {
          id: '2',
          username: 'investor',
          action: '添加股票',
          timestamp: '2025-08-20T06:25:00.000Z',
          details: '股票代码: AAPL',
          level: 'info',
        },
      ];
    }
  }

  async updateSettings(settings: Partial<AdminSettings>): Promise<void> {
    const response = await fetch(`${this.baseURL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('更新设置失败');
  }

  async backupSystem(): Promise<void> {
    const response = await fetch(`${this.baseURL}/backup`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('系统备份失败');
  }

  async cleanLogs(): Promise<void> {
    const response = await fetch(`${this.baseURL}/logs/clean`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('清理日志失败');
  }

  async restartSystem(): Promise<void> {
    const response = await fetch(`${this.baseURL}/restart`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('重启系统失败');
  }
}

export const adminAPI = new AdminAPI();