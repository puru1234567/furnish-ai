-- FurnishAI Admin Portal - queued bulk processing remediation
-- Run after admin-bulk-operations-schema.sql.

alter table public.admin_bulk_job_items
  drop constraint if exists admin_bulk_job_items_status_check;
alter table public.admin_bulk_job_items
  add constraint admin_bulk_job_items_status_check
  check (status in ('pending', 'processing', 'succeeded', 'failed'));
alter table public.admin_bulk_job_items add column if not exists claimed_at timestamptz;
alter table public.admin_bulk_job_items add column if not exists claimed_by uuid references public.profiles(id);
create index if not exists idx_admin_bulk_items_pending on public.admin_bulk_job_items(job_id, status, created_at);
