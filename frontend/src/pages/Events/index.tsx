import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Card, Col, DatePicker, FloatButton, Input, message, Popconfirm, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import { ArrowRightOutlined, CalendarOutlined, ClockCircleOutlined, CloseCircleOutlined, DeleteOutlined, DownCircleOutlined, EditOutlined, EnvironmentOutlined, FireOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'atomic-router-react';
import EventLikeButton from '../../components/EventLikeButton';
import GoogleCalendarButton from '../../components/GoogleCalendarButton';
import ShareEventButton from '../../components/ShareEventButton';
import EventEditorModal from '../../components/EventEditorModal';
import {
  $enrichedCategoryOptions,
  $events,
  $isLoading,
  clearLikedEventIds,
  fetchLikedEventIdsFx,
  $regionOptions,
  $searchText,
  $selectedCategoryId,
  $selectedDate,
  $selectedRegionId,
  addEventFx,
  categoryChanged,
  dateChanged,
  deleteEventFx,
  eventsPageOpened,
  type EventEditorValues,
  type EventItem,
  regionChanged,
  searchChanged,
  updateEventFx,
  eventsLoadMore,
  $hasMoreEvents,
} from '../../entities/events/model';
import {
  $isAdmin,
  $isSpecialUser,
  $user,
} from '../../entities/model';
import { $effectiveRegionId } from '../../entities/location/model';
import { supabase } from '../../services/supabaseClient';
import { routes } from '../../shared/routing';

const { Title, Paragraph } = Typography;

type EventSortMode = 'newest' | 'nearest' | 'liked' | 'latest';


const sortModeIcons: Record<EventSortMode, React.ReactNode> = {
  newest: <ClockCircleOutlined />,
  nearest: <EnvironmentOutlined />,
  liked: <FireOutlined />,
  latest: <PlusOutlined />,
};

const compareUpcomingEvents = (leftEvent: EventItem, rightEvent: EventItem) => {
  const dateCompare = leftEvent.startDate.localeCompare(rightEvent.startDate);

  if (dateCompare !== 0) {
    return dateCompare;
  }

  const hourCompare = leftEvent.startHour.localeCompare(rightEvent.startHour);

  if (hourCompare !== 0) {
    return hourCompare;
  }

  return Number(leftEvent.id) - Number(rightEvent.id);
};

const compareLatestAddedEvents = (leftEvent: EventItem, rightEvent: EventItem) => Number(rightEvent.id) - Number(leftEvent.id);

const isPastEvent = (event: EventItem, today: dayjs.Dayjs) => dayjs(event.endDate).isBefore(today, 'day');

const getNewestSortDate = (event: EventItem, today: dayjs.Dayjs) => {
  const startDate = dayjs(event.startDate);

  if (startDate.isBefore(today, 'day')) {
    return today;
  }

  return startDate.startOf('day');
};

type FilterSelectProps = {
  placeholder: string;
  value: string | null;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string | null) => void;
  onClear: () => void;
};

const FilterSelect: React.FC<FilterSelectProps> = ({ placeholder, value, options, onChange, onClear }) => {
  const [hovered, setHovered] = useState(false);
  const hasValue = value !== null && value !== undefined && value !== '';
  const showClear = hasValue && hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: '100%' }}
    >
      <Select
        placeholder={placeholder}
        style={{ width: '100%' }}
        size="large"
        allowClear={false}
        value={value}
        onChange={onChange}
        suffixIcon={
          <span
            onMouseDown={(event) => {
              if (showClear) {
                event.preventDefault();
              }
            }}
            onClick={(event) => {
              if (showClear) {
                event.preventDefault();
                event.stopPropagation();
                onClear();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              color: 'var(--accent)',
              cursor: showClear ? 'pointer' : 'default',
              pointerEvents: showClear ? 'auto' : 'none',
              transition: 'transform 0.2s ease, color 0.2s ease, background 0.2s ease',
              background: showClear ? 'rgba(198, 90, 0, 0.12)' : 'transparent',
            }}
          >
            {showClear ? <CloseCircleOutlined /> : <DownCircleOutlined />}
          </span>
        }
        options={options}
      />
    </div>
  );
};

type EventLikeCountRow = {
  id_event: number;
};

