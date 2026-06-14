-- Personalization persistence schema for Furnish AI.
-- Additive schema for taste profiles and vector-ready personalization.

CREATE TABLE IF NOT EXISTS taste_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_version integer NOT NULL DEFAULT 1,
  behavioral_volume integer NOT NULL DEFAULT 0,
  style_preference jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget_preference jsonb NOT NULL DEFAULT '{}'::jsonb,
  room_preference jsonb NOT NULL DEFAULT '{}'::jsonb,
  color_affinity jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_affinity jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  dwell_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  vector_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taste_profiles_updated_at
  ON taste_profiles(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_taste_profiles_category_affinity
  ON taste_profiles USING GIN(category_affinity);

CREATE TABLE IF NOT EXISTS personalization_profile_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event_id uuid,
  signal_type text NOT NULL,
  delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalization_profile_events_user
  ON personalization_profile_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_preference_vectors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL,
  -- Enable pgvector in your database and uncomment the next line:
  -- embedding vector(1536),
  embedding_json jsonb,
  generated_from text NOT NULL DEFAULT 'taste_profile',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_profile_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preference_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own taste profile"
  ON taste_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own personalization profile events"
  ON personalization_profile_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own preference vectors"
  ON user_preference_vectors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
