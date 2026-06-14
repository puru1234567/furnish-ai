-- Analytics v2 schema for behavioral intelligence and personalization pipelines.
-- This is additive to existing tables in schema.sql.

CREATE TABLE IF NOT EXISTS analytics_events_v2 (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  page_path text,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_v2_event_name
  ON analytics_events_v2(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_v2_session_id
  ON analytics_events_v2(session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_v2_user_id
  ON analytics_events_v2(user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_v2_payload_gin
  ON analytics_events_v2 USING GIN(payload);

CREATE TABLE IF NOT EXISTS analytics_search_refinements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  refinement_number integer NOT NULL,
  previous_query text NOT NULL,
  next_query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_search_refinements_session
  ON analytics_search_refinements(session_id, refinement_number);

CREATE TABLE IF NOT EXISTS analytics_recommendation_engagement (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  action text NOT NULL,
  section text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_recommendation_engagement_product
  ON analytics_recommendation_engagement(product_id, created_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_user_preference_signals AS
SELECT
  user_id,
  count(*) FILTER (WHERE event_name = 'product.saved_toggled') AS saved_events,
  count(*) FILTER (WHERE event_name = 'product.compared_toggled') AS compare_events,
  count(*) FILTER (WHERE event_name = 'search.refined') AS search_refinement_events,
  max(occurred_at) AS last_event_at
FROM analytics_events_v2
WHERE user_id IS NOT NULL
GROUP BY user_id;

ALTER TABLE analytics_events_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics insert open"
  ON analytics_events_v2 FOR INSERT WITH CHECK (true);
