// auth/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import './AuthForms.css';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('请填写所有字段');
      return;
    }

    console.log("🔑 LoginForm Submit Triggered", formData); // <-- 看看有没有触发

    try {
      const success = await login(formData);
      console.log("✅ Login result:", success); // <-- 确认 login() 返回了什么

      if (!success) {
        setError('用户名或密码错误');
      }
    } catch (error) {
      console.error("❌ Login error:", error); // <-- 抓取异常
      setError('登录失败，请稍后重试');
    }
  };

  return (
    <div className="auth-form">
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">用户名</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="请输入用户名"
            disabled={isLoading}
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">密码</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="请输入密码"
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </button>

        <div className="form-footer">
          <p>
            还没有账户？
            <button
              type="button"
              className="link-btn"
              onClick={onSwitchToRegister}
              disabled={isLoading}
            >
              立即注册
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
