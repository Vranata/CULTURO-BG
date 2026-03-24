import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'antd';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '40px 24px' }}>
      <h1>Детайли за събитие #{id}</h1>
      <p>Очаквайте скоро подробности тук.</p>
      <Button onClick={() => navigate('/events')}>Назад към всички събития</Button>
    </div>
  );
};

export default EventDetails;
