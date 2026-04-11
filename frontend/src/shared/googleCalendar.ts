import type { EventItem } from '../entities/events/model';

const buildEventDateTime = (dateValue: string, timeValue: string) => {
  const parsedDate = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

export const buildGoogleCalendarUrl = (event: EventItem) => {
  const searchParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.title} - ${event.artist}`,
    details: event.description,
    location: [event.place, event.region].filter(Boolean).join(', '),
    sf: 'true',
    output: 'xml',
  });

  const startDateTime = buildEventDateTime(event.startDate, event.startHour);
  const endDateTime = buildEventDateTime(event.endDate, event.endHour);

  if (startDateTime && endDateTime) {
    return `https://calendar.google.com/calendar/render?${searchParams.toString()}&dates=${startDateTime}/${endDateTime}`;
  }

  return `https://calendar.google.com/calendar/render?${searchParams.toString()}`;
};