-- FurnishAI Admin Portal - Phase 7: users, roles, and permissions
-- Run after auth-schema.sql and admin-vendor-management-schema.sql.

alter table public.profiles add column if not exists account_status text not null default 'active' check (account_status in ('active', 'inactive', 'invited', 'suspended'));
alter table public.profiles add column if not exists last_seen_at timestamptz;
create index if not exists idx_profiles_account_status on public.profiles(account_status);

create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_role_permissions (
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  permission_id uuid not null references public.admin_permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.admin_user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.vendor_user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null check (role_key in ('vendor_owner', 'vendor_manager', 'vendor_editor', 'vendor_viewer')),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_type text not null check (user_type in ('vendor', 'admin')),
  vendor_id uuid references public.profiles(id) on delete set null,
  invited_role text,
  invited_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.admin_roles (key, label, description) values
  ('super_admin', 'Super Admin', 'Unrestricted platform administration.'),
  ('platform_admin', 'Platform Admin', 'Platform-wide operational administration.'),
  ('vendor_admin', 'Vendor Admin', 'Vendor lifecycle and vendor user administration.'),
  ('catalog_admin', 'Catalog Admin', 'Catalog, inventory, pricing, and configuration administration.'),
  ('support_admin', 'Support Admin', 'Support operations and user activity visibility.'),
  ('analytics_admin', 'Analytics / Read-only Admin', 'Read-only platform analytics and activity access.')
on conflict (key) do nothing;

insert into public.admin_permissions (key, label) values
  ('vendor.view', 'View vendors'), ('vendor.create', 'Create vendors'), ('vendor.edit', 'Edit vendors'), ('vendor.approve', 'Approve vendors'), ('vendor.suspend', 'Suspend vendors'),
  ('product.view', 'View products'), ('product.edit', 'Edit products'), ('product.approve', 'Approve products'), ('product.reject', 'Reject products'), ('product.archive', 'Archive products'),
  ('catalog.manage', 'Manage catalog configuration'), ('inventory.manage', 'Manage inventory'), ('pricing.manage', 'Manage pricing'), ('user.manage', 'Manage users'), ('support.manage', 'Manage support'), ('analytics.view', 'View analytics'), ('settings.manage', 'Manage settings'), ('integration.manage', 'Manage integrations'), ('audit.view', 'View audit history')
on conflict (key) do nothing;

-- Seed role capabilities. These mappings are the granular authorization source
-- for future permission checks and can be extended without changing UI code.
insert into public.admin_role_permissions (role_id, permission_id)
select r.id, p.id from public.admin_roles r cross join public.admin_permissions p
where (r.key = 'super_admin')
  or (r.key = 'platform_admin' and p.key <> 'settings.manage')
  or (r.key = 'vendor_admin' and p.key in ('vendor.view', 'vendor.create', 'vendor.edit', 'vendor.approve', 'vendor.suspend', 'user.manage', 'audit.view'))
  or (r.key = 'catalog_admin' and p.key in ('product.view', 'product.edit', 'product.approve', 'product.reject', 'product.archive', 'catalog.manage', 'inventory.manage', 'pricing.manage', 'audit.view'))
  or (r.key = 'support_admin' and p.key in ('vendor.view', 'user.manage', 'support.manage', 'audit.view'))
  or (r.key = 'analytics_admin' and p.key in ('analytics.view', 'audit.view'))
on conflict do nothing;

alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.vendor_user_roles enable row level security;
alter table public.user_invitations enable row level security;
alter table public.user_activity_events enable row level security;

-- All writes and cross-user reads are performed by server-side authorized services.
