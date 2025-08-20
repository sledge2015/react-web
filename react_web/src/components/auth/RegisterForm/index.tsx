// auth/RegisterForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 用户名验证
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少需要3个字符';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = '用户名只能包含字母、数字和下划线';
    }

    // 邮箱验证
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    // 密码验证
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '密码必须包含大写字母、小写字母和数字';
    }

    // 确认密码验证
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const success = await register?.({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      if (!success) {
        setErrors({ general: '注册失败，用户名或邮箱可能已存在' });
      }
    } catch (error) {
      setErrors({ general: '注册失败，请稍后重试' });
    }
  };

  return (
    <div className="auth-form">
      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="reg-username">用户名</label>
          <input
            type="text"
            id="reg-username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="请输入用户名"
            disabled={isLoading}
            autoComplete="username"
            className={errors.username ? 'error' : ''}
          />
          {errors.username && (
            <span className="field-error">{errors.username}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="reg-email">邮箱</label>
          <input
            type="email"
            id="reg-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="请输入邮箱地址"
            disabled={isLoading}
            autoComplete="email"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && (
            <span className="field-error">{errors.email}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">密码</label>
          <input
            type="password"
            id="reg-password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="请输入密码"
            disabled={isLoading}
            autoComplete="new-password"
            className={errors.password ? 'error' : ''}
          />
          {errors.password && (
            <span className="field-error">{errors.password}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password">确认密码</label>
          <input
            type="password"
            id="confirm-password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="请再次输入密码"
            disabled={isLoading}
            autoComplete="new-password"
            className={errors.confirmPassword ? 'error' : ''}
          />
          {errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword}</span>
          )}
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? '注册中...' : '注册'}
        </button>

        <div className="form-footer">
          <p>
            已有账户？
            <button 
              type="button" 
              className="link-btn"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              立即登录
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};