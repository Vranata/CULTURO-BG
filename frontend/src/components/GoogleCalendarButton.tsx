import React from 'react';
import { Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { EventItem } from '../entities/events/model';
import { buildGoogleCalendarUrl } from '../shared/googleCalendar';

type GoogleCalendarButtonProps = {
  event: EventItem;
  compact?: boolean;
  iconOnly?: boolean;
};

const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ event, compact = false, iconOnly = false }) => {
  const { t } = useTranslation();
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
      title={t('calendar.title')}
      aria-label={t('calendar.title')}
      style={{
        width: iconOnly ? (compact ? 34 : 38) : undefined,
        minWidth: iconOnly ? (compact ? 34 : 38) : (compact ? 126 : 144),
        paddingInline: iconOnly ? 0 : undefined,
        fontWeight: 700,
        borderRadius: iconOnly ? 999 : 12,
      }}
    >
      {iconOnly ? null : t('calendar.label')}
    </Button>
  );
};

export default GoogleCalendarButton;