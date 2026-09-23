-- FurnishAI Admin Portal - Phase 3: onboarding and document review
-- Run after vendor-onboarding-schema.sql and admin-vendor-management-schema.sql.

alter table public.vendor_onboarding
  drop constraint if exists vendor_onboarding_status_check;
alter table public.vendor_onboarding
  add constraint vendor_onboarding_status_check
  check (status in ('not_started', 'in_progress', 'action_required', 'submitted', 'approved', 'rejected'));

alter table public.vendor_onboarding_documents
  drop constraint if exists vendor_onboarding_documents_review_status_check;
alter table public.vendor_onboarding_documents
  add constraint vendor_onboarding_documents_review_status_check
  check (review_status in ('missing', 'uploaded', 'pending', 'under_review', 'verified', 'approved', 'rejected', 'action_required', 'expired'));
alter table public.vendor_onboarding_documents add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.vendor_onboarding_documents add column if not exists review_comment text;
alter table public.vendor_onboarding_documents add column if not exists expires_at date;

create table if not exists public.admin_onboarding_review_events (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.vendor_onboarding_documents(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('comment_added', 'document_approved', 'document_rejected', 'replacement_requested', 'additional_documents_requested', 'onboarding_approved', 'onboarding_rejected')),
  comment text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_onboarding_review_vendor on public.admin_onboarding_review_events(vendor_id, created_at desc);
create index if not exists idx_admin_onboarding_review_document on public.admin_onboarding_review_events(document_id, created_at desc);

alter table public.admin_onboarding_review_events enable row level security;
alter table public.vendor_onboarding_documents add column if not exists storage_bucket text not null default 'vendor-private';

-- Service-role Admin APIs perform review writes after authorization. Vendor-side reads remain owner-scoped.
-- Storage bucket vendor-private must be private. Signed URLs are generated only after document ownership checks.
