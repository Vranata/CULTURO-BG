import React from 'react';
import { Button, message } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import type { EventItem } from '../entities/events/model';

type ShareEventButtonProps = {
  event: EventItem;
  compact?: boolean;
  iconOnly?: boolean;
};

const buildEventUrl = (eventId: string) => `${window.location.origin}/events/${eventId}`;

const ShareEventButton: React.FC<ShareEventButtonProps> = ({ event, compact = false, iconOnly = false }) => {
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
      message.success('Линкът към събитието беше копиран.');
    } catch {
      try {
        await navigator.clipboard.writeText(eventUrl);
        message.success('Линкът към събитието беше копиран.');
      } catch {
        message.error('Неуспешно споделяне на събитието.');
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
      title="Сподели събитието"
      aria-label="Сподели събитието"
      style={{
        width: iconOnly ? (compact ? 34 : 38) : undefined,
        minWidth: iconOnly ? (compact ? 34 : 38) : (compact ? 126 : 144),
        paddingInline: iconOnly ? 0 : undefined,
        fontWeight: 700,
        borderRadius: iconOnly ? 999 : 12,
      }}
    >
      {iconOnly ? null : 'Сподели'}
    </Button>
  );
};

export default ShareEventButton;