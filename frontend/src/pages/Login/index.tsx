import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Segmented, Space, Typography, message } from 'antd';
import { useUnit } from 'effector-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { history } from '../../shared/routing';
import { resetPasswordFx, signInFx, signUpFx, updatePasswordFx } from '../../entities/model';
import { locationPromptRequested } from '../../entities/location/model';

type AuthMode = 'login' | 'register';

type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword?: string;
};

type RecoveryFormValues = {
  newPassword: string;
  confirmPassword: string;
};

const isValidationError = (error: unknown) => Boolean(error && typeof error === 'object' && 'errorFields' in error);

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [authForm] = Form.useForm<AuthFormValues>();
  const [recoveryForm] = Form.useForm<RecoveryFormValues>();
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const isRecoveryMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'recovery';

  const {
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    isSigningIn,
    isSigningUp,
    isResettingPassword,
    isUpdatingPassword,
  } = useUnit({
    signIn: signInFx,
    signUp: signUpFx,
    resetPassword: resetPasswordFx,
    updatePassword: updatePasswordFx,
    isSigningIn: signInFx.pending,
    isSigningUp: signUpFx.pending,
    isResettingPassword: resetPasswordFx.pending,
    isUpdatingPassword: updatePasswordFx.pending,
  });

  const handleAuthModeChange = (value: string | number) => {
    if (value === 'login' || value === 'register') {
      setAuthMode(value);
      authForm.resetFields(['confirmPassword']);
    }
  };

  const handleAuthSubmit = async (values: AuthFormValues) => {
    try {
      if (authMode === 'register') {
        const session = await signUp({
          email: values.email,
          password: values.password,
        });

        if (session) {
          message.success(t('auth.success_register'));
          locationPromptRequested();
          return;
        }

        message.info(t('auth.success_register_email'));
        locationPromptRequested();
        return;
      }

      await signIn({
        email: values.email,
        password: values.password,
      });

      locationPromptRequested();
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('auth.error_login'));
    }
  };

  const handleForgotPassword = async () => {
    try {
      const values = await authForm.validateFields(['email']);

      if (typeof window === 'undefined') {
        throw new Error(t('auth.error_recovery_send'));
      }

      await resetPassword({
        email: values.email,
        redirectTo: `${window.location.origin}/login?mode=recovery`,
      });

      message.success(t('auth.success_recovery_sent'));
    } catch (error) {
      if (isValidationError(error)) {
        return;
      }

      message.error(error instanceof Error ? error.message : t('auth.error_recovery_send'));
    }
  };

  const handleRecoverySubmit = async (values: RecoveryFormValues) => {
    try {
      await updatePassword({
        password: values.newPassword,
      });

      message.success(t('auth.success_password_updated'));
      history.push('/');
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('auth.error_password_update'));
    }
  };

  if (isRecoveryMode) {
    return (
      <div style={{ minHeight: 'calc(100vh - 134px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: 'radial-gradient(circle at top, rgba(24, 144, 255, 0.12), transparent 42%), radial-gradient(circle at bottom right, rgba(198, 90, 0, 0.12), transparent 36%)' }}>
        <Card variant="borderless" style={{ width: '100%', maxWidth: '460px', background: 'var(--surface-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)' }}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={2} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
                {t('auth.recovery_title')}
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
                {t('auth.recovery_subtitle')}
              </Typography.Paragraph>
            </div>

            <Form form={recoveryForm} layout="vertical" requiredMark={false} onFinish={handleRecoverySubmit}>
              <Form.Item
                label={t('auth.new_password_label')}
                name="newPassword"
                rules={[
                  { required: true, message: t('forms.validation.required') },
                  { min: 6, message: t('forms.validation.password_min') },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('auth.password_placeholder')}
                  autoComplete="new-password"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label={t('auth.confirm_new_password_label')}
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('forms.validation.required') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }

                      return Promise.reject(new Error(t('forms.validation.password_mismatch')));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('auth.confirm_password_placeholder')}
                  autoComplete="new-password"
                  size="large"
                />
              </Form.Item>

              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Button type="primary" htmlType="submit" block size="large" loading={isUpdatingPassword}>
                  {t('auth.save_new_password')}
                </Button>

                <Button type="link" htmlType="button" block onClick={() => history.push('/login')}>
                  {t('auth.back_to_auth')}
                </Button>
              </Space>
            </Form>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 134px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: 'radial-gradient(circle at top, rgba(24, 144, 255, 0.12), transparent 42%), radial-gradient(circle at bottom right, rgba(198, 90, 0, 0.12), transparent 36%)' }}>
      <Card variant="borderless" style={{ width: '100%', maxWidth: '460px', background: 'var(--surface-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)' }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
              {authMode === 'login' ? t('auth.login_title') : t('auth.register_title')}
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
              {authMode === 'login'
                ? t('auth.login_subtitle')
                : t('auth.register_subtitle')}
            </Typography.Paragraph>
          </div>

          <Segmented
            block
            size="large"
            value={authMode}
            onChange={handleAuthModeChange}
            options={[
              { label: t('auth.login_title'), value: 'login' },
              { label: t('auth.register_title'), value: 'register' },
            ]}
          />

          <Form form={authForm} layout="vertical" requiredMark={false} onFinish={handleAuthSubmit}>
            <Form.Item
              label={t('forms.email')}
              name="email"
              rules={[
                { required: true, message: t('forms.validation.email_required') },
                { type: 'email', message: t('forms.validation.email_invalid') },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t('auth.email_placeholder')}
                autoComplete="email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={t('forms.password')}
              name="password"
              rules={[
                { required: true, message: t('forms.validation.password_required') },
                { min: 6, message: t('forms.validation.password_min') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth.password_placeholder')}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                size="large"
              />
            </Form.Item>

            {authMode === 'register' && (
              <Form.Item
                label={t('auth.confirm_new_password_label')}
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: t('forms.validation.required') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }

                      return Promise.reject(new Error(t('forms.validation.password_mismatch')));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={t('auth.confirm_password_placeholder')}
                  autoComplete="new-password"
                  size="large"
                />
              </Form.Item>
            )}

            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={authMode === 'login' ? isSigningIn : isSigningUp}
              >
                {authMode === 'login' ? t('auth.login_title') : t('auth.register_title')}
              </Button>

              {authMode === 'login' && (
                <Button type="link" htmlType="button" block onClick={handleForgotPassword} loading={isResettingPassword}>
                  {t('auth.forgot_password')}
                </Button>
              )}
            </Space>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default Login;
