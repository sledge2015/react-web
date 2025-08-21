// components/auth/RegisterForm/index.tsx - 修复语法错误版本
import React, { useState } from 'react';
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
  MailOutlined,
  LockOutlined,
  UserAddOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SafetyOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
  agreement: boolean;
}

// 注册API
class RegisterAPI {
  private static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

  static async checkUsernameAvailable(username: string) {
    const response = await fetch(`${this.baseURL}/auth/check-username?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('检查用户名失败');
    }

    const data = await response.json();
    return data.available;
  }

  static async checkEmailAvailable(email: string) {
    const response = await fetch(`${this.baseURL}/auth/check-email?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('检查邮箱失败');
    }

    const data = await response.json();
    return data.available;
  }
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      const registerData = {
        username: values.username,
        email: values.email,
        password: values.password,
        inviteCode: values.inviteCode,
      };

      const response = await RegisterAPI.register(registerData);

      if (response.success) {
        message.success('注册成功！请检查邮箱进行验证后登录');
        onSwitchToLogin?.();
      } else {
        throw new Error(response.message || '注册失败');
      }

    } catch (error: any) {
      console.error('注册错误:', error);

      // 处理不同类型的错误
      if (error.message.includes('用户名已存在')) {
        message.error('用户名已被占用，请选择其他用户名');
        form.setFields([{
          name: 'username',
          errors: ['用户名已被占用']
        }]);
      } else if (error.message.includes('邮箱已存在')) {
        message.error('邮箱已被注册，请使用其他邮箱或直接登录');
        form.setFields([{
          name: 'email',
          errors: ['邮箱已被注册']
        }]);
      } else if (error.message.includes('邀请码')) {
        message.error('邀请码无效或已过期');
        form.setFields([{
          name: 'inviteCode',
          errors: ['邀请码无效']
        }]);
      } else {
        message.error(error.message || '注册失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 异步验证用户名
  const validateUsername = async (rule: any, value: string) => {
    if (!value) {
      return Promise.reject('请输入用户名');
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      return Promise.reject('用户名只能包含字母、数字和下划线，长度3-20位');
    }

    // try {
    //   const available = await RegisterAPI.checkUsernameAvailable(value); #用户名不关键，后台绑定邮箱
    //   if (!available) {
    //     return Promise.reject('用户名已被占用');
    //   }
    // } catch (error) {
    //   // 网络错误时不阻塞表单提交
    //   console.warn('检查用户名可用性失败:', error);
    // }

    return Promise.resolve();
  };

  // 异步验证邮箱
  const validateEmail = async (rule: any, value: string) => {
    if (!value) {
      return Promise.reject('请输入邮箱地址');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return Promise.reject('请输入有效的邮箱地址');
    }

    try {
      const available = await RegisterAPI.checkEmailAvailable(value);
      if (!available) {
        return Promise.reject('邮箱已被注册');
      }
    } catch (error) {
      // 网络错误时不阻塞表单提交
      console.warn('检查邮箱可用性失败:', error);
    }

    return Promise.resolve();
  };

  // 密码强度验证
  const validatePassword = (rule: any, value: string) => {
    if (!value) {
      return Promise.reject('请输入密码');
    }

    if (value.length < 8) {
      return Promise.reject('密码至少8位字符');
    }

    // 检查密码复杂度
    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /\d/.test(value);

    if (!hasLetter || !hasNumber) {
      return Promise.reject('密码必须包含字母和数字');
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
                注册新账户
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                创建您的美股投资分析账户
              </Text>
            </div>

            {/* 注册表单 */}
            <Form
              form={form}
              name="register"
              onFinish={handleRegister}
              autoComplete="off"
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="username"
                rules={[{ validator: validateUsername }]}
                hasFeedback
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="用户名（3-20位字母数字下划线）"
                  autoComplete="username"
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[{ validator: validateEmail }]}
                hasFeedback
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="邮箱地址"
                  autoComplete="email"
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ validator: validatePassword }]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="密码（至少8位，包含字母和数字）"
                  autoComplete="new-password"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
                hasFeedback
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="确认密码"
                  autoComplete="new-password"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              {/* 邀请码（可选） */}
              <Form.Item
                name="inviteCode"
                rules={[
                  {
                    pattern: /^[A-Z0-9]{6,10}$/,
                    message: '邀请码格式不正确'
                  }
                ]}
              >
                <Input
                  prefix={<SafetyOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="邀请码（可选）"
                  style={{
                    borderRadius: '8px',
                    height: '48px'
                  }}
                />
              </Form.Item>

              {/* 用户协议 */}
              <Form.Item
                name="agreement"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value ? Promise.resolve() : Promise.reject(new Error('请同意用户协议'))
                  }
                ]}
                style={{ marginBottom: '24px' }}
              >
                <Checkbox>
                  <Text style={{ fontSize: '13px' }}>
                    我已阅读并同意
                    <Button
                      type="link"
                      style={{ padding: 0, fontSize: '13px' }}
                      onClick={() => message.info('用户协议功能开发中')}
                    >
                      《用户协议》
                    </Button>
                    和
                    <Button
                      type="link"
                      style={{ padding: 0, fontSize: '13px' }}
                      onClick={() => message.info('隐私政策功能开发中')}
                    >
                      《隐私政策》
                    </Button>
                  </Text>
                </Checkbox>
              </Form.Item>

              <Form.Item style={{ marginBottom: '16px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<UserAddOutlined />}
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
                  {loading ? '注册中...' : '注册账户'}
                </Button>
              </Form.Item>
            </Form>

            {/* 分割线和登录链接 */}
            <Divider style={{ margin: '24px 0' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                已有账户？
              </Text>
            </Divider>

            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                onClick={onSwitchToLogin}
                style={{
                  padding: 0,
                  height: 'auto',
                  color: '#667eea',
                  fontSize: '14px'
                }}
              >
                立即登录
              </Button>
            </div>

            {/* API 连接状态提示 */}
            <div style={{
              marginTop: '24px',
              padding: '12px',
              background: '#f0f9ff',
              borderRadius: '6px',
              border: '1px solid #bae6fd'
            }}>
              <Text style={{ fontSize: '12px', color: '#0284c7' }}>
                🔗 API地址: {process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RegisterForm;