import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Divider, Result, Space, Typography } from 'antd';
import { useUnit } from 'effector-react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { history } from '../../shared/routing';
import { $isAdmin, $user, refreshUserProfile } from '../../entities/model';

const AdminMessage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAdmin, refresh } = useUnit({
    user: $user,
    isAdmin: $isAdmin,
    refresh: refreshUserProfile,
  });

  const searchParams = new URLSearchParams(window.location.search);
  const type = (searchParams.get('type') as 'success' | 'error' | 'info' | 'warning') || 'info';
  const text = searchParams.get('text') || t('admin_msg.default_op');
  const serverDebug = searchParams.get('debug') || t('admin_msg.no_data');
  const targetId = searchParams.get('target_id') || t('admin_msg.unknown');

  useEffect(() => {
    if (type === 'success') {
      refresh();
    }
  }, [refresh, type]);

  const handleBack = () => {
    history.push('/');
  };

  const handleManualRefresh = () => {
    refresh();
  };

  const idsMatch = user?.authUserId === targetId;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <Result
          status={type}
          title={type === 'success' ? t('admin_msg.success_title') : t('admin_msg.info_title')}
          subTitle={text}
          extra={[
            <Space key="actions">
              <Button type="primary" onClick={handleBack} size="large" style={{ borderRadius: '8px' }}>
                {t('admin_msg.back_home')}
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleManualRefresh} size="large" style={{ borderRadius: '8px' }}>
                {t('admin_msg.refresh_profile')}
              </Button>
            </Space>,
          ]}
        />


        <Divider>{t('admin_msg.diagnostic_title')}</Divider>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label={t('admin_msg.target_id_label')}>
            <Typography.Text code>{targetId}</Typography.Text>
          </Descriptions.Item>
          
          <Descriptions.Item label={t('admin_msg.current_id_label')}>
            {user ? (
              <Typography.Text code copyable>{user.authUserId}</Typography.Text>
            ) : (
              <Space>
                <Typography.Text type="danger">{t('admin_msg.not_logged_in')}</Typography.Text>
                <Button type="link" size="small" onClick={() => history.push('/login')}>{t('admin_msg.login_here')}</Button>
              </Space>
            )}
          </Descriptions.Item>
          
          <Descriptions.Item label={t('admin_msg.match_status_label')}>
            {!user ? (
              <Typography.Text type="secondary">{t('admin_msg.waiting_login')}</Typography.Text>
            ) : idsMatch ? (
              <Typography.Text style={{ color: '#faad14' }} strong>{t('admin_msg.self_diagnostic')}</Typography.Text>
            ) : isAdmin ? (
              <Typography.Text type="success" strong>{t('admin_msg.other_approval')}</Typography.Text>
            ) : (
              <Typography.Text type="danger" strong>{t('admin_msg.mismatch_error')}</Typography.Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={t('admin_msg.current_role_label')}>
            <Typography.Text strong>{user?.roleName || 'N/A'}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider>{t('admin_msg.server_log_title')}</Divider>
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
          <Typography.Text code>{serverDebug}</Typography.Text>
        </div>

        <Divider>{t('admin_msg.raw_json_title')}</Divider>
        <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '8px', overflow: 'auto', fontSize: '11px', maxHeight: '200px' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default AdminMessage;
