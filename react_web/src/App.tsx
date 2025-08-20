// App.tsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Dashboard } from './pages/Dashboard';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import './App.css';

// 主应用内容组件
const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth(); // 现在 user 属性可用了
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  // 如果用户已登录，显示主应用
  if (user) {
    return <Dashboard />;
  }

  // 如果用户未登录，显示登录/注册表单
  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <h1>美股投资管理系统</h1>
          <p>欢迎使用专业的美股投资分析平台</p>
        </div>
        
        <div className="auth-tabs">
          <button 
            className={`tab ${isLoginMode ? 'active' : ''}`}
            onClick={() => setIsLoginMode(true)}
          >
            登录
          </button>
          <button 
            className={`tab ${!isLoginMode ? 'active' : ''}`}
            onClick={() => setIsLoginMode(false)}
          >
            注册
          </button>
        </div>

        <div className="auth-form-container">
          {isLoginMode ? (
            <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

// 主App组件
const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;