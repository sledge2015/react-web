// src/types/admin.ts
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalStocks: number;
  systemUptime: string;
  lastBackup: string;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

export interface UserActivity {
  id: string;
  username: string;
  action: string;
  timestamp: string;
  details?: string;
  level: 'info' | 'warning' | 'error';
}

export interface AdminSettings {
  refreshInterval: number;
  autoRefresh: boolean;
  enableTwoFactor: boolean;
  logUserActivity: boolean;
  sessionTimeout: number;
}