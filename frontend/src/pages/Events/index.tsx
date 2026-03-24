import React from 'react';
import { Card, Col, Row, Button, Tag, Typography, Space } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

// Дефиниране на интерфейса за събитие
interface EventItem {
  id: string;
  title: string;
  city: string;
  date: string;
  category: string;
  description: string;
  image: string;
}

// Примерни данни (Dummy data)
const dummyEvents: EventItem[] = [
  {
    id: '1',
    title: 'Джаз под звездите',
    city: 'София',
    date: '20.06.2026',
    category: 'Музика',
    description: 'Насладете се на магическа вечер с най-добрите джаз изпълнители в Борисовата градина.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Маратон „Варна“',
    city: 'Варна',
    date: '15.05.2026',
    category: 'Спорт',
    description: 'Годишният маратон на град Варна събира ентусиасти от цялата страна край морския бряг.',
    image: 'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Изложба „Модерно изкуство“',
    city: 'Пловдив',
    date: '02.04.2026',
    category: 'Култура',
    description: 'Галерия Капана представя кураторска селекция от съвременни български артисти.',
    image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Технологична конференция VBG',
    city: 'Велико Търново',
    date: '10.07.2026',
    category: 'Технологии',
    description: 'Най-голямото ИТ събитие в региона, фокусирано върху бъдещето на уеб разработката и AI.',
    image: 'https://images.unsplash.com/photo-1505373676634-1cd1d88a141d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
];

const Events: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: '40px' }}>
        <Title level={2}>Всички събития</Title>
        <Paragraph>Открий най-интересното, което предстои във вашия град.</Paragraph>
      </Space>

      <Row gutter={[24, 24]}>
        {dummyEvents.map((event) => (
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
