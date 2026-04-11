import React from 'react';
import { Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import type { EventItem } from '../entities/events/model';
import { buildGoogleCalendarUrl } from '../shared/googleCalendar';

type GoogleCalendarButtonProps = {
  event: EventItem;
  compact?: boolean;
  iconOnly?: boolean;
};

const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ event, compact = false, iconOnly = false }) => {
  const calendarUrl = buildGoogleCalendarUrl(event);

  return (
    <Button
      className="google-calendar-button"
      type="default"
      icon={<GoogleOutlined />}
      href={calendarUrl}
      target="_blank"
      rel="noreferrer"
      size={compact ? 'small' : 'middle'}
      title="Добави в Google Calendar"
      aria-label="Добави в Google Calendar"
      style={{
        width: iconOnly ? (compact ? 34 : 38) : undefined,
        minWidth: iconOnly ? (compact ? 34 : 38) : (compact ? 126 : 144),
        paddingInline: iconOnly ? 0 : undefined,
        fontWeight: 700,
        borderRadius: iconOnly ? 999 : 12,
      }}
    >
      {iconOnly ? null : 'Календар'}
    </Button>
  );
};

export default GoogleCalendarButton;