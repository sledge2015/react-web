// App.tsx - 完整版本包含API初始化
import React, { useState, useEffect } from 'react';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AdminPanel from './pages/Dashboard';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { initializeAPIUtils } from './utils/apiErrorHandler';
import 'antd/dist/reset.css';
import './App.css';

// 认证相关的页面组件
const AuthPages: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {isLogin ? (
        <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
};

// 应用的主要内容组件
const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // 显示加载状态
  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📈</div>
          <Spin size="large" />
          <div style={{ marginTop: '20px', color: '#666' }}>
            正在初始化系统...
          </div>
        </div>
      </div>
    );
  }

  // 如果用户已登录，显示主应用
  if (user) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        overflow: 'auto'
      }}>
        <AdminPanel />
      </div>
    );
  }

  // 如果用户未登录，显示登录/注册表单
  return <AuthPages />;
};

// 主应用组件
const App: React.FC = () => {
  const [initialized, setInitialized] = useState(false);

  // 应用初始化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 初始化应用...');

        // 初始化API工具
        initializeAPIUtils();

        // 检查环境配置
        const apiUrl = process.env.REACT_APP_API_URL;
        if (!apiUrl) {
          console.warn('⚠️ 未配置 REACT_APP_API_URL 环境变量，使用默认值');
        } else {
          console.log('🔗 API地址:', apiUrl);
        }

        // 检查网络连接
        if (!navigator.onLine) {
          console.warn('⚠️ 当前无网络连接');
        }

        // 模拟一些初始化延迟（可选）
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ 应用初始化完成');
      } catch (error) {
        console.error('❌ 应用初始化失败:', error);
      } finally {
        setInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // 如果应用还未初始化完成，显示启动画面
  if (!initialized) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '60px 40px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📈
          </div>
          <h1 style={{
            margin: '0 0 16px 0',
            color: '#1f2937',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            美股投资管理系统
          </h1>
          <div style={{ color: '#6b7280', marginBottom: '24px' }}>
            正在启动应用，请稍候...
          </div>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <div className="App" style={{
          width: '100%',
          height: '100vh',
          margin: 0,
          padding: 0,
          overflow: 'hidden'
        }}>
          <AppContent />
        </div>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;