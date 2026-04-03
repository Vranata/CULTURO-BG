import React from 'react';
import { Button, message } from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import { $likedEventIds, toggleEventLikeFx } from '../entities/events/model';
import { $user } from '../entities/model';

type EventLikeButtonProps = {
  eventId: string;
  compact?: boolean;
  block?: boolean;
};

const EventLikeButton: React.FC<EventLikeButtonProps> = ({ eventId, compact = false, block = false }) => {
  const { user, likedEventIds, toggleLike, isToggling } = useUnit({
    user: $user,
    likedEventIds: $likedEventIds,
    toggleLike: toggleEventLikeFx,
    isToggling: toggleEventLikeFx.pending,
  });

  const isLiked = likedEventIds.includes(eventId);

  const handleClick = async () => {
    if (!user) {
      message.info('Влез в профила си, за да харесваш събития.');
      return;
    }

    const userId = Number(user.id);

    if (Number.isNaN(userId)) {
      message.error('Профилът не е синхронизиран. Презареди страницата.');
      return;
    }

    try {
      await toggleLike({
        userId: String(userId),
        eventId,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Неуспешно харесване на събитието.');
    }
  };

  return (
    <Button
      type={isLiked ? 'primary' : 'default'}
      ghost={!isLiked}
      icon={isLiked ? <HeartFilled /> : <HeartOutlined />}
      onClick={handleClick}
      loading={isToggling}
      block={block}
      size={compact ? 'small' : 'middle'}
      style={isLiked ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
    >
      {isLiked ? 'Харесано' : 'Харесай'}
    </Button>
  );
};

export default EventLikeButton;
