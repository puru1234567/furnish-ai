-- FurnishAI Catalog Configuration - Phase 5
-- Run after vendor-catalog-schema.sql and the Admin schemas.

create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.catalog_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  value_type text not null check (value_type in ('text', 'number', 'boolean', 'select', 'multi_select')),
  is_required boolean not null default false,
  allowed_values jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_category_attributes (
  category_id uuid not null references public.catalog_categories(id) on delete cascade,
  attribute_id uuid not null references public.catalog_attributes(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (category_id, attribute_id)
);

create table if not exists public.catalog_requirements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.catalog_categories(id) on delete cascade,
  field_key text not null,
  label text not null,
  is_required boolean not null default true,
  validation_rules jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, field_key)
);

create table if not exists public.catalog_configuration_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  entity_type text not null check (entity_type in ('category', 'attribute', 'requirement', 'category_attribute')),
  entity_id uuid,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_catalog_categories_parent on public.catalog_categories(parent_id, sort_order);
create index if not exists idx_catalog_categories_active on public.catalog_categories(is_active, sort_order);
create index if not exists idx_catalog_attributes_active on public.catalog_attributes(is_active);
create index if not exists idx_catalog_requirements_category on public.catalog_requirements(category_id, sort_order);
create index if not exists idx_catalog_config_audit_entity on public.catalog_configuration_audit(entity_type, entity_id, created_at desc);

alter table public.catalog_categories enable row level security;
alter table public.catalog_attributes enable row level security;
alter table public.catalog_category_attributes enable row level security;
alter table public.catalog_requirements enable row level security;
alter table public.catalog_configuration_audit enable row level security;

-- Active configuration is readable only through the server/API contract.
-- Admin writes use the service-role client after permission checks.
