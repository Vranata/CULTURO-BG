import React from 'react';
import { Card, Col, Row, Button, Tag, Typography, Space } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DUMMY_EVENTS } from '../../services/constants';

const { Title, Paragraph, Text } = Typography;

const Events: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: '40px' }}>
        <Title level={2}>Всички събития</Title>
        <Paragraph>Открий най-интересното, което предстои във вашия град.</Paragraph>
      </Space>

      <Row gutter={[24, 24]}>
        {DUMMY_EVENTS.map((event) => (
          <Col xs={24} sm={12} lg={8} key={event.id}>
            <Card
              hoverable
              cover={
                <img
                  alt={event.title}
                  src={event.image}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
              }
              actions={[
                <Button 
                  type="link" 
                  key="view" 
                  icon={<ArrowRightOutlined />} 
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  Виж повече
                </Button>,
              ]}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' }}}
            >
              <div style={{ marginBottom: '12px' }}>
                <Tag color="blue">{event.category}</Tag>
              </div>
              <Title level={4} style={{ marginBottom: '8px' }}>{event.title}</Title>
              <Paragraph 
                ellipsis={{ rows: 2 }} 
                type="secondary" 
                style={{ flex: 1 }}
              >
                {event.description}
              </Paragraph>
              
              <Space direction="vertical" size={2} style={{ marginTop: 'auto' }}>
                <Space>
                  <EnvironmentOutlined style={{ color: '#1890ff' }} />
                  <Text strong>{event.city}</Text>
                </Space>
                <Space>
                  <CalendarOutlined style={{ color: '#1890ff' }} />
                  <Text type="secondary">{event.date}</Text>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Events;
