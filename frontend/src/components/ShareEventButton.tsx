import React from 'react';
import { Button, message } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { EventItem } from '../entities/events/model';

type ShareEventButtonProps = {
  event: EventItem;
  compact?: boolean;
  iconOnly?: boolean;
};

const buildEventUrl = (eventId: string) => `${window.location.origin}/events/${eventId}`;

const ShareEventButton: React.FC<ShareEventButtonProps> = ({ event, compact = false, iconOnly = false }) => {
  const { t } = useTranslation();
  const handleClick = async () => {
    const eventUrl = buildEventUrl(event.id);

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: `${event.title} - ${event.region}`,
          url: eventUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(eventUrl);
      message.success(t('share.success'));
    } catch {
      try {
        await navigator.clipboard.writeText(eventUrl);
        message.success(t('share.success'));
      } catch {
        message.error(t('share.error'));
      }
    }
  };

  return (
    <Button
      className="event-share-button"
      type="default"
      icon={<ShareAltOutlined />}
      onClick={() => void handleClick()}
      size={compact ? 'small' : 'middle'}
      title={t('share.title')}
      aria-label={t('share.title')}
      style={{
        width: iconOnly ? (compact ? 34 : 38) : undefined,
        minWidth: iconOnly ? (compact ? 34 : 38) : (compact ? 126 : 144),
        paddingInline: iconOnly ? 0 : undefined,
        fontWeight: 700,
        borderRadius: iconOnly ? 999 : 12,
      }}
    >
      {iconOnly ? null : t('share.label')}
    </Button>
  );
};

export default ShareEventButton;