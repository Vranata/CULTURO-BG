
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pojinfknlfocjttxirpb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvamluZmtubGZvY2p0dHhpcnBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk2NDM1MywiZXhwIjoyMDkwNTQwMzUzfQ.JFcmF2Qz4ZmEsghsioMFYXVHxXxiuF2MSIqdpwVvTcc';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const SQL_SEARCH_EVENTS_V2 = `
CREATE OR REPLACE FUNCTION public.search_events_v2(
  p_search_text text DEFAULT NULL,
  p_region_id integer DEFAULT NULL,
  p_category_id integer DEFAULT NULL,
  p_event_date date DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id_event integer,
  name_event text,
  name_artist text,
  place_event text,
  description text,
  picture text,
  start_date date,
  start_hour time without time zone,
  end_date date,
  end_hour time without time zone,
  id_region integer,
  id_event_category integer,
  id_user integer,
  region text,
  category text,
  is_free boolean,
  price_info text,
  ticket_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id_event,
    e.name_event,
    e.name_artist,
    e.place_event,
    e.description,
    e.picture,
    e.start_date,
    e.start_hour,
    e.end_date,
    e.end_hour,
    e.id_region,
    e.id_event_category,
    e.id_user,
    r.region as region_name,
    c.name_event_category as category_name,
    e.is_free,
    e.price_info,
    e.ticket_url
  FROM events e
  LEFT JOIN regions r ON e.id_region = r.id_region
  LEFT JOIN event_categories c ON e.id_event_category = c.id_event_category
  WHERE 
    (p_search_text IS NULL OR 
     e.name_event ILIKE '%' || p_search_text || '%' OR 
     e.description ILIKE '%' || p_search_text || '%' OR
     e.name_artist ILIKE '%' || p_search_text || '%')
    AND (p_region_id IS NULL OR e.id_region = p_region_id)
    AND (p_category_id IS NULL OR e.id_event_category = p_category_id)
    AND (p_event_date IS NULL OR e.start_date = p_event_date)
    AND (e.end_date >= CURRENT_DATE) -- Only upcoming events by default
  ORDER BY e.start_date ASC, e.start_hour ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
`;

const SQL_GET_CATEGORY_COUNTS = `
CREATE OR REPLACE FUNCTION public.get_category_counts(
  p_search_text text DEFAULT NULL,
  p_region_id integer DEFAULT NULL,
  p_event_date date DEFAULT NULL
)
RETURNS TABLE (
  categoryId integer,
  eventCount bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id_event_category as categoryId,
    COUNT(*)::bigint as eventCount
  FROM events e
  WHERE 
    (p_search_text IS NULL OR 
     e.name_event ILIKE '%' || p_search_text || '%' OR 
     e.description ILIKE '%' || p_search_text || '%' OR
     e.name_artist ILIKE '%' || p_search_text || '%')
    AND (p_region_id IS NULL OR e.id_region = p_region_id)
    AND (p_event_date IS NULL OR e.start_date = p_event_date)
    AND (e.end_date >= CURRENT_DATE)
  GROUP BY e.id_event_category;
END;
$$;
`;

async function deploy() {
  console.log('Deploying SQL functions...');
  
  // Note: Standard Supabase client doesn't have a direct 'execute_sql' RPC
  // but if the project has a wrapper, we use it. Otherwise, we might need
  // to use another approach or assume we can create them via the REST API
  // if permitted, but usually SQL is run via dashboard or migration tools.
  //
  // WAIT: The best way to deploy SQL from the model is to use an existing
  // SQL endpoint if provided, or ask the user to run it.
  // HOWEVER, I will try to see if I can find a way to run it.
  
  // Alternative: Since I can't easily run raw SQL via the anon/service client 
  // without a pre-existing custom RPC (common in some setups), 
  // I will check if I can use the standard PostgREST approach.
  
  console.log('Attempting to create functions via RPC if available, or logging SQL for manual check.');
  
  // I'll try to find an RPC that executes SQL. If not, I'll log that I need the user to run this in their console.
  console.log('--- SQL FOR search_events_v2 ---');
  console.log(SQL_SEARCH_EVENTS_V2);
  console.log('--- SQL FOR get_category_counts ---');
  console.log(SQL_GET_CATEGORY_COUNTS);
}

deploy();
