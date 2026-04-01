import React from 'react';
import { LockOutlined, MailOutlined, UserAddOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useUnit } from 'effector-react';
import { signInFx, signUpFx } from '../../entities/model';

type LoginFormValues = {
  email: string;
  password: string;
};

const isValidationError = (error: unknown) => Boolean(error && typeof error === 'object' && 'errorFields' in error);

const Login: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>();

  const {
    signIn,
    signUp,
    isSigningIn,
    isSigningUp,
  } = useUnit({
    signIn: signInFx,
    signUp: signUpFx,
    isSigningIn: signInFx.pending,
    isSigningUp: signUpFx.pending,
  });

  const handleSignIn = async (values: LoginFormValues) => {
    try {
      await signIn(values);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Входът не беше успешен.');
    }
  };

  const handleSignUp = async () => {
    try {
      const values = await form.validateFields();
      const session = await signUp(values);

      if (session) {
        message.success('Регистрацията е успешна.');
        return;
      }

      message.info('Регистрацията е успешна. Провери имейла си за потвърждение, ако е необходимо.');
    } catch (error) {
      if (isValidationError(error)) {
        return;
      }

      message.error(error instanceof Error ? error.message : 'Регистрацията не беше успешна.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 134px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: 'radial-gradient(circle at top, rgba(24, 144, 255, 0.12), transparent 42%), radial-gradient(circle at bottom right, rgba(198, 90, 0, 0.12), transparent 36%)' }}>
      <Card bordered={false} style={{ width: '100%', maxWidth: '460px', background: 'var(--surface-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
              Вход и регистрация
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
              Влез в профила си или създай нов акаунт с един и същ формуляр.
            </Typography.Paragraph>
          </div>

          <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSignIn}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Въведи email адрес.' },
                { type: 'email', message: 'Въведи валиден email адрес.' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="example@culturo.bg"
                autoComplete="email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Парола"
              name="password"
              rules={[
                { required: true, message: 'Въведи парола.' },
                { min: 6, message: 'Паролата трябва да е поне 6 символа.' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Минимум 6 символа"
                autoComplete="current-password"
                size="large"
              />
            </Form.Item>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button type="primary" htmlType="submit" block size="large" loading={isSigningIn}>
                Вход
              </Button>

              <Button type="default" block size="large" icon={<UserAddOutlined />} loading={isSigningUp} onClick={handleSignUp}>
                Регистрация
              </Button>
            </Space>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default Login;
