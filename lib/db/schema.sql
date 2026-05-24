-- FurnishAI Furniture Inventory Schema
-- Normalized design with structured fields + searchable text blob for hybrid retrieval

-- Products table: stores core furniture inventory
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price > 0),
  brand TEXT NOT NULL,
  
  -- Dimensions (cm)
  width_cm NUMERIC NOT NULL,
  depth_cm NUMERIC NOT NULL,
  height_cm NUMERIC NOT NULL,
  
  -- Durability and maintenance
  durability TEXT NOT NULL CHECK (durability IN ('low', 'medium', 'high')),
  durability_score NUMERIC NOT NULL CHECK (durability_score >= 1 AND durability_score <= 5),
  maintenance_ease TEXT NOT NULL CHECK (maintenance_ease IN ('low', 'medium', 'high')),
  warranty_years NUMERIC NOT NULL CHECK (warranty_years >= 0),
  
  -- Assembly and logistics
  assembly_complexity TEXT NOT NULL CHECK (assembly_complexity IN ('low', 'medium', 'high')),
  delivery_available BOOLEAN NOT NULL DEFAULT true,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  
  -- Product details
  material TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  product_url TEXT,
  rating NUMERIC NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_count NUMERIC NOT NULL CHECK (review_count >= 0),
  
  -- JSON arrays for flexible multi-value fields
  style_tags TEXT[] NOT NULL DEFAULT '{}',
  product_tags TEXT[] NOT NULL DEFAULT '{}',
  cities TEXT[] NOT NULL DEFAULT '{}',
  
  -- Denormalized searchable blob for hybrid retrieval
  -- Combines name, description, tags, material, brand, style, etc.
  search_blob TEXT NOT NULL,
  
  -- Vector embedding for semantic search (pgvector compatible)
  -- Dimensions: 1536 (OpenAI text-embedding-3-small) or 768 (SBERT)
  -- embedding vector(1536),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for filtering and search
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_city ON products USING GIN(cities);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_delivery ON products(delivery_available);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

-- Full-text search index on search_blob
CREATE INDEX IF NOT EXISTS idx_products_search_blob_fts ON products USING GIN(
  to_tsvector('english', search_blob)
);

-- Vector index (when embeddings are added)
-- CREATE INDEX IF NOT EXISTS idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Cache tables for frequently accessed queries
CREATE TABLE IF NOT EXISTS product_cache (
  cache_key TEXT PRIMARY KEY,
  category TEXT,
  city TEXT,
  data JSONB NOT NULL,
  cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT cache_expiry CHECK (expires_at > cached_at)
);

-- Analytics: lightweight event stream for passive context and micro-responses
CREATE TABLE IF NOT EXISTS session_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_cache_expires ON product_cache(expires_at);

-- Audit log for data changes (optional, for compliance/debugging)
CREATE TABLE IF NOT EXISTS product_audit_log (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_log_product_id ON product_audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON product_audit_log(changed_at);

-- User preferences (budget habits, city, categories searched)
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_city text,
  typical_budget_min integer,
  typical_budget_max integer,
  preferred_styles text[] DEFAULT ARRAY[]::text[],
  preferred_categories text[] DEFAULT ARRAY[]::text[],
  avoided_materials text[] DEFAULT ARRAY[]::text[],
  updated_at timestamptz DEFAULT now()
);

-- Each search/find session
CREATE TABLE IF NOT EXISTS search_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  furniture_category text,
  room_type text,
  budget_min integer,
  budget_max integer,
  budget_flexibility text,
  city text,
  must_have_features text[] DEFAULT ARRAY[]::text[],
  avoided_materials text[] DEFAULT ARRAY[]::text[],
  style_preference text,
  who_uses text[] DEFAULT ARRAY[]::text[],
  additional_notes text,
  result_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Room analyses tied to sessions
CREATE TABLE IF NOT EXISTS room_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES search_sessions(id) ON DELETE CASCADE,
  wall_color text,
  floor_type text,
  room_style text,
  room_density text,
  natural_light text,
  layout_type text,
  width_cm integer,
  depth_cm integer,
  raw_analysis jsonb,
  created_at timestamptz DEFAULT now()
);

-- Saved/hearted results
CREATE TABLE IF NOT EXISTS saved_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES search_sessions(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  product_name text,
  product_price integer,
  product_brand text,
  why_it_fits text,
  product_url text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Rejection history
CREATE TABLE IF NOT EXISTS rejection_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES search_sessions(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  rejection_reason text,
  rejected_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Passive signals per session
CREATE TABLE IF NOT EXISTS passive_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES search_sessions(id) ON DELETE CASCADE,
  device_type text,
  time_of_day text,
  referrer_source text,
  is_return_visitor boolean DEFAULT false,
  city_from_timezone text,
  created_at timestamptz DEFAULT now()
);

-- Product click tracking
CREATE TABLE IF NOT EXISTS product_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES search_sessions(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  product_name text,
  rank_position integer,
  price integer,
  clicked_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own data
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE passive_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "users own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own sessions" ON search_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own room analyses" ON room_analyses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own saved results" ON saved_results
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own rejections" ON rejection_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own passive signals" ON passive_signals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own clicks" ON product_clicks
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_saved_results_user 
  ON saved_results(user_id);
CREATE INDEX IF NOT EXISTS idx_rejection_history_user 
  ON rejection_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_user 
  ON search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_product_clicks_user 
  ON product_clicks(user_id);
