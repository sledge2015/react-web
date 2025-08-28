// ================================
// 1. src/App.tsx - 主应用路由
// ================================
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import MainLayout from './layouts/MainLayout';
import Analysis from './pages/Analysis';
import Portfolio from './pages/Portfolio';
import Favorites from './pages/Favorites';
import Market from './pages/Market';
import AdminPanel from './components/AdminPanel';
import NotFound from './pages/NotFound';
import TokenManager from './utils/tokenManager';

// 测试接口
import { initDevTools } from './test/dev-tools';
initDevTools();

// 受保护的路由组件
interface ProtectedRouteProps {
  children: React.ReactNode;
  path?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, path }) => {
  const { user, isLoading, refreshAuthState } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);

  const currentPath = path || location.pathname;

  useEffect(() => {
    const hasUser = !!user;
    const hasStoredAuth = TokenManager.isAuthenticated();
    const hasStoredUser = !!TokenManager.getUser();

    // 只在初始化时检查一次
    if (!hasUser && !isLoading && hasStoredAuth && hasStoredUser && !isChecking) {
      setIsChecking(true);
      refreshAuthState().finally(() => {
        setIsChecking(false);
      });
    }
  }, [user, isLoading]); // 只依赖核心状态

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

  const isAuthenticated = !!user || TokenManager.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname: currentPath } }} replace />;
  }

  return <>{children}</>;
};

// 公开路由组件
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

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

  if (user) {
    return <Navigate to="/portfolio" replace />;
  }

  return <>{children}</>;
}

// 带布局的路由包装器
const LayoutRoute: React.FC<{ children: React.ReactNode; activeMenu: string }> = ({
  children,
  activeMenu
}) => {
  return (
    <ProtectedRoute>
      <MainLayout activeMenu={activeMenu}>
        {children}
      </MainLayout>
    </ProtectedRoute>
  );
};

// 主应用组件
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterForm /></PublicRoute>} />

            {/* 受保护的路由 */}
            <Route path="/portfolio" element={<LayoutRoute activeMenu="portfolio"><Portfolio /></LayoutRoute>} />
            <Route path="/watchlist" element={<LayoutRoute activeMenu="watchlist"><div>关注列表页面开发中</div></LayoutRoute>} />
            <Route path="/market" element={<LayoutRoute activeMenu="market"><Market /></LayoutRoute>} />
            <Route path="/analysis" element={<LayoutRoute activeMenu="analysis"><Analysis /></LayoutRoute>} />
            <Route path="/favorites" element={<LayoutRoute activeMenu="favorites"><Favorites /></LayoutRoute>} />

            {/* 管理员路由 */}
            <Route path="/admin" element={<LayoutRoute activeMenu="admin"><AdminPanel activeTab="admin-overview" /></LayoutRoute>} />
            <Route path="/admin/overview" element={<LayoutRoute activeMenu="admin"><AdminPanel activeTab="admin-overview" /></LayoutRoute>} />
            <Route path="/admin/users" element={<LayoutRoute activeMenu="admin"><AdminPanel activeTab="admin-users" /></LayoutRoute>} />
            <Route path="/admin/system" element={<LayoutRoute activeMenu="admin"><AdminPanel activeTab="admin-system" /></LayoutRoute>} />
            <Route path="/admin/logs" element={<LayoutRoute activeMenu="admin"><AdminPanel activeTab="admin-logs" /></LayoutRoute>} />

            {/* 默认和404路由 */}
            <Route path="/" element={<Navigate to="/portfolio" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
