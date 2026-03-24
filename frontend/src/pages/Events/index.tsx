import React, { useState, useMemo } from 'react';
import { Card, Col, Row, Button, Tag, Typography, Space, Input, Select, Empty } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, ArrowRightOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DUMMY_EVENTS } from '../../services/constants';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const Events: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Извличане на уникални градове и категории за филтрите
  const cities = useMemo(() => Array.from(new Set(DUMMY_EVENTS.map(e => e.city))), []);
  const categories = useMemo(() => Array.from(new Set(DUMMY_EVENTS.map(e => e.category))), []);

  // Логика за филтриране
  const filteredEvents = useMemo(() => {
    return DUMMY_EVENTS.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchText.toLowerCase()) || 
                           event.description.toLowerCase().includes(searchText.toLowerCase());
      const matchesCity = !selectedCity || event.city === selectedCity;
      const matchesCategory = !selectedCategory || event.category === selectedCategory;
      
      return matchesSearch && matchesCity && matchesCategory;
    });
  }, [searchText, selectedCity, selectedCategory]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: '40px' }}>
        <Title level={2}>Всички събития</Title>
        <Paragraph>Открий най-интересното, което предстои във вашия град.</Paragraph>
        
        {/* Филтри и Търсене */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Search 
              placeholder="Търси по име или описание..." 
              allowClear 
              enterButton={<SearchOutlined />} 
              size="large"
              onSearch={value => setSearchText(value)}
              onChange={e => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              placeholder="Избери град"
              style={{ width: '100%' }}
              size="large"
              allowClear
              onChange={value => setSelectedCity(value)}
              options={cities.map(city => ({ label: city, value: city }))}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              placeholder="Категория"
              style={{ width: '100%' }}
              size="large"
              allowClear
              onChange={value => setSelectedCategory(value)}
              options={categories.map(cat => ({ label: cat, value: cat }))}
            />
          </Col>
        </Row>
      </Space>

      {filteredEvents.length > 0 ? (
        <Row gutter={[24, 24]}>
          {filteredEvents.map((event) => (
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
      ) : (
        <div style={{ padding: '80px 0' }}>
          <Empty 
            description={
              <span>Няма намерени събития, отговарящи на вашите филтри.</span>
            } 
          >
            <Button type="primary" onClick={() => { setSearchText(''); setSelectedCity(null); setSelectedCategory(null); }}>
              Изчисти филтрите
            </Button>
          </Empty>
        </div>
      )}
    </div>
  );
};

export default Events;
