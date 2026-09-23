-- FurnishAI Admin Portal - Phase 6: inventory, pricing, marketplace controls
-- Run after vendor-catalog-schema.sql and admin-vendor-management-schema.sql.

create table if not exists public.inventory_adjustment_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vendor_products(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('vendor', 'admin_override', 'system')),
  actor_id uuid references public.profiles(id),
  previous_quantity integer not null,
  new_quantity integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.price_adjustment_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vendor_products(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('vendor', 'admin_override', 'system')),
  actor_id uuid references public.profiles(id),
  previous_price numeric(12,2) not null,
  new_price numeric(12,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_listing_schedules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vendor_products(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('activate', 'deactivate')),
  execute_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'executed', 'cancelled', 'failed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists idx_inventory_adjustments_product on public.inventory_adjustment_events(product_id, created_at desc);
create index if not exists idx_inventory_adjustments_vendor on public.inventory_adjustment_events(vendor_id, created_at desc);
create index if not exists idx_price_adjustments_product on public.price_adjustment_events(product_id, created_at desc);
create index if not exists idx_price_adjustments_vendor on public.price_adjustment_events(vendor_id, created_at desc);
create index if not exists idx_listing_schedules_execute on public.marketplace_listing_schedules(status, execute_at);

alter table public.inventory_adjustment_events enable row level security;
alter table public.price_adjustment_events enable row level security;
alter table public.marketplace_listing_schedules enable row level security;

-- Admin APIs use the service-role client after permission checks.
-- Vendor writes should append source='vendor'; Admin writes append source='admin_override'.
