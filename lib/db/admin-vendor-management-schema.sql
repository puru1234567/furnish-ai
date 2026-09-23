-- FurnishAI Admin Portal - Phase 2: vendor management
-- Run after auth-schema.sql and the vendor portal schema files.
-- Admin APIs use the service role after checking the authenticated admin role.

alter table public.profiles add column if not exists vendor_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_profiles_vendor_id on public.profiles(vendor_id);

create table if not exists public.vendor_accounts (
  vendor_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('invited', 'registered', 'onboarding', 'active', 'suspended', 'inactive', 'rejected')),
  suspension_reason text,
  rejection_reason text,
  deactivated_at timestamptz,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_invitations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.profiles(id) on delete set null,
  email text not null,
  company_name text not null,
  invited_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_accounts_status on public.vendor_accounts(status);
create index if not exists idx_vendor_accounts_updated on public.vendor_accounts(updated_at desc);
create index if not exists idx_vendor_invitations_email on public.vendor_invitations(lower(email));
create index if not exists idx_admin_audit_entity on public.admin_audit_events(entity_type, entity_id, created_at desc);
create index if not exists idx_admin_audit_created on public.admin_audit_events(created_at desc);

alter table public.vendor_accounts enable row level security;
alter table public.vendor_invitations enable row level security;
alter table public.admin_audit_events enable row level security;

-- Vendor users can read their own account status. Writes are server-side only.
create policy "Vendors can view own account status" on public.vendor_accounts
  for select using (auth.uid() = vendor_id);

-- Admin reads and writes are performed by the server service-role client after authorization.
-- No client policy grants broad platform access.

-- Capability helper for future vendor API routes and RLS policies.
create or replace function public.vendor_can_operate(target_vendor_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendor_accounts
    where vendor_id = target_vendor_id and status in ('registered', 'onboarding', 'active')
  );
$$;