const Events: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [hasRequested, setHasRequested] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<EventSortMode>('newest');
  const [eventLikeCounts, setEventLikeCounts] = useState<Record<string, number>>({});
  const {
    events,
    isLoading,
    isAdmin,
    isSpecialUser,
    user,
    effectiveRegionId,
    searchText,
    selectedRegionId,
    selectedCategoryId,
    selectedDate,
    regions,
    categories,
    openPage,
    onSearch,
    onRegionChange,
    onCategoryChange,
    onDateChange,
    createEvent,
    changeEvent,
    removeEvent,
    isCreating,
    isUpdating,
    loadMore,
    hasMore,
  } = useUnit({
    events: $events,
    isLoading: $isLoading,
    isAdmin: $isAdmin,
    isSpecialUser: $isSpecialUser,
    user: $user,
    effectiveRegionId: $effectiveRegionId,
    searchText: $searchText,
    selectedRegionId: $selectedRegionId,
    selectedCategoryId: $selectedCategoryId,
    selectedDate: $selectedDate,
    regions: $regionOptions,
    categories: $enrichedCategoryOptions,
    openPage: eventsPageOpened,
    onSearch: searchChanged,
    onRegionChange: regionChanged,
    onCategoryChange: categoryChanged,
    onDateChange: dateChanged,
    createEvent: addEventFx,
    changeEvent: updateEventFx,
    removeEvent: deleteEventFx,
    isCreating: addEventFx.pending,
    isUpdating: updateEventFx.pending,
    loadMore: eventsLoadMore,
    hasMore: $hasMoreEvents,
  });

  const sortModeLabels: Record<EventSortMode, string> = {
    newest: t('events.sort_newest'),
    nearest: t('events.sort_nearest'),
    liked: t('events.sort_liked'),
    latest: t('events.sort_latest'),
  };

  const localizedRegions = useMemo(() => regions.map(reg => ({
    ...reg,
    label: t(`regions.${reg.value}`, reg.label)
  })), [regions, t]);

  const localizedCategories = useMemo(() => categories.map(cat => ({
    ...cat,
    label: t(`categories.${cat.value}`, cat.label)
  })), [categories, t]);

  const currentUserId = user?.id ?? null;
  const canCreateEvent = isAdmin || isSpecialUser;

  const resolveCurrentUserDbId = async (): Promise<number> => {
    const authUserId = user?.authUserId;

    if (!authUserId) {
      throw new Error(t('events.error_profile'));
    }

    const { data, error } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(t('events.error_not_synced'));
    }

    return data.id_user;
  };

  useEffect(() => {
    let cancelled = false;

    const syncLikedEvents = async () => {
      if (!user) {
        clearLikedEventIds();
        return;
      }

      try {
        const currentUserDbId = await resolveCurrentUserDbId();

        if (!cancelled) {
          await fetchLikedEventIdsFx(String(currentUserDbId));
        }
      } catch {
        if (!cancelled) {
          clearLikedEventIds();
        }
      }
    };

    void syncLikedEvents();

    return () => {
      cancelled = true;
    };
  }, [user?.authUserId]);

  useEffect(() => {
    setHasRequested(true);
    openPage();
  }, [openPage]);

  useEffect(() => {
    let cancelled = false;

    const syncLikeCounts = async () => {
      if (events.length === 0) {
        setEventLikeCounts({});
        return;
      }

      const eventIds = events
        .map((event) => Number(event.id))
        .filter((eventId) => !Number.isNaN(eventId));

      if (eventIds.length === 0) {
        setEventLikeCounts({});
        return;
      }

      const { data, error } = await supabase
        .from('event_likes')
        .select('id_event')
        .in('id_event', eventIds);

      if (cancelled) {
        return;
      }

      if (error) {
        setEventLikeCounts({});
        return;
      }

      const nextCounts = ((data ?? []) as EventLikeCountRow[]).reduce<Record<string, number>>((counts, row) => {
        const eventId = String(row.id_event);
        counts[eventId] = (counts[eventId] ?? 0) + 1;
        return counts;
      }, {});

      setEventLikeCounts(nextCounts);
    };

    void syncLikeCounts();

    return () => {
      cancelled = true;
    };
  }, [events]);

  useEffect(() => {
    const sentinel = document.getElementById('events-load-more-sentinel');
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading) {
        loadMore();
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const clearFilters = () => {
    onSearch('');
    onRegionChange(null);
    onCategoryChange(null);
    onDateChange(null);
    setSortMode('newest');
  };

  const sortedEvents = useMemo(() => {
    const nextEvents = [...events];
    const today = dayjs().startOf('day');

    if (sortMode === 'nearest') {
      return nextEvents.sort((leftEvent, rightEvent) => {
        const leftDistance = effectiveRegionId !== null && leftEvent.regionId === effectiveRegionId ? 0 : 1;
        const rightDistance = effectiveRegionId !== null && rightEvent.regionId === effectiveRegionId ? 0 : 1;

        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        return compareUpcomingEvents(leftEvent, rightEvent);
      });
    }

    if (sortMode === 'liked') {
      return nextEvents.sort((leftEvent, rightEvent) => {
        const leftLikes = eventLikeCounts[leftEvent.id] ?? 0;
        const rightLikes = eventLikeCounts[rightEvent.id] ?? 0;

        if (leftLikes !== rightLikes) {
          return rightLikes - leftLikes;
        }

        return compareUpcomingEvents(leftEvent, rightEvent);
      });
    }

    if (sortMode === 'latest') {
      return nextEvents.sort((leftEvent, rightEvent) => {
        const idCompare = compareLatestAddedEvents(leftEvent, rightEvent);

        if (idCompare !== 0) {
          return idCompare;
        }

        return compareUpcomingEvents(leftEvent, rightEvent);
      });
    }

    return nextEvents
      .filter((event) => !isPastEvent(event, today))
      .sort((leftEvent, rightEvent) => {
        const leftDate = getNewestSortDate(leftEvent, today);
        const rightDate = getNewestSortDate(rightEvent, today);

        const dateCompare = leftDate.valueOf() - rightDate.valueOf();

        if (dateCompare !== 0) {
          return dateCompare;
        }

        const leftEndDate = dayjs(leftEvent.endDate).valueOf();
        const rightEndDate = dayjs(rightEvent.endDate).valueOf();

        if (leftEndDate !== rightEndDate) {
          return leftEndDate - rightEndDate;
        }

        const hourCompare = leftEvent.startHour.localeCompare(rightEvent.startHour);

        if (hourCompare !== 0) {
          return hourCompare;
        }

        return Number(leftEvent.id) - Number(rightEvent.id);
      });
  }, [effectiveRegionId, eventLikeCounts, events, sortMode]);

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingEvent(null);
    setEditorError(null);
  };

  const openCreateEditor = () => {
    setEditingEvent(null);
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const openEditEditor = (event: EventItem) => {
    setEditingEvent(event);
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const submitEvent = async (values: EventEditorValues) => {
    if (!user) {
      const errorText = t('events.error_not_logged');
      setEditorError(errorText);
      messageApi.error(errorText);
      return;
    }

    try {
      const currentUserDbId = await resolveCurrentUserDbId();

      const payload = {
        ...values,
        userId: String(currentUserDbId),
        ...(editingEvent ? { id: editingEvent.id } : {}),
      };

      if (editingEvent) {
        await changeEvent(payload);
        messageApi.success(t('events.event_updated'));
      } else {
        await createEvent(payload);
        messageApi.success(t('events.event_created'));
      }

      setEditorError(null);
      closeEditor();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('events.error_save');
      setEditorError(errorText);
      messageApi.error(errorText);
    }
  };

  const deleteEvent = async (event: EventItem) => {
    if (!user) {
      const errorText = t('events.error_not_logged');
      setEditorError(errorText);
      messageApi.error(errorText);
      return;
    }

    try {
      await resolveCurrentUserDbId();
      await removeEvent(event.id);

      if (editingEvent?.id === event.id) {
        closeEditor();
      }

      messageApi.success(t('events.event_deleted'));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('events.error_delete');
      setEditorError(errorText);
      messageApi.error(errorText);
    }
  };

  return (
    <div className="events-page" style={{ width: '100%', padding: '40px 0', color: 'var(--text-primary)' }}>
      {contextHolder}

      <div className="events-page-layout">
        <aside className="events-filters-panel">
          <div className="events-filters-panel-inner">
            <div>
              <div className="events-filters-title">{t('events.filters')}</div>
              <Paragraph style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                {t('events.filters_subtitle')}
              </Paragraph>
            </div>

            <div className="events-filter-group">
              <div className="events-search-row">
                <Input
                  placeholder={t('events.search_placeholder')}
                  allowClear
                  size="large"
                  value={searchText}
                  onChange={(event) => onSearch(event.target.value)}
                  onPressEnter={() => onSearch(searchText)}
                />
                <Button
                  className="events-search-button"
                  type="primary"
                  size="small"
                  shape="circle"
                  icon={<SearchOutlined />}
                  aria-label="Търси"
                  onClick={() => onSearch(searchText)}
                />
              </div>
            </div>

            <div className="events-filter-group">
              <FilterSelect
                placeholder={t('events.region_placeholder')}
                value={selectedRegionId}
                onChange={onRegionChange}
                onClear={() => onRegionChange(null)}
                options={localizedRegions}
              />
            </div>

            <div className="events-filter-group">
              <FilterSelect
                placeholder={t('events.category_placeholder')}
                value={selectedCategoryId}
                onChange={onCategoryChange}
                onClear={() => onCategoryChange(null)}
                options={localizedCategories}
              />
            </div>

            <div className="events-filter-group">
              <DatePicker
                placeholder={t('events.date_placeholder')}
                size="large"
                style={{ width: '100%' }}
                value={selectedDate ? dayjs(selectedDate) : null}
                onChange={(date) => onDateChange(date ? date.format('YYYY-MM-DD') : null)}
              />
            </div>

            <div className="events-filter-group events-sort-group">
              <div className="events-sort-title">{t('events.sort_title')}</div>
              <div className="events-sort-list">
                {(Object.keys(sortModeLabels) as EventSortMode[]).map((mode) => (
                  <Button
                    key={mode}
                    className="events-sort-button"
                    type={sortMode === mode ? 'primary' : 'default'}
                    size="large"
                    icon={sortModeIcons[mode]}
                    block
                    onClick={() => setSortMode(mode)}
                  >
                    {sortModeLabels[mode]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="events-filter-group">
              <Button onClick={clearFilters}>{t('events.clear_filters')}</Button>
            </div>
          </div>
        </aside>

        <div className="events-events-shell">
          <div className="events-page-head">
            <div>
              <Title level={2} style={{ color: 'var(--text-primary)', marginBottom: 0 }}>{t('events.title')}</Title>
              <Paragraph style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>{t('events.subtitle')}</Paragraph>
            </div>

            {canCreateEvent ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateEditor} style={{ alignSelf: 'center' }}>
                {t('events.add_event')}
              </Button>
            ) : null}
          </div>

          <div>
            {((isLoading || !hasRequested) && events.length === 0) ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '96px 0' }}>
                <Spin size="large" description={t('events.loading')} />
              </div>
            ) : sortedEvents.length > 0 ? (
              <Row gutter={[24, 24]}>
                {sortedEvents.map((event) => {
                  const canManageEvent = isAdmin || (isSpecialUser && currentUserId === event.ownerId);

                  return (
                    <Col xs={24} sm={12} lg={8} xl={8} xxl={8} key={event.id}>
                      <Card
                        className="events-event-card"
                        hoverable
                        cover={
                          <img
                            alt={event.title}
                            src={event.image}
                            style={{ height: '240px', objectFit: 'cover' }}
                          />
                        }
                        style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' }}
                        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface-bg)', padding: '16px 18px 18px' } }}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          <Tag color="blue">{event.category}</Tag>
                        </div>
                        <Title level={5} style={{ marginBottom: '6px', color: 'var(--text-primary)' }}>{event.title}</Title>
                        <div className="events-event-meta">
                          <Space size="small" style={{ color: 'var(--text-secondary)' }}>
                            <EnvironmentOutlined /> {event.region}
                          </Space>
                          <Space size="small" style={{ color: 'var(--text-secondary)' }}>
                            <CalendarOutlined /> {event.date}
                          </Space>
                        </div>

                        <div className="events-event-actions">
                          <Link to={routes.eventDetails} params={{ id: event.id }}>
                            <Button type="default" icon={<ArrowRightOutlined />}>
                              {t('events.see_more')}
                            </Button>
                          </Link>

                          <GoogleCalendarButton event={event} compact iconOnly />

                          <ShareEventButton event={event} compact iconOnly />

                          <EventLikeButton eventId={event.id} compact iconOnly />
                        </div>

                        {canManageEvent ? (
                          <div className="events-event-admin-actions">
                            <Button type="default" icon={<EditOutlined />} onClick={() => openEditEditor(event)}>
                              {t('events.edit')}
                            </Button>

                            <Popconfirm
                              title={t('events.delete_confirm')}
                              okText={t('events.delete_ok')}
                              cancelText={t('events.cancel')}
                              onConfirm={() => void deleteEvent(event)}
                            >
                              <Button danger icon={<DeleteOutlined />}>
                                {t('events.delete')}
                              </Button>
                            </Popconfirm>
                          </div>
                        ) : null}
                      </Card>
                    </Col>
                  );
                })}

                {hasMore && (
                  <Col span={24}>
                    <div
                      id="events-load-more-sentinel"
                      style={{
                        height: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '16px'
                      }}
                    >
                      {isLoading ? (
                        <Spin size="large" />
                      ) : (
                        <div style={{ visibility: 'hidden' }}>Sentinel</div>
                      )}
                    </div>
                  </Col>
                )}
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Title level={4} style={{ color: 'var(--text-secondary)' }}>{t('events.no_results')}</Title>
                <Button
                  type="primary"
                  onClick={clearFilters}
                >
                  {t('events.clear_filters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>


      <EventEditorModal
        open={isEditorOpen}
        title={editingEvent ? t('events.edit_editor_title') : t('events.add_editor_title')}
        confirmText={editingEvent ? t('events.save_changes') : t('events.add_event')}
        loading={isCreating || isUpdating}
        event={editingEvent}
        regions={regions}
        categories={categories}
        errorMessage={editorError}
        onCancel={closeEditor}
        onSubmit={submitEvent}
      />

    </div>
  );
};

export default Events;
