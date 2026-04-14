import React, { useEffect } from 'react';
import { Button, Result, Typography, Card, Descriptions, Divider } from 'antd';
import { useUnit } from 'effector-react';
import { history } from '../../shared/routing';
import { $user, refreshUserProfile } from '../../entities/model';

const AdminMessage: React.FC = () => {
  const { user, refresh } = useUnit({
    user: $user,
    refresh: refreshUserProfile,
  });

  const searchParams = new URLSearchParams(window.location.search);
  const type = (searchParams.get('type') as 'success' | 'error' | 'info' | 'warning') || 'info';
  const text = searchParams.get('text') || 'Операцията приключи.';
  const serverDebug = searchParams.get('debug') || 'Няма данни от сървъра';

  useEffect(() => {
    if (type === 'success') {
      refresh();
    }
  }, [refresh, type]);

  const handleBack = () => {
    history.push('/');
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <Result
          status={type}
          title={type === 'success' ? 'Резултат: Успех' : 'Резулат'}
          subTitle={text}
          extra={[
            <Button type="primary" key="home" onClick={handleBack} size="large" style={{ borderRadius: '8px' }}>
              Към началната страница
            </Button>,
          ]}
        />

        <Divider>Сървърна Диагностика (Edge Function)</Divider>
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          <Typography.Text strong>Отговор от базата данни: </Typography.Text>
          <Typography.Text code>{serverDebug}</Typography.Text>
        </div>

        <Divider>Клиентска Диагностика (Браузър)</Divider>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Имейл (Логнат)">{user?.email || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Роля (Име)">{user?.roleName || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Роля (ID)">{user?.roleId || 'N/A'}</Descriptions.Item>
        </Descriptions>

        <Divider>Raw Debug (Пълен обект)</Divider>
        <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default AdminMessage;
