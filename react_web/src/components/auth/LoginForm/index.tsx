// src/components/auth/LoginForm/index.tsx - 简化的登录表单
import React, { useState } from 'react';
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
import { LoginRequest } from '../../../types/auth';
import { authService } from '../../../services/authService';

const { Title, Text } = Typography;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  // 🔥 状态管理
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 🔥 Hooks
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🎯 获取重定向目标页面
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  console.log('🔍 LoginForm 渲染:', {
    from,
    currentPath: location.pathname
  });

  // 🔐 登录处理函数
  const handleLogin = async (values: LoginRequest) => {
    setLoading(true);
    console.log('🚀 开始登录流程:', { username: values.username });

    try {
      // 🔥 调用AuthService进行登录
      const response = await authService.login(values);

      if (response.success && response.data?.user && response.data?.tokens?.token) {
        const { user, tokens } = response.data;

        // 🔥 更新useAuth状态 (TokenManager已在AuthService中处理)
        authLogin(user, tokens.token);

        // ✅ 显示成功消息
        message.success('登录成功！');

        console.log('🎯 准备导航到:', from);

        // 🔄 短暂延迟后导航
        setTimeout(() => {
          console.log('🔀 执行页面跳转...');
          navigate(from, { replace: true });
        }, 1500);

      } else {
        throw new Error(response.error || '登录失败，请重试');
      }

    } catch (error: any) {
      console.error('💥 登录过程异常:', error);

      // 🚨 显示用户友好的错误消息
      let errorMessage = '登录失败，请重试';

      if (error.message) {
        if (error.message.includes('用户名') || error.message.includes('密码')) {
          errorMessage = '用户名或密码错误';
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络连接';
        } else if (error.message.includes('禁用')) {
          errorMessage = '账户已被禁用，请联系管理员';
        } else {
          errorMessage = error.message;
        }
      }

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 切换到注册页面
  const handleSwitchToRegister = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister();
    } else {
      navigate('/register');
    }
  };

  // ✅ 账户格式验证
  const validateAccount = (_rule: any, value: string): Promise<void> => {
    if (!value) {
      return Promise.reject(new Error('请输入用户名或邮箱'));
    }

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
            {/* 📈 头部标题 */}
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

            {/* 📝 登录表单 */}
            <Form
              form={form}
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              size="large"
              layout="vertical"
              initialValues={{ remember: false }}
            >
              {/* 👤 用户名输入 */}
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

              {/* 🔒 密码输入 */}
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

              {/* 💭 记住登录和忘记密码 */}
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

              {/* 🚀 登录按钮 */}
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

            {/* ➖ 分割线和注册链接 */}
            <Divider style={{ margin: '24px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                还没有账户？
              </Text>
            </Divider>

            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                onClick={handleSwitchToRegister}
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