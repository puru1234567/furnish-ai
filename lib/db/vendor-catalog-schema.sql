-- FurnishAI Vendor Portal - Phase 2: product catalog
-- Run after vendor-onboarding-schema.sql. Product records are never hard deleted.

create table if not exists public.vendor_products (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, sku text not null, category text not null, description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0), stock integer not null default 0 check (stock >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'vendor_fix_required', 'resubmitted', 'archived')),
  rejection_reason text, is_active boolean not null default false, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(vendor_id, sku)
);

alter table public.vendor_products add column if not exists lifecycle_status text not null default 'inactive' check (lifecycle_status in ('active', 'inactive', 'discontinued', 'archived', 'removal_requested'));

create table if not exists public.vendor_product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.vendor_products(id) on delete cascade,
  storage_path text not null, original_name text not null, alt_text text not null default '', created_at timestamptz not null default now()
);

create table if not exists public.vendor_product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.vendor_products(id) on delete cascade,
  name text not null, option_value text not null default '', sku text not null, price numeric(12,2) not null check (price >= 0), stock integer not null default 0 check (stock >= 0),
  unique(product_id, sku)
);

create table if not exists public.vendor_product_approval_events (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.vendor_products(id) on delete cascade,
  status text not null check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'vendor_fix_required', 'resubmitted', 'archived')),
  comment text, requested_changes jsonb not null default '[]'::jsonb,
  changed_by uuid references public.profiles(id), changed_at timestamptz not null default now()
);

create table if not exists public.vendor_product_activity (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.vendor_products(id) on delete cascade,
  action text not null check (action in ('activate', 'deactivate', 'discontinue', 'archive', 'request_removal', 'restore')),
  from_status text not null, to_status text not null, note text,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create index if not exists idx_vendor_products_vendor_status on public.vendor_products(vendor_id, status);
create index if not exists idx_vendor_products_vendor_updated on public.vendor_products(vendor_id, updated_at desc);
create index if not exists idx_vendor_product_images_product on public.vendor_product_images(product_id);
create index if not exists idx_vendor_product_variants_product on public.vendor_product_variants(product_id);
create index if not exists idx_vendor_product_approval_events_product on public.vendor_product_approval_events(product_id, changed_at desc);
create index if not exists idx_vendor_product_activity_product on public.vendor_product_activity(product_id, created_at desc);

alter table public.vendor_products enable row level security;
alter table public.vendor_product_images enable row level security;
alter table public.vendor_product_variants enable row level security;
alter table public.vendor_product_approval_events enable row level security;
alter table public.vendor_product_activity enable row level security;

drop policy if exists "Vendors can manage own products" on public.vendor_products;
create policy "Vendors can manage own products" on public.vendor_products for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);
drop policy if exists "Vendors can manage own product images" on public.vendor_product_images;
create policy "Vendors can manage own product images" on public.vendor_product_images for all using (exists (select 1 from public.vendor_products p where p.id = product_id and p.vendor_id = auth.uid())) with check (exists (select 1 from public.vendor_products p where p.id = product_id and p.vendor_id = auth.uid()));
drop policy if exists "Vendors can manage own product variants" on public.vendor_product_variants;
create policy "Vendors can manage own product variants" on public.vendor_product_variants for all using (exists (select 1 from public.vendor_products p where p.id = product_id and p.vendor_id = auth.uid())) with check (exists (select 1 from public.vendor_products p where p.id = product_id and p.vendor_id = auth.uid()));
drop policy if exists "Vendors can view own product approval events" on public.vendor_product_approval_events;
create policy "Vendors can view own product approval events" on public.vendor_product_approval_events for select using (exists (select 1 from public.vendor_products p where p.id = product_id and p.vendor_id = auth.uid()));
drop policy if exists "Vendors can view own product activity" on public.vendor_product_activity;
create policy "Vendors can view own product activity" on public.vendor_product_activity for select using (exists (select 1 from public.vendor_products p where p.id = product_id and p.vendor_id = auth.uid()));

-- TODO: add admin moderation policies and product activity history in the approval phase.