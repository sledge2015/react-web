// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Portfolio from './pages/Portfolio';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
import TokenManager from './utils/tokenManager';

//测试接口
import { initDevTools } from './test/dev-tools';
initDevTools();

// 🔐 受保护的路由组件
interface ProtectedRouteProps {
  children: React.ReactNode;
  path?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, path }) => {
  const { user, isLoading, refreshAuthState } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);

  // 🔍 增强的认证检查
  const hasUser = !!user;
  const hasStoredAuth = TokenManager.isAuthenticated();
  const hasStoredUser = !!TokenManager.getUser();
  const currentPath = path || location.pathname;

  console.log('🔒 ProtectedRoute 检查:', {
    hasUser,
    isLoading,
    hasStoredAuth,
    hasStoredUser,
    isChecking,
    path: currentPath
  });

  // 🔄 处理状态不同步的情况
  useEffect(() => {
    // 如果 useAuth 状态还没更新，但 TokenManager 中有有效数据
    if (!hasUser && !isLoading && hasStoredAuth && hasStoredUser && !isChecking) {
      console.log('🔄 检测到状态不同步，尝试刷新认证状态...');
      setIsChecking(true);

      // 尝试刷新认证状态
      refreshAuthState().finally(() => {
        setIsChecking(false);
      });
    }
  }, [hasUser, isLoading, hasStoredAuth, hasStoredUser, isChecking, refreshAuthState]);

  // 如果正在加载或检查状态，显示加载状态
  if (isLoading || isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px'
      }}>
        {isLoading ? '加载中...' : '同步登录状态...'}
      </div>
    );
  }

  // 🔒 最终的认证检查
  const isAuthenticated = hasUser || (hasStoredAuth && hasStoredUser);

  if (!isAuthenticated) {
    console.log('🚫 未登录，重定向到登录页');
    return <Navigate
      to="/login"
      state={{ from: { pathname: currentPath } }}
      replace
    />;
  }

  // ✅ 认证通过，渲染子组件
  console.log('✅ 认证通过，渲染受保护的内容');
  return <>{children}</>;
};

// 🌐 公开路由组件（已登录用户不应该访问）
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  console.log('🌐 PublicRoute 检查:', { hasUser: !!user, isLoading });

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在初始化...</p>
      </div>
    );
  }

  // 已登录用户访问登录/注册页时重定向到仪表板
  if (user) {
    console.log('✅ 已登录，重定向到仪表板');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// 🏠 主应用组件
function App() {
  console.log('🏠 App 组件渲染');

  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* 🌐 公开路由 */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              }
            />

            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterForm />
                </PublicRoute>
              }
            />

            {/* 🔐 受保护的路由 */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/stocks"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />

            <Route
              path="/portfolio"
              element={
                <ProtectedRoute>
                  <Portfolio />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              }
            />

            {/* 📍 默认路由 - 重定向到仪表板 */}
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* ❓ 404页面 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;