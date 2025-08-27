// components/auth/LoginForm/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  message,
  Row,
  Col,
  Checkbox
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { useAuth } from '../../../hooks/useAuth';
import {LoginRequest } from '../../../types/auth'
import {authService} from '../../../services/authService';

const { Title, Text } = Typography;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

// interface LoginFormData {
//   account: string;
//   password: string;
//   remember: boolean;
// }
//
// interface LoginResponse {
//   success: boolean;
//   user?: any;
//   token?: string;
//   token_type?: string;
//   message?: string;
// }
//
// interface BackendLoginRequest {
//   username: string;
//   password: string;
//   remember: boolean;
// }
//
// interface BackendLoginResponse {
//   user: any;
//   token: string;
//   token_type?: string;
//   message?: string;
// }
//
// interface BackendErrorResponse {
//   detail?: string;
//   message?: string;
// }
//
// // 自动登录检查结果类型
// interface AutoLoginResult {
//   shouldAutoLogin: boolean; // 是否应该尝试自动登录
//   loginData?: LoginResponse; // 自动登录结果
//   rememberedAccount?: string | null; // 记住的账户名
// }


// API 服务
// class AuthAPI {
//   private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
//
//   static async login(data: LoginFormData): Promise<LoginResponse> {
//     try {
//       console.log('🔐 发起登录请求:', { username: data.account, remember: data.remember });
//
//       const requestBody: BackendLoginRequest = {
//         username: data.account,
//         password: data.password,
//         remember: data.remember
//       };
//
//       const response = await fetch(`${this.baseURL}/auth/login`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         credentials: 'include',
//         body: JSON.stringify(requestBody),
//       });
//
//       console.log('📥 登录响应状态:', response.status, response.statusText);
//
//       if (!response.ok) {
//         let errorMessage = `登录失败 (${response.status})`;
//
//         try {
//           const errorData: BackendErrorResponse = await response.json();
//           errorMessage = errorData.detail || errorData.message || errorMessage;
//           console.error('❌ 登录错误详情:', errorData);
//         } catch (parseError) {
//           console.warn('⚠️ 无法解析错误响应:', parseError);
//         }
//
//         throw new Error(errorMessage);
//       }
//
//       const result: BackendLoginResponse = await response.json();
//       console.log('✅ 登录成功响应:', result);
//
//       return {
//         success: true,
//         user: result.user,
//         token: result.token,
//         token_type: result.token_type || 'bearer',
//         message: result.message || '登录成功'
//       };
//
//     } catch (error: any) {
//       console.error('💥 AuthAPI.login 异常:', error);
//
//       if (error.name === 'TypeError' && error.message.includes('fetch')) {
//         throw new Error('网络连接失败，请检查网络连接');
//       }
//
//       throw error;
//     }
//   }
//
//   // 修复：改进自动登录检查逻辑
//   static async checkAutoLogin(): Promise<AutoLoginResult> {
//     const savedToken = StorageUtil.getToken();
//     const savedUser = StorageUtil.getUser();
//     const rememberedAccount = StorageUtil.getRememberedAccount();
//
//     // 如果没有保存的token，说明不需要自动登录
//     if (!savedToken) {
//       console.log('ℹ️ 没有保存的token，跳过自动登录');
//       return {
//         shouldAutoLogin: false,
//         rememberedAccount: rememberedAccount || undefined
//       };
//     }
//
//     // 有token但没有用户信息，清除无效token
//     if (!savedUser) {
//       console.log('⚠️ 有token但无用户信息，清除无效token');
//       StorageUtil.clearToken();
//       return {
//         shouldAutoLogin: false,
//         rememberedAccount: rememberedAccount || undefined
//       };
//     }
//
//     try {
//       console.log('🔍 验证保存的token有效性...');
//
//       const response = await fetch(`${this.baseURL}/auth/me`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${savedToken}`
//         },
//         credentials: 'include',
//       });
//
//       if (response.ok) {
//         const result = await response.json();
//         console.log('✅ Token验证成功，自动登录成功');
//
//         return {
//           shouldAutoLogin: true,
//           loginData: {
//             success: true,
//             user: result.user || savedUser,
//             token: savedToken,
//             token_type: 'bearer',
//             message: '自动登录成功'
//           },
//           rememberedAccount: rememberedAccount || undefined
//         };
//       } else {
//         console.log('⚠️ Token已过期，清除本地存储');
//         StorageUtil.clearToken();
//         StorageUtil.clearUser();
//
//         return {
//           shouldAutoLogin: false,
//           rememberedAccount: rememberedAccount || undefined
//         };
//       }
//     } catch (error) {
//       console.warn('⚠️ 自动登录验证失败:', error);
//       // 网络错误时不清除token，下次可能会恢复
//       return {
//         shouldAutoLogin: false,
//         rememberedAccount: rememberedAccount || undefined
//       };
//     }
//   }
// }

