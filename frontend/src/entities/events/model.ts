import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { supabase } from '../../services/supabaseClient';

export type EventItem = {
  id: string;
  title: string;
  artist: string;
  description: string;
  city: string;
  date: string;
  image: string;
  category: string;
};

type SupabaseEventRow = {
  id_event: number;
  name_event: string;
  name_artist: string;
  description: string;
  picture: string | null;
  start_date: string;
  regions: Array<{ region: string }> | null;
  event_category: Array<{ name_event_category: string }> | null;
};

const fallbackImage = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80';

const formatDate = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('bg-BG');
};

const getFirstRelation = <T,>(relation: T[] | T | null | undefined): T | null => {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
};

const mapEventRow = (row: SupabaseEventRow): EventItem => ({
  id: String(row.id_event),
  title: row.name_event,
  artist: row.name_artist,
  description: row.description,
  city: getFirstRelation(row.regions)?.region ?? 'Непосочен регион',
  date: formatDate(row.start_date),
  image: row.picture ?? fallbackImage,
  category: getFirstRelation(row.event_category)?.name_event_category ?? 'Без категория',
});

const filterEvents = (events: EventItem[], search: string, city: string | null, category: string | null) => {
  const normalizedSearch = search.trim().toLowerCase();

  return events.filter((event) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      event.title.toLowerCase().includes(normalizedSearch) ||
      event.artist.toLowerCase().includes(normalizedSearch) ||
      event.description.toLowerCase().includes(normalizedSearch);
    const matchesCity = !city || event.city === city;
    const matchesCategory = !category || event.category === category;

    return matchesSearch && matchesCity && matchesCategory;
  });
};

export const fetchEventsFx = createEffect(async (): Promise<EventItem[]> => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id_event,
      name_event,
      name_artist,
      description,
      picture,
      start_date,
      regions ( region ),
      event_category ( name_event_category )
    `)
    .order('start_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapEventRow(row as SupabaseEventRow));
});

export const eventsPageOpened = createEvent<void>();
export const searchChanged = createEvent<string>();
export const cityChanged = createEvent<string | null>();
export const categoryChanged = createEvent<string | null>();

export const $events = createStore<EventItem[]>([]).on(fetchEventsFx.doneData, (_, nextEvents) => nextEvents);
export const $isLoading = fetchEventsFx.pending;
export const $searchText = createStore<string>('').on(searchChanged, (_, next) => next);
export const $selectedCity = createStore<string | null>(null).on(cityChanged, (_, next) => next);
export const $selectedCategory = createStore<string | null>(null).on(categoryChanged, (_, next) => next);

export const $filteredEvents = combine({
  events: $events,
  search: $searchText,
  city: $selectedCity,
  category: $selectedCategory,
}).map(({ events, search, city, category }) => filterEvents(events, search, city, category));

export const $uniqueCities = $events.map((events) =>
  Array.from(new Set(events.map((event) => event.city)))
);

export const $uniqueCategories = $events.map((events) =>
  Array.from(new Set(events.map((event) => event.category)))
);

sample({
  clock: eventsPageOpened,
  target: fetchEventsFx,
});
