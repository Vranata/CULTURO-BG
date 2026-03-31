import React, { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import { Link } from 'atomic-router-react';
import { Button, Typography, Space, Tag, Divider, Row, Col, Card, Spin } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, ArrowLeftOutlined, TagOutlined } from '@ant-design/icons';
import { routes } from '../../shared/routing';
import { $events, $isLoading, eventsPageOpened } from '../../entities/events/model';

const { Title, Paragraph, Text } = Typography;

const EventDetails: React.FC = () => {
  // Get the ID from the atomic-router route params
  const params = useUnit(routes.eventDetails.$params);
  const id = params?.id;
  const { events, openPage } = useUnit({
    events: $events,
    openPage: eventsPageOpened,
  });
  const isLoading = useUnit($isLoading);
  const [hasRequested, setHasRequested] = useState(() => events.length > 0);

  useEffect(() => {
    setHasRequested(true);
    if (events.length === 0) {
      openPage();
    }
  }, [events.length, openPage]);

  // Намиране на съответното събитие от масива със Supabase данни
  const event = events.find((currentEvent) => currentEvent.id === id);

  if (((isLoading || !hasRequested) && events.length === 0)) {
    return (
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
        <Spin size="large" tip="Зареждане на събитието..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <Title level={2} style={{ color: 'var(--text-primary)' }}>Събитието не е намерено</Title>
        <Link to={routes.events}>
          <Button type="primary">Назад към списъка</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', color: 'var(--text-primary)' }}>
      <Link to={routes.events}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          style={{ marginBottom: '24px' }}
        >
          Назад към списъка
        </Button>
      </Link>

      <Row gutter={[40, 40]}>
        {/* Лява колона: Селекция с голямо изображение */}
        <Col xs={24} lg={16}>
          <img 
            src={event.image} 
            alt={event.title} 
            style={{ 
              width: '100%', 
              borderRadius: '12px', 
              boxShadow: 'var(--shadow-soft)',
              maxHeight: '500px',
              objectFit: 'cover'
            }} 
          />
          
          <div style={{ marginTop: '32px' }}>
            <Title level={1} style={{ color: 'var(--text-primary)' }}>{event.title}</Title>
            <Space size={[0, 8]} wrap style={{ marginBottom: '24px' }}>
              <Tag color="blue" icon={<TagOutlined />}>{event.category}</Tag>
              <Tag color="orange" icon={<EnvironmentOutlined />}>{event.city}</Tag>
              <Tag color="green" icon={<CalendarOutlined />}>{event.date}</Tag>
            </Space>
            
            <Divider />
            
            <Title level={3} style={{ color: 'var(--text-primary)' }}>Относно събитието</Title>
            <Paragraph style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              {event.description}
            </Paragraph>
          </div>
        </Col>

        {/* Дясна колона: Детайли и CTA */}
        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)', position: 'sticky', top: '100px' }}>
            <Title level={4} style={{ color: 'var(--text-primary)' }}>Информация за локация</Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text style={{ display: 'block', color: 'var(--text-secondary)' }}>Дата и час:</Text>
                <Text strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{event.date}</Text>
              </div>
              <div>
                <Text style={{ display: 'block', color: 'var(--text-secondary)' }}>Град:</Text>
                <Text strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{event.city}</Text>
              </div>
              <Divider />
              <Button type="primary" block size="large">
                Запиши се / Билети
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EventDetails;
