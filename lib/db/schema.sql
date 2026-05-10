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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT products_pk PRIMARY KEY (id)
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
