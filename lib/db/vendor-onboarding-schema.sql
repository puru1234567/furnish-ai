-- FurnishAI Vendor Portal - Phase 1: onboarding
-- Run after auth-schema.sql in the Supabase SQL Editor.
-- File uploads are stored in Supabase Storage in the next backend phase;
-- this table stores metadata and the vendor-owned storage path.

create table if not exists public.vendor_onboarding (
  vendor_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text, legal_name text, website text, contact_name text,
  contact_email text, contact_phone text, business_type text,
  registration_number text, tax_id text, operating_regions text,
  agreed_to_terms boolean not null default false, catalog_ready boolean not null default false,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'action_required', 'submitted', 'approved')),
  submitted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.vendor_onboarding_documents (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_onboarding(vendor_id) on delete cascade,
  document_type text not null, original_name text not null, storage_path text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'action_required')),
  rejection_reason text, uploaded_at timestamptz not null default now(), reviewed_at timestamptz
);

create index if not exists idx_vendor_onboarding_status on public.vendor_onboarding(status);
create index if not exists idx_vendor_onboarding_documents_vendor on public.vendor_onboarding_documents(vendor_id);

alter table public.vendor_onboarding enable row level security;
alter table public.vendor_onboarding_documents enable row level security;

drop policy if exists "Vendors can manage own onboarding" on public.vendor_onboarding;
create policy "Vendors can manage own onboarding" on public.vendor_onboarding for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);
drop policy if exists "Vendors can manage own onboarding documents" on public.vendor_onboarding_documents;
create policy "Vendors can manage own onboarding documents" on public.vendor_onboarding_documents for all using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

-- TODO: add admin review policies and storage bucket policies when the approval API is implemented.