// 修复：改进本地存储工具
// class StorageUtil {
//   private static TOKEN_KEY = 'stock_token';
//   private static USER_KEY = 'stock_user';
//   private static REMEMBERED_ACCOUNT_KEY = 'stock_app_remembered_account'; // 新增：专门存储记住的账户名
//
//   // Token相关方法
//   static saveToken(token: string): void {
//     localStorage.setItem(this.TOKEN_KEY, token);
//   }
//
//   static getToken(): string | null {
//     return localStorage.getItem(this.TOKEN_KEY);
//   }
//
//   static clearToken(): void {
//     localStorage.removeItem(this.TOKEN_KEY);
//   }
//
//   // 用户信息相关方法
//   static saveUser(user: any): void {
//     localStorage.setItem(this.USER_KEY, JSON.stringify(user));
//   }
//
//   static getUser(): any {
//     const user = localStorage.getItem(this.USER_KEY);
//     return user ? JSON.parse(user) : null;
//   }
//
//   static clearUser(): void {
//     localStorage.removeItem(this.USER_KEY);
//   }
//
//   // 新增：记住账户名的方法
//   static saveRememberedAccount(account: string): void {
//     localStorage.setItem(this.REMEMBERED_ACCOUNT_KEY, account);
//   }
//
//   static getRememberedAccount(): string | null {
//     return localStorage.getItem(this.REMEMBERED_ACCOUNT_KEY);
//   }
//
//   static clearRememberedAccount(): void {
//     localStorage.removeItem(this.REMEMBERED_ACCOUNT_KEY);
//   }
//
//   // 新增：清除所有存储
//   static clearAll(): void {
//     this.clearToken();
//     this.clearUser();
//     this.clearRememberedAccount();
//   }
// }

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [loading, setLoading] = useState(false);
  const [autoLoginChecking, setAutoLoginChecking] = useState(true);
  const [form] = Form.useForm();
  const { login: authLogin } = useAuth();

    // 🔥 添加导航 hooks
  const navigate = useNavigate();
  const location = useLocation();

  // 🎯 获取重定向目标（登录前用户想访问的页面）
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  console.log('🔍 LoginForm 状态:', {
    from,
    locationState: location.state,
    currentPath: location.pathname
  });

  const handleLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const response = await authService.login(values);
      if (response.data?.user && response.data.tokens.token) {
        // 显示成功消息
        message.success('登录成功！');

        // 更新认证状态
        console.log('🔄 更新认证状态...');
        authLogin(response.data?.user, response.data?.tokens.token);

        //关键：登录成功后导航到目标页面
        console.log('🎯 准备导航到:', from);

        // 短暂延迟让用户看到成功消息，然后导航
        setTimeout(() => {
          console.log('🔀 执行导航...');
          navigate(from, { replace: true });
        }, 1500);

      }else {
        throw new Error('登录失败，请重试');
      }

    } catch (error: any) {
      console.error('💥 登录过程异常:', error);
    } finally {
      setLoading(false);
    }
  };
  // 添加注册按钮的处理
  const handleSwitchToRegister = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister();
    } else {
      // 🔥 如果没有传入回调，直接导航到注册页
      navigate('/register');
    }
  };
  const validateAccount = (_rule: any, value: string): Promise<void> => {
    if (!value) {
      return Promise.reject(new Error('请输入用户名或邮箱'));
    }

    // 简单的邮箱格式检查
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(value);

    if (!isEmail && !isUsername) {
      return Promise.reject(new Error('请输入有效的用户名（3-20位字母数字下划线）或邮箱地址'));
    }

    return Promise.resolve();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={22} sm={16} md={12} lg={8} xl={6}>
          <Card
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            bodyStyle={{ padding: '40px 32px' }}
          >
            {/* 头部标题 */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                📈
              </div>
              <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                投资管理系统
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                欢迎使用专业的投资分析平台
              </Text>
            </div>

            {/* 登录表单 */}
            <Form
              form={form}
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              size="large"
              layout="vertical"
              initialValues={{ remember: false }}
            >
              <Form.Item
                name="username"
                rules={[{ validator: validateAccount }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="用户名或邮箱"
                  autoComplete="username"
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="密码"
                  autoComplete="current-password"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              {/* 记住登录和忘记密码 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <Form.Item name="remember" valuePropName="checked" style={{ margin: 0 }}>
                  <Checkbox>
                    <Text style={{ fontSize: '14px' }}>记住登录</Text>
                  </Checkbox>
                </Form.Item>

                <Button
                  type="link"
                  style={{
                    padding: 0,
                    height: 'auto',
                    fontSize: '14px',
                    color: '#667eea'
                  }}
                  onClick={() => message.info('请联系管理员重置密码')}
                >
                  忘记密码？
                </Button>
              </div>

              <Form.Item style={{ marginBottom: '16px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<LoginOutlined />}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </Form.Item>
            </Form>

            {/* 分割线和注册链接 */}
            <Divider style={{ margin: '24px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                还没有账户？
              </Text>
            </Divider>

            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                onClick={onSwitchToRegister}
                style={{
                  padding: 0,
                  height: 'auto',
                  color: '#667eea',
                  fontSize: '14px'
                }}
              >
                立即注册
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoginForm;