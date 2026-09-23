-- FurnishAI Admin Portal - Phase 4: platform catalog management
-- Run after vendor-catalog-schema.sql and admin-vendor-management-schema.sql.

create table if not exists public.admin_product_change_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vendor_products(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  field_name text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_product_changes_product on public.admin_product_change_events(product_id, created_at desc);
create index if not exists idx_admin_product_changes_vendor on public.admin_product_change_events(vendor_id, created_at desc);
alter table public.admin_product_change_events enable row level security;

-- Admin catalog APIs use the server service-role client after permission checks.
-- Products are never physically deleted by Admin catalog operations.
