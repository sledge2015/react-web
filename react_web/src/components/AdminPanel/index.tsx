// components/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types/auth';
import './AdminPanel.css';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalStocks: number;
  systemUptime: string;
  lastBackup: string;
}

interface UserActivity {
  id: string;
  username: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// 通知Toast组件
const Toast: React.FC<{ notification: ToastNotification; onClose: (id: string) => void }> = ({
  notification,
  onClose
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  return (
    <div className={`toast toast-${notification.type}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{notification.message}</span>
      <button className="toast-close" onClick={() => onClose(notification.id)}>
        ×
      </button>
    </div>
  );
};
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <h3 className={`confirm-title ${type}`}>{title}</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`confirm-submit ${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'logs'>('overview');
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 156,
    activeUsers: 89,
    totalStocks: 2341,
    systemUptime: '15 天 7 小时',
    lastBackup: '2 小时前',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 通知状态
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // 添加通知
  const addNotification = (type: ToastNotification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
  };

  // 移除通知
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 模拟获取用户列表
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockUsers: User[] = [
        {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@stockmanager.com',
          role: 'admin',
          avatar: '👨‍💼',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLogin: '2025-08-20T06:30:00.000Z',
          isActive: true, // ✅ 添加缺失的isActive属性
        },
        {
          id: 'user-001',
          username: 'demo',
          email: 'demo@stockmanager.com',
          role: 'user',
          avatar: '👤',
          createdAt: '2024-01-15T00:00:00.000Z',
          lastLogin: '2025-08-19T14:22:00.000Z',
          isActive: true, // ✅ 添加缺失的isActive属性
        },
        {
          id: 'user-002',
          username: 'investor',
          email: 'investor@stockmanager.com',
          role: 'user',
          avatar: '📈',
          createdAt: '2024-02-01T00:00:00.000Z',
          lastLogin: '2025-08-20T05:15:00.000Z',
          isActive: true, // ✅ 添加缺失的isActive属性
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 模拟获取用户活动日志
  const fetchActivities = async () => {
    const mockActivities: UserActivity[] = [
      {
        id: '1',
        username: 'demo',
        action: '登录系统',
        timestamp: '2025-08-20T06:30:00.000Z',
        details: 'IP: 192.168.1.100',
      },
      {
        id: '2',
        username: 'investor',
        action: '添加股票',
        timestamp: '2025-08-20T06:25:00.000Z',
        details: '股票代码: AAPL',
      },
      {
        id: '3',
        username: 'demo',
        action: '删除股票',
        timestamp: '2025-08-20T06:20:00.000Z',
        details: '股票代码: TSLA',
      },
      {
        id: '4',
        username: 'admin',
        action: '系统配置更新',
        timestamp: '2025-08-20T06:15:00.000Z',
        details: '更新刷新间隔设置',
      },
      {
        id: '5',
        username: 'investor',
        action: '导出数据',
        timestamp: '2025-08-20T06:10:00.000Z',
        details: '导出投资组合数据',
      },
    ];
    setActivities(mockActivities);
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 删除用户
  const deleteUser = async (userId: string) => {
    if (!hasPermission('user.delete')) {
      addNotification('error', '权限不足：您没有删除用户的权限');
      return;
    }

    const userToDelete = users.find(u => u.id === userId);
    setConfirmDialog({
      isOpen: true,
      title: '删除用户',
      message: `确定要删除用户 "${userToDelete?.username}" 吗？此操作不可撤销。`,
      type: 'danger',
      confirmText: '删除',
      onConfirm: () => {
        setUsers(users.filter(u => u.id !== userId));
        addNotification('success', `用户 "${userToDelete?.username}" 已成功删除`);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // 重置用户密码
  const resetPassword = async (userId: string) => {
    if (!hasPermission('user.update')) {
      addNotification('error', '权限不足：您没有重置密码的权限');
      return;
    }

    const userToReset = users.find(u => u.id === userId);
    setConfirmDialog({
      isOpen: true,
      title: '重置密码',
      message: `确定要重置用户 "${userToReset?.username}" 的密码吗？新密码将发送到用户邮箱。`,
      type: 'warning',
      confirmText: '重置',
      onConfirm: () => {
        addNotification('success', `用户 "${userToReset?.username}" 的密码已重置，新密码已发送到邮箱`);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  useEffect(() => {
    if (hasPermission('user.read')) {
      fetchUsers();
    }
    fetchActivities();
  }, []);

  if (!hasPermission('system.config')) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>访问被拒绝</h2>
          <p>您没有权限访问管理员面板</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>管理员控制台</h1>
        <p>欢迎回来，{user?.username}！</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          系统概览
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          disabled={!hasPermission('user.read')}
        >
          用户管理
        </button>
        <button
          className={`tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          系统设置
        </button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
          disabled={!hasPermission('system.logs')}
        >
          活动日志
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>系统统计</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>总用户数</h3>
                  <p className="stat-number">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🟢</div>
                <div className="stat-info">
                  <h3>活跃用户</h3>
                  <p className="stat-number">{stats.activeUsers}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <h3>监控股票</h3>
                  <p className="stat-number">{stats.totalStocks}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <h3>系统运行时间</h3>
                  <p className="stat-text">{stats.systemUptime}</p>
                </div>
              </div>
            </div>

            <div className="recent-activities">
              <h3>最近活动</h3>
              <div className="activity-list">
                {activities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-user">{activity.username}</div>
                    <div className="activity-action">{activity.action}</div>
                    <div className="activity-time">{formatTime(activity.timestamp)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && hasPermission('user.read') && (
          <div className="users-section">
            <div className="section-header">
              <h2>用户管理</h2>
              {hasPermission('user.create') && (
                <button className="add-user-btn">添加用户</button>
              )}
            </div>

            {isLoading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th>邮箱</th>
                      <th>角色</th>
                      <th>注册时间</th>
                      <th>最后登录</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-info">
                            <span className="user-avatar">{user.avatar}</span>
                            <span className="user-name">{user.username}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td>{formatTime(user.createdAt)}</td>
                        <td>{user.lastLogin ? formatTime(user.lastLogin) : '从未登录'}</td>
                        <td>
                          <div className="user-actions">
                            {hasPermission('user.update') && (
                              <button
                                className="reset-btn"
                                onClick={() => resetPassword(user.id)}
                              >
                                重置密码
                              </button>
                            )}
                            {hasPermission('user.delete') && user.role !== 'admin' && (
                              <button
                                className="delete-btn"
                                onClick={() => deleteUser(user.id)}
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="system-section">
            <h2>系统设置</h2>
            <div className="settings-grid">
              <div className="setting-group">
                <h3>数据刷新</h3>
                <label>
                  刷新间隔 (秒):
                  <input type="number" defaultValue="30" min="10" max="300" />
                </label>
                <button className="save-btn">保存</button>
              </div>

              <div className="setting-group">
                <h3>系统维护</h3>
                <button className="maintenance-btn">立即备份</button>
                <button className="maintenance-btn">清理日志</button>
                <button className="maintenance-btn danger">重启系统</button>
              </div>

              <div className="setting-group">
                <h3>安全设置</h3>
                <label>
                  <input type="checkbox" defaultChecked />
                  启用双因素认证
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  记录用户活动
                </label>
                <label>
                  会话超时 (分钟):
                  <input type="number" defaultValue="60" min="15" max="480" />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && hasPermission('system.logs') && (
          <div className="logs-section">
            <h2>活动日志</h2>
            <div className="logs-filters">
              <select defaultValue="">
                <option value="">所有用户</option>
                <option value="admin">管理员</option>
                <option value="user">普通用户</option>
              </select>
              <select defaultValue="">
                <option value="">所有操作</option>
                <option value="login">登录</option>
                <option value="stock">股票操作</option>
                <option value="system">系统操作</option>
              </select>
              <input type="date" />
            </div>

            <div className="logs-table">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>用户</th>
                    <th>操作</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(activity => (
                    <tr key={activity.id}>
                      <td>{formatTime(activity.timestamp)}</td>
                      <td>{activity.username}</td>
                      <td>{activity.action}</td>
                      <td>{activity.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />

      {/* 通知Toast */}
      <div className="toast-container">
        {notifications.map(notification => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};