import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { Button, Modal, message } from 'antd';
import { useUnit } from 'effector-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { $likedEventIds, toggleEventLikeFx } from '../entities/events/model';
import { $user } from '../entities/model';
import { history } from '../shared/routing';

type EventLikeButtonProps = {
  eventId: string;
  compact?: boolean;
  block?: boolean;
  iconOnly?: boolean;
};

const EventLikeButton: React.FC<EventLikeButtonProps> = ({ eventId, compact = false, block = false, iconOnly = false }) => {
  const { t } = useTranslation();
  const { user, likedEventIds, toggleLike, isToggling } = useUnit({
    user: $user,
    likedEventIds: $likedEventIds,
    toggleLike: toggleEventLikeFx,
    isToggling: toggleEventLikeFx.pending,
  });

  const isLiked = likedEventIds.includes(eventId);

  const handleClick = async () => {
    if (!user) {
      Modal.confirm({
        title: t('events.like_modal_title'),
        centered: true,
        okText: t('auth.login_register'),
        cancelText: t('common.cancel'),
        content: (
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('events.like_modal_content')}
          </div>
        ),
        onOk: () => {
          history.push('/login');
        },
      });
      return;
    }

    const userId = Number(user.id);

    if (Number.isNaN(userId)) {
      message.error(t('events.error_not_synced'));
      return;
    }

    try {
      await toggleLike({
        userId: String(userId),
        eventId,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('events.error_like'));
    }
  };

  return (
    <Button
      className="event-like-button"
      data-liked={isLiked ? 'true' : 'false'}
      type="default"
      icon={isLiked ? <HeartFilled /> : <HeartOutlined />}
      onClick={handleClick}
      loading={isToggling}
      block={block}
      size={compact ? 'small' : 'middle'}
      title={isLiked ? t('events.liked') : t('events.like')}
      aria-label={isLiked ? t('events.liked') : t('events.like')}
      style={{
        width: iconOnly ? (compact ? 34 : 38) : undefined,
        minWidth: iconOnly ? (compact ? 34 : 38) : (compact ? 118 : 138),
        paddingInline: iconOnly ? 0 : undefined,
        fontWeight: 700,
        borderRadius: iconOnly ? 999 : 12,
        background: isLiked ? 'var(--accent)' : 'var(--surface-elevated)',
        borderColor: 'var(--accent)',
        color: isLiked ? '#ffffff' : 'var(--accent)',
        boxShadow: isLiked ? '0 10px 24px rgba(24, 144, 255, 0.18)' : '0 8px 18px rgba(15, 23, 42, 0.06)',
      }}
    >
      {iconOnly ? null : (isLiked ? t('events.liked') : t('events.like'))}
    </Button>
  );
};

export default EventLikeButton;
