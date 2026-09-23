-- Preserve validated import rows between preview and submit.
-- This is required because the existing import table stores metadata and errors,
-- but not the rows that are waiting to be converted into vendor_products.
alter table public.vendor_catalog_imports
  add column if not exists valid_rows jsonb not null default '[]'::jsonb;
