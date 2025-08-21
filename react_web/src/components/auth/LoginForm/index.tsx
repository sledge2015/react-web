// components/auth/LoginForm.tsx - 真实API版本
import React, { useState, useEffect } from 'react';
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

const { Title, Text } = Typography;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

interface LoginFormData {
  account: string; // 支持用户名或邮箱
  password: string;
  remember: boolean;
}

// API 服务
class AuthAPI {
  private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  static async login(data: LoginFormData) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 支持cookie
      body: JSON.stringify({
        account: data.account,
        password: data.password,
        remember: data.remember
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async checkAutoLogin() {
    try {
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        return response.json();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  static async logout() {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('退出登录失败');
    }

    return response.json();
  }
}

// 本地存储工具
class StorageUtil {
  private static REMEMBER_KEY = 'stock_app_remember_account';

  static saveRememberAccount(account: string) {
    localStorage.setItem(this.REMEMBER_KEY, account);
  }

  static getRememberAccount(): string {
    return localStorage.getItem(this.REMEMBER_KEY) || '';
  }

  static clearRememberAccount() {
    localStorage.removeItem(this.REMEMBER_KEY);
  }
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [loading, setLoading] = useState(false);
  const [autoLoginChecking, setAutoLoginChecking] = useState(true);
  const [form] = Form.useForm();
  const { login: authLogin } = useAuth();

  // 检查自动登录
  useEffect(() => {
    checkAutoLogin();
    loadRememberedAccount();
  }, []);

  const checkAutoLogin = async () => {
    try {
      setAutoLoginChecking(true);
      const userData = await AuthAPI.checkAutoLogin();

      if (userData && userData.user) {
        // 自动登录成功
        authLogin(userData.user, userData.token);
        message.success('欢迎回来！');
        return;
      }
    } catch (error) {
      console.log('自动登录检查失败:', error);
    } finally {
      setAutoLoginChecking(false);
    }
  };

  const loadRememberedAccount = () => {
    const rememberedAccount = StorageUtil.getRememberAccount();
    if (rememberedAccount) {
      form.setFieldsValue({
        account: rememberedAccount,
        remember: true
      });
    }
  };

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true);
    try {
      // 调用真实API
      const response = await AuthAPI.login(values);

      if (response.success) {
        // 登录成功
        message.success('登录成功！');

        // 处理记住登录
        if (values.remember) {
          StorageUtil.saveRememberAccount(values.account);
        } else {
          StorageUtil.clearRememberAccount();
        }

        // 更新认证状态
        authLogin(response.user, response.token);

      } else {
        throw new Error(response.message || '登录失败');
      }

    } catch (error: any) {
      console.error('登录错误:', error);

      // 处理不同类型的错误
      if (error.message.includes('网络')) {
        message.error('网络连接失败，请检查网络连接');
      } else if (error.message.includes('用户名') || error.message.includes('密码')) {
        message.error('用户名或密码错误');
      } else if (error.message.includes('账户被锁定')) {
        message.error('账户已被锁定，请联系管理员');
      } else {
        message.error(error.message || '登录失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateAccount = (rule: any, value: string) => {
    if (!value) {
      return Promise.reject('请输入用户名或邮箱');
    }

    // 简单的邮箱格式检查
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(value);

    if (!isEmail && !isUsername) {
      return Promise.reject('请输入有效的用户名（3-20位字母数字下划线）或邮箱地址');
    }

    return Promise.resolve();
  };

  // 如果正在检查自动登录，显示加载状态
  if (autoLoginChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>📈</div>
          <Text>正在检查登录状态...</Text>
        </Card>
      </div>
    );
  }

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
                美股投资管理系统
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                欢迎使用专业的美股投资分析平台
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
                name="account"
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

            {/* API 连接状态提示 */}
            <div style={{
              marginTop: '24px',
              padding: '12px',
              background: '#e6f7ff',
              borderRadius: '6px',
              border: '1px solid #91d5ff'
            }}>
              <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                🔗 API地址: {process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// 导出 AuthAPI 供其他组件使用
export { AuthAPI };
export default LoginForm;