// components/auth/EnhancedLoginForm/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

// 粒子背景组件
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];
    const particleCount = 80;

    // 创建粒子
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    // 连接线条
    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(102, 126, 234, ${0.1 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawConnections();

      particles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(102, 126, 234, ${particle.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

// 浮动图标组件
const FloatingIcon: React.FC<{
  icon: React.ComponentType<{ size: number; className: string }>;
  delay?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ icon: Icon, delay = 0, position = 'top-left' }) => {
  const positions = {
    'top-left': 'top-20 left-20',
    'top-right': 'top-32 right-32',
    'bottom-left': 'bottom-40 left-16',
    'bottom-right': 'bottom-24 right-24'
  };

  return (
    <div
      className={`absolute ${positions[position]} opacity-20 animate-bounce`}
      style={{ animationDelay: `${delay}ms`, animationDuration: '3s' }}
    >
      <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-sm">
        <Icon size={24} className="text-blue-400" />
      </div>
    </div>
  );
};

// 现有API类型和接口
interface LoginFormData {
  account: string;
  password: string;
  remember: boolean;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
  agreement: boolean;
}

interface LoginResponse {
  success: boolean;
  user?: any;
  token?: string;
  token_type?: string;
  message?: string;
}

// 保持原有的 AuthAPI 类
class AuthAPI {
  private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

  static async login(data: LoginFormData): Promise<LoginResponse> {
    try {
      console.log('🔐 发起登录请求:', { username: data.account, remember: data.remember });

      const requestBody = {
        username: data.account,
        password: data.password,
        remember: data.remember
      };

      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('📥 登录响应状态:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `登录失败 (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error('❌ 登录错误详情:', errorData);
        } catch (parseError) {
          console.warn('⚠️ 无法解析错误响应:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ 登录成功响应:', result);

      return {
        success: true,
        user: result.user,
        token: result.token,
        token_type: result.token_type || 'bearer',
        message: result.message || '登录成功'
      };

    } catch (error: any) {
      console.error('💥 AuthAPI.login 异常:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接');
      }
      throw error;
    }
  }

  static async checkAutoLogin(): Promise<LoginResponse | null> {
    try {
      const savedToken = localStorage.getItem('stock_app_token');
      const savedUser = localStorage.getItem('stock_app_user');

      if (!savedToken || !savedUser) {
        return null;
      }

      console.log('🔍 检查自动登录...');

      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 自动登录验证成功');

        return {
          success: true,
          user: result.user || result,
          token: savedToken,
          token_type: 'bearer',
          message: '自动登录成功'
        };
      } else {
        console.log('⚠️ Token已过期，清除本地存储');
        localStorage.removeItem('stock_app_token');
        localStorage.removeItem('stock_app_user');
        return null;
      }
    } catch (error) {
      console.warn('⚠️ 自动登录检查失败:', error);
      return null;
    }
  }

  // 注册API
  static async register(data: Omit<RegisterFormData, 'confirmPassword' | 'agreement'>) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `注册失败: ${response.status}`);
    }

    return response.json();
  }

  // 忘记密码API
  static async forgotPassword(email: string) {
    const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `发送重置邮件失败: ${response.status}`);
    }

    return response.json();
  }
}

// 本地存储工具 - 保持原有实现
class StorageUtil {
  private static REMEMBER_KEY = 'stock_app_remember_account';

  static saveRememberAccount(account: string): void {
    localStorage.setItem(this.REMEMBER_KEY, account);
  }

  static getRememberAccount(): string {
    return localStorage.getItem(this.REMEMBER_KEY) || '';
  }

  static clearRememberAccount(): void {
    localStorage.removeItem(this.REMEMBER_KEY);
  }
}

// 组件属性接口
interface EnhancedAuthFormProps {
  onSwitchToRegister?: () => void;
  onSwitchToLogin?: () => void;
  mode?: 'login' | 'register' | 'forgot';
}

// 主组件
export const EnhancedAuthForm: React.FC<EnhancedAuthFormProps> = ({
  onSwitchToRegister,
  onSwitchToLogin,
  mode: initialMode = 'login'
}) => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [autoLoginChecking, setAutoLoginChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 表单数据
  const [loginData, setLoginData] = useState<LoginFormData>({
    account: '',
    password: '',
    remember: false
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    agreement: false
  });

  const [forgotEmail, setForgotEmail] = useState('');

  const { login: authLogin } = useAuth();

  // 密码强度计算
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  // 自动登录检查
  const checkAutoLogin = useCallback(async () => {
    try {
      setAutoLoginChecking(true);
      const loginResult = await AuthAPI.checkAutoLogin();

      if (loginResult?.success && loginResult.user && loginResult.token) {
        console.log('🎉 自动登录成功');
        authLogin(loginResult.user, loginResult.token);
        message.success('欢迎回来！');
      } else {
        console.log('ℹ️ 无有效的自动登录信息');
      }
    } catch (error) {
      console.log('⚠️ 自动登录检查失败:', error);
    } finally {
      setAutoLoginChecking(false);
    }
  }, [authLogin]);

  // 加载记住的账户
  const loadRememberedAccount = useCallback(() => {
    const rememberedAccount = StorageUtil.getRememberAccount();
    if (rememberedAccount) {
      setLoginData(prev => ({
        ...prev,
        account: rememberedAccount,
        remember: true
      }));
    }
  }, []);

  // 初始化
  useEffect(() => {
    const initializeLogin = async () => {
      await checkAutoLogin();
      loadRememberedAccount();
    };
    initializeLogin();
  }, [checkAutoLogin, loadRememberedAccount]);

  // 处理输入变化
  const handleInputChange = (field: string, value: any, formType: 'login' | 'register' | 'forgot' = currentView) => {
    setErrors(prev => ({ ...prev, [field]: '' }));

    if (formType === 'login') {
      setLoginData(prev => ({ ...prev, [field]: value }));
    } else if (formType === 'register') {
      setRegisterData(prev => ({ ...prev, [field]: value }));
      if (field === 'password') {
        setPasswordStrength(calculatePasswordStrength(value));
      }
    } else {
      setForgotEmail(value);
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentView === 'login') {
      if (!loginData.account) newErrors.account = '请输入用户名或邮箱';
      if (!loginData.password) newErrors.password = '请输入密码';
    } else if (currentView === 'register') {
      if (!registerData.username) newErrors.username = '请输入用户名';
      if (!registerData.email) newErrors.email = '请输入邮箱';
      if (!registerData.password) newErrors.password = '请输入密码';
      if (registerData.password !== registerData.confirmPassword) {
        newErrors.confirmPassword = '密码不匹配';
      }
      if (!registerData.agreement) newErrors.agreement = '请同意用户协议';
    } else if (currentView === 'forgot') {
      if (!forgotEmail) newErrors.email = '请输入邮箱';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 登录处理
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await AuthAPI.login(loginData);

      if (response.success && response.user && response.token) {
        message.success(response.message || '登录成功！');

        if (loginData.remember) {
          StorageUtil.saveRememberAccount(loginData.account);
        } else {
          StorageUtil.clearRememberAccount();
        }

        authLogin(response.user, response.token);
      } else {
        throw new Error(response.message || '登录失败，请重试');
      }

    } catch (error: any) {
      console.error('💥 登录过程异常:', error);
      let errorMessage = '登录失败，请重试';

      if (error.message) {
        if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络连接';
        } else if (error.message.includes('用户名') || error.message.includes('密码') || error.message.includes('Incorrect')) {
          errorMessage = '用户名或密码错误';
        } else if (error.message.includes('账户被锁定') || error.message.includes('Inactive')) {
          errorMessage = '账户已被锁定，请联系管理员';
        } else {
          errorMessage = error.message;
        }
      }

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 注册处理
  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const registerPayload = {
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        inviteCode: registerData.inviteCode,
      };

      const response = await AuthAPI.register(registerPayload);

      if (response.success) {
        message.success('注册成功！请检查邮箱进行验证后登录');
        setCurrentView('login');
      } else {
        throw new Error(response.message || '注册失败');
      }

    } catch (error: any) {
      console.error('注册错误:', error);
      message.error(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 忘记密码处理
  const handleForgotPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await AuthAPI.forgotPassword(forgotEmail);
      message.success('重置密码邮件已发送，请检查您的邮箱');
      setCurrentView('login');
    } catch (error: any) {
      console.error('忘记密码错误:', error);
      message.error(error.message || '发送重置邮件失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 提交处理
  const handleSubmit = async () => {
    if (currentView === 'login') {
      await handleLogin();
    } else if (currentView === 'register') {
      await handleRegister();
    } else {
      await handleForgotPassword();
    }
  };

  // 输入框组件
  const InputField: React.FC<{
    type?: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ComponentType<{ className: string }>;
    error?: string;
    showToggle?: boolean;
    onToggle?: () => void;
  }> = ({
    type = 'text',
    placeholder,
    value,
    onChange,
    icon: Icon,
    error,
    showToggle = false,
    onToggle
  }) => (
    <div className="relative group mb-6">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
        <Icon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
      </div>
      <input
        type={showToggle && showPassword ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
          focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20
          placeholder-gray-400 text-white transition-all duration-300 hover:bg-white/15
          ${error ? 'border-red-400/50 focus:border-red-400/50 focus:ring-red-400/20' : ''}`}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-4 flex items-center z-10"
        >
          {showPassword ?
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-white transition-colors" /> :
            <Eye className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
          }
        </button>
      )}
      {error && (
        <div className="absolute -bottom-6 left-0 text-red-400 text-sm flex items-center gap-1">
          <X size={14} />
          {error}
        </div>
      )}
    </div>
  );

  // 如果正在检查自动登录，显示加载状态
  if (autoLoginChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
        flex items-center justify-center p-4 relative overflow-hidden">
        <ParticleBackground />
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r
            from-blue-500/20 to-purple-500/20 rounded-full mb-4 animate-pulse">
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-gray-300">正在检查登录状态...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
      flex items-center justify-center p-4 relative overflow-hidden">

      {/* 粒子背景 */}
      <ParticleBackground />

      {/* 浮动图标 */}
      <FloatingIcon icon={TrendingUp} delay={0} position="top-left" />
      <FloatingIcon icon={Shield} delay={1000} position="top-right" />
      <FloatingIcon icon={Zap} delay={2000} position="bottom-left" />
      <FloatingIcon icon={TrendingUp} delay={3000} position="bottom-right" />

      {/* 主卡片 */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">

          {/* 头部 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r
              from-blue-500/20 to-purple-500/20 rounded-full mb-4 animate-pulse">
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300
              bg-clip-text text-transparent mb-2">
              {currentView === 'login' ? '投资系统' :
               currentView === 'register' ? '创建账户' : '重置密码'}
            </h1>
            <p className="text-gray-400 text-sm">
              {currentView === 'login' ? '专业的投资管理分析平台' :
               currentView === 'register' ? '开启您的投资之路' : '找回您的账户'}
            </p>
          </div>

          {/* 表单内容 */}
          <div className="space-y-6">
            {currentView === 'login' && (
              <>
                <InputField
                  placeholder="用户名或邮箱"
                  value={loginData.account}
                  onChange={(value: string) => handleInputChange('account', value, 'login')}
                  icon={User}
                  error={errors.account}
                />

                <InputField
                  type="password"
                  placeholder="密码"
                  value={loginData.password}
                  onChange={(value: string) => handleInputChange('password', value, 'login')}
                  icon={Lock}
                  error={errors.password}
                  showToggle={true}
                  onToggle={() => setShowPassword(!showPassword)}
                />

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={loginData.remember}
                        onChange={(e) => handleInputChange('remember', e.target.checked, 'login')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 border-white/30 transition-all duration-200 
                        ${loginData.remember ? 'bg-blue-500 border-blue-500' : 'group-hover:border-white/50'}`}>
                        {loginData.remember && (
                          <Check size={10} className="text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-white transition-colors">记住登录</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setCurrentView('forgot')}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    忘记密码？
                  </button>
                </div>
              </>
            )}

            {currentView === 'register' && (
              <>
                <InputField
                  placeholder="用户名"
                  value={registerData.username}
                  onChange={(value: string) => handleInputChange('username', value, 'register')}
                  icon={User}
                  error={errors.username}
                />

                <InputField
                  type="email"
                  placeholder="邮箱地址"
                  value={registerData.email}
                  onChange={(value: string) => handleInputChange('email', value, 'register')}
                  icon={Mail}
                  error={errors.email}
                />

                <div>
                  <InputField
                    type="password"
                    placeholder="设置密码"
                    value={registerData.password}
                    onChange={(value: string) => handleInputChange('password', value, 'register')}
                    icon={Lock}
                    error={errors.password}
                    showToggle={true}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                  {/* 密码强度指示器 */}
                  {registerData.password && (
                    <div className="mt-2 mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">密码强度</span>
                        <span className={`${
                          passwordStrength < 25 ? 'text-red-500' :
                          passwordStrength < 50 ? 'text-yellow-500' :
                          passwordStrength < 75 ? 'text-blue-500' :
                          'text-green-500'
                        }`}>
                          {passwordStrength < 25 ? '弱' :
                           passwordStrength < 50 ? '一般' :
                           passwordStrength < 75 ? '良好' : '强'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength < 25 ? 'bg-red-500' :
                            passwordStrength < 50 ? 'bg-yellow-500' :
                            passwordStrength < 75 ? 'bg-blue-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <InputField
                  type="password"
                  placeholder="确认密码"
                  value={registerData.confirmPassword}
                  onChange={(value: string) => handleInputChange('confirmPassword', value, 'register')}
                  icon={Lock}
                  error={errors.confirmPassword}
                />

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={registerData.agreement}
                        onChange={(e) => handleInputChange('agreement', e.target.checked, 'register')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 border-white/30 transition-all duration-200 
                        ${registerData.agreement ? 'bg-blue-500 border-blue-500' : 'group-hover:border-white/50'}`}>
                        {registerData.agreement && (
                          <Check size={10} className="text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      我已阅读并同意
                      <button type="button" className="text-blue-400 hover:text-blue-300 mx-1">用户协议</button>
                      和
                      <button type="button" className="text-blue-400 hover:text-blue-300 mx-1">隐私政策</button>
                    </span>
                  </label>
                  {errors.agreement && (
                    <div className="text-red-400 text-sm flex items-center gap-1">
                      <X size={14} />
                      {errors.agreement}
                    </div>
                  )}
                </div>
              </>
            )}

            {currentView === 'forgot' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20
                    rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-gray-300">
                    输入您的邮箱地址，我们将发送重置密码的链接
                  </p>
                </div>

                <InputField
                  type="email"
                  placeholder="邮箱地址"
                  value={forgotEmail}
                  onChange={(value: string) => handleInputChange('email', value, 'forgot')}
                  icon={Mail}
                  error={errors.email}
                />
              </div>
            )}

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-300 
                transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                disabled:transform-none flex items-center justify-center gap-2 text-white
                ${currentView === 'login' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  : currentView === 'register'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {currentView === 'login' ? '登录' :
                   currentView === 'register' ? '创建账户' : '发送重置链接'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>

          {/* 底部切换 */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex-1 border-t border-gray-600"></div>
              <span className="px-4 text-gray-400 text-sm">
                {currentView === 'login' ? '还没有账户？' :
                 currentView === 'register' ? '已有账户？' : '记起密码了？'}
              </span>
              <div className="flex-1 border-t border-gray-600"></div>
            </div>

            <div className="flex gap-4 justify-center">
              {currentView !== 'login' && (
                <button
                  onClick={() => {
                    setCurrentView('login');
                    onSwitchToLogin?.();
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  登录
                </button>
              )}

              {currentView !== 'register' && (
                <button
                  onClick={() => {
                    setCurrentView('register');
                    onSwitchToRegister?.();
                  }}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  注册
                </button>
              )}

              {currentView !== 'forgot' && (
                <button
                  onClick={() => setCurrentView('forgot')}
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  重置密码
                </button>
              )}
            </div>
          </div>

          {/* 版本信息 */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              © 2025 Investment Platform v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAuthForm;