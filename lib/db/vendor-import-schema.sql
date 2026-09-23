-- FurnishAI Vendor Portal - Phase 3: bulk catalog imports
-- Run after vendor-catalog-schema.sql. Raw uploads should use private storage in production.

create table if not exists public.vendor_catalog_imports (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null, uploaded_by uuid not null references public.profiles(id),
  status text not null default 'uploaded' check (status in ('uploaded', 'validating', 'validation_failed', 'ready_for_import', 'importing', 'completed', 'completed_with_errors', 'failed')),
  storage_path text, total_records integer not null default 0, successful_records integer not null default 0, failed_records integer not null default 0,
  error_report_path text, valid_rows jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now(), completed_at timestamptz
);

create table if not exists public.vendor_catalog_import_errors (
  id uuid primary key default gen_random_uuid(), import_id uuid not null references public.vendor_catalog_imports(id) on delete cascade,
  row_number integer not null, column_name text not null, error_code text not null, message text not null, value text, created_at timestamptz not null default now()
);

create index if not exists idx_vendor_catalog_imports_vendor_date on public.vendor_catalog_imports(vendor_id, uploaded_at desc);
create index if not exists idx_vendor_catalog_import_errors_import on public.vendor_catalog_import_errors(import_id);

alter table public.vendor_catalog_imports enable row level security;
alter table public.vendor_catalog_import_errors enable row level security;

drop policy if exists "Vendors can view own catalog imports" on public.vendor_catalog_imports;
create policy "Vendors can view own catalog imports" on public.vendor_catalog_imports for select using (auth.uid() = vendor_id);
drop policy if exists "Vendors can create own catalog imports" on public.vendor_catalog_imports;
create policy "Vendors can create own catalog imports" on public.vendor_catalog_imports for insert with check (auth.uid() = vendor_id and auth.uid() = uploaded_by);
drop policy if exists "Vendors can view own import errors" on public.vendor_catalog_import_errors;
create policy "Vendors can view own import errors" on public.vendor_catalog_import_errors for select using (exists (select 1 from public.vendor_catalog_imports i where i.id = import_id and i.vendor_id = auth.uid()));

-- TODO: service-side import execution should update status/counts atomically.
-- TODO: add private storage bucket policies for source files and error reports.