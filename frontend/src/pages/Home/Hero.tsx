import React from 'react';
import { Typography, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CalendarOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: '80px 24px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        color: '#fff',
        borderRadius: '8px',
        marginBottom: '40px',
      }}
    >
      <Title level={1} style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 4rem)', marginBottom: '24px' }}>
        Открий най-добрите събития за теб
      </Title>
      <Paragraph style={{ color: '#fff', fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', maxWidth: '800px', margin: '0 auto 40px' }}>
        Платформа за персонализирано представяне и лесен достъп до културни, спортни и обществени мероприятия във вашия град.
      </Paragraph>
      <Space size="large">
        <Button
          type="primary"
          size="large"
          icon={<CalendarOutlined />}
          onClick={() => navigate('/events')}
          style={{ height: '50px', padding: '0 40px', fontSize: '1.2rem', borderRadius: '25px', border: 'none', background: '#fff', color: '#1890ff' }}
        >
          Към събитията
        </Button>
      </Space>
    </div>
  );
};

export default Hero;
