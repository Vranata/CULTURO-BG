import React from 'react';
import { Typography, Button, Space } from 'antd';
import { Link } from 'atomic-router-react';
import { CalendarOutlined } from '@ant-design/icons';
import { routes } from '../../shared/routing';

const { Title, Paragraph } = Typography;

const Hero: React.FC = () => {
  return (
    <div
      style={{
        padding: '80px 24px',
        textAlign: 'center',
        background: 'var(--hero-bg)',
        color: 'var(--hero-text)',
        borderRadius: '20px',
        marginBottom: '40px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <Title level={1} style={{ color: 'var(--hero-text)', fontSize: 'clamp(2rem, 5vw, 4rem)', marginBottom: '24px', fontWeight: 800 }}>
        Открий най-добрите събития за теб
      </Title>
      <Paragraph style={{ color: 'var(--hero-text)', fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', maxWidth: '800px', margin: '0 auto 40px' }}>
        Платформа за персонализирано представяне и лесен достъп до културни, спортни и обществени мероприятия във вашия град.
      </Paragraph>
      <Space size="large">
        <Link to={routes.events}>
          <Button
            type="primary"
            size="large"
            icon={<CalendarOutlined />}
            style={{ height: '50px', padding: '0 40px', fontSize: '1.2rem', borderRadius: '25px', border: 'none', background: 'var(--hero-button-bg)', color: 'var(--hero-button-text)', boxShadow: '0 10px 28px rgba(0,0,0,0.12)', fontWeight: 700 }}
          >
            Към събитията
          </Button>
        </Link>
      </Space>
    </div>
  );
};

export default Hero;
