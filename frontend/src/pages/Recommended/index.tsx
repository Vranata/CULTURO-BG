import { Button, Card, Col, Empty, Row, Space, Spin, Typography, message } from 'antd';
import { useUnit } from 'effector-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'atomic-router-react';
import { supabase } from '../../services/supabaseClient';
import { routes } from '../../shared/routing';
import EventSpotlightCard from '../../components/EventSpotlightCard';
import {
  $likedEventIds,
  clearLikedEventIds,
  fetchAllEventsFx,
  fetchLikedEventIdsFx,
  type EventItem,
} from '../../entities/events/model';
import { $user } from '../../entities/model';
import { $effectiveRegionId } from '../../entities/location/model';

const { Title, Paragraph, Text } = Typography;
const RECOMMENDED_PAGE_SIZE = 24;

type UserRow = {
  id_user: number;
};

type PreferenceRow = {
  id_event_category: number;
};

const resolveCurrentUserDbId = async (authUserId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id_user')
    .eq('auth_user_id', authUserId)
    .maybeSingle<UserRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data.id_user;
};

const daysUntil = (event: EventItem) => {
  const parsedDate = new Date(event.startDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return Math.ceil((parsedDate.getTime() - Date.now()) / 86_400_000);
};

const Recommended: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [preferredCategoryIds, setPreferredCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(18);

  const { user, effectiveRegionId, likedEventIds, loadAllEvents, loadLikedEventIds, resetLikedEvents } = useUnit({
    user: $user,
    effectiveRegionId: $effectiveRegionId,
    likedEventIds: $likedEventIds,
    loadAllEvents: fetchAllEventsFx,
    loadLikedEventIds: fetchLikedEventIdsFx,
    resetLikedEvents: clearLikedEventIds,
  });

  useEffect(() => {
    const handlePreferenceUpdate = () => {
      setRefreshToken((value) => value + 1);
    };

    window.addEventListener('culturo-preferences-updated', handlePreferenceUpdate);

    return () => {
      window.removeEventListener('culturo-preferences-updated', handlePreferenceUpdate);
    };
  }, []);

  const syncPageData = React.useCallback(async () => {
    setIsLoading(true);
    setDisplayLimit(18);

    try {
      const result = await loadAllEvents();

      if (result) {
        setAllEvents(result);
      }

      if (!user) {
        resetLikedEvents();
        setPreferredCategoryIds([]);
        return;
      }

      const currentUserDbId = await resolveCurrentUserDbId(user.authUserId);

      if (currentUserDbId === null) {
        resetLikedEvents();
        setPreferredCategoryIds([]);
        return;
      }

      await loadLikedEventIds(String(currentUserDbId));

      const { data: preferenceRows, error: preferenceError } = await supabase
        .from('user_likings')
        .select('id_event_category')
        .eq('id_user', currentUserDbId);

      if (preferenceError) throw preferenceError;

      setPreferredCategoryIds(((preferenceRows ?? []) as PreferenceRow[]).map((row) => String(row.id_event_category)));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : t('recommended.error_loading'));
      setAllEvents([]);
      resetLikedEvents();
      setPreferredCategoryIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadAllEvents, loadLikedEventIds, messageApi, resetLikedEvents, user]);

  useEffect(() => {
    void syncPageData();
  }, [refreshToken, user?.authUserId]);

  const recommendedEvents = useMemo(() => {
    const likedEventIdSet = new Set(likedEventIds);
    const likedCategories = new Set(
      allEvents
        .filter((event) => likedEventIdSet.has(event.id))
        .map((event) => event.categoryId)
    );
    const preferredCategories = new Set(preferredCategoryIds);

    return allEvents
      .filter((event) => !likedEventIdSet.has(event.id))
      .map((event) => {
        const reasonTags: string[] = [];
        let score = 1;

        if (effectiveRegionId !== null && event.regionId === effectiveRegionId) {
          score += 4;
          reasonTags.push(t('recommended.reason_region'));
        }

        if (likedCategories.has(event.categoryId) || preferredCategories.has(String(event.categoryId))) {
          score += 3;
          reasonTags.push(t('recommended.reason_category'));
        }

        const remainingDays = daysUntil(event);

        if (remainingDays !== null && remainingDays >= 0 && remainingDays <= 14) {
          score += 2;
          reasonTags.push(t('recommended.reason_soon'));
        }

        if (reasonTags.length === 0) {
          reasonTags.push(t('recommended.reason_upcoming'));
        }

        return {
          event,
          score,
          reasonTags,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const dateCompare = left.event.startDate.localeCompare(right.event.startDate);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return left.event.startHour.localeCompare(right.event.startHour);
      });
  }, [allEvents, effectiveRegionId, likedEventIds, preferredCategoryIds]);

  const hasMore = displayLimit < recommendedEvents.length;

  useEffect(() => {
    const sentinel = document.getElementById('recommended-sentinel');
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayLimit((prev) => prev + RECOMMENDED_PAGE_SIZE);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, recommendedEvents.length]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', color: 'var(--text-primary)' }}>
      {contextHolder}

      <Space orientation="vertical" size="large" style={{ width: '100%', marginBottom: '32px' }}>
        <div>
          <Title level={2} style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{t('recommended.title')}</Title>
          <Paragraph style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
            {t('recommended.subtitle')}
          </Paragraph>
        </div>

        {!user ? (
          <Card variant="borderless" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-soft)' }}>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>{t('recommended.guest_card_title')}</Text>
              <Text style={{ color: 'var(--text-secondary)' }}>{t('recommended.guest_card_text')}</Text>
              <div>
                <Link to={routes.login}>
                  <Button type="primary">{t('auth.login_register')}</Button>
                </Link>
              </div>
            </Space>
          </Card>
        ) : null}
      </Space>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '96px 0' }}>
          <Spin size="large" description={t('recommended.loading')} />
        </div>
      ) : recommendedEvents.length > 0 ? (
        <>
          <Row gutter={[24, 24]}>
            {recommendedEvents.slice(0, displayLimit).map(({ event, reasonTags }) => (
              <Col xs={24} sm={12} lg={8} key={event.id}>
                <EventSpotlightCard event={event} reasonTags={reasonTags} />
              </Col>
            ))}
          </Row>

          {hasMore && (
            <div
              id="recommended-sentinel"
              style={{
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '32px'
              }}
            >
              <Spin size="large" />
            </div>
          )}
        </>
      ) : (
        <Empty
          description={t('recommended.empty')}
          style={{ padding: '96px 0' }}
        >
          <Link to={routes.events}>
            <Button type="primary">{t('recommended.view_all')}</Button>
          </Link>
        </Empty>
      )}
    </div>
  );
};

export default Recommended;