import React from 'react';
import { Button, Result } from 'antd';
import { history } from '../../shared/routing';

const AdminMessage: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const type = (searchParams.get('type') as 'success' | 'error' | 'info' | 'warning') || 'info';
  const text = searchParams.get('text') || 'Жалбата е обработена успешно.';

  const handleBack = () => {
    history.push('/');
  };

  return (
    <div style={{ padding: '50px 0', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status={type}
        title={type === 'success' ? 'Успешна операция' : 'Възникна проблем'}
        subTitle={text}
        extra={[
          <Button type="primary" key="home" onClick={handleBack}>
            Към началната страница
          </Button>,
        ]}
      />
    </div>
  );
};

export default AdminMessage;
