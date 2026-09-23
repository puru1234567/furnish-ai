-- FurnishAI Admin Portal - Phase 8: bulk operations and import management
-- Run after the existing Admin, vendor catalog, and marketplace schemas.

create table if not exists public.admin_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  entity_type text not null check (entity_type in ('product', 'inventory', 'price', 'vendor')),
  requested_by uuid not null references public.profiles(id),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'completed_with_errors', 'failed', 'cancelled')),
  total_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  error_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.admin_bulk_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.admin_bulk_jobs(id) on delete cascade,
  entity_id uuid not null,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_bulk_jobs_created on public.admin_bulk_jobs(created_at desc);
create index if not exists idx_admin_bulk_jobs_status on public.admin_bulk_jobs(status);
create index if not exists idx_admin_bulk_items_job on public.admin_bulk_job_items(job_id, status);

alter table public.admin_bulk_jobs enable row level security;
alter table public.admin_bulk_job_items enable row level security;

-- Admin APIs use service-role access after operation-specific permission checks.
