-- FurnishAI Vendor Portal - Phase 9: external catalog integrations
-- Authentication protocol, provider payloads, and webhook signing are intentionally configurable.

create table if not exists public.vendor_integrations (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null, provider_key text not null, status text not null default 'pending_setup' check (status in ('disconnected', 'pending_setup', 'connected', 'syncing', 'error', 'paused')),
  direction text not null, domains jsonb not null default '[]'::jsonb, credential_reference text,
  last_sync_at timestamptz, next_sync_at timestamptz, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(vendor_id, provider_key)
);

create table if not exists public.vendor_integration_sync_runs (
  id uuid primary key default gen_random_uuid(), integration_id uuid not null references public.vendor_integrations(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'completed_with_errors', 'failed', 'cancelled')),
  domains jsonb not null default '[]'::jsonb, started_at timestamptz, completed_at timestamptz,
  total_records integer not null default 0, succeeded_records integer not null default 0, failed_records integer not null default 0, attempt integer not null default 0
);

create table if not exists public.vendor_integration_sync_errors (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.vendor_integration_sync_runs(id) on delete cascade,
  external_record_id text, field text, error_code text not null, message text not null, retriable boolean not null default false, attempt integer not null default 0, created_at timestamptz not null default now()
);

create table if not exists public.vendor_integration_webhook_events (
  id uuid primary key default gen_random_uuid(), integration_id uuid not null references public.vendor_integrations(id) on delete cascade,
  provider_event_id text, event_type text, signature_verified boolean not null default false, payload jsonb, processing_status text not null default 'received', received_at timestamptz not null default now(), processed_at timestamptz
);

create index if not exists idx_vendor_integrations_vendor on public.vendor_integrations(vendor_id);
create index if not exists idx_vendor_integration_runs_integration on public.vendor_integration_sync_runs(integration_id, started_at desc);
create index if not exists idx_vendor_integration_errors_run on public.vendor_integration_sync_errors(run_id);
create index if not exists idx_vendor_integration_webhooks_integration on public.vendor_integration_webhook_events(integration_id, received_at desc);

alter table public.vendor_integrations enable row level security;
alter table public.vendor_integration_sync_runs enable row level security;
alter table public.vendor_integration_sync_errors enable row level security;
alter table public.vendor_integration_webhook_events enable row level security;

create policy "Vendors can view own integrations" on public.vendor_integrations for select using (auth.uid() = vendor_id);
create policy "Vendors can view own sync runs" on public.vendor_integration_sync_runs for select using (exists (select 1 from public.vendor_integrations i where i.id = integration_id and i.vendor_id = auth.uid()));
create policy "Vendors can view own sync errors" on public.vendor_integration_sync_errors for select using (exists (select 1 from public.vendor_integration_sync_runs r join public.vendor_integrations i on i.id = r.integration_id where r.id = run_id and i.vendor_id = auth.uid()));
create policy "Vendors can view own webhook events" on public.vendor_integration_webhook_events for select using (exists (select 1 from public.vendor_integrations i where i.id = integration_id and i.vendor_id = auth.uid()));

-- TODO: only a server-side integration worker may write credentials, sync runs, errors, and webhook events.
-- TODO: add encrypted secret storage and provider-specific credential references after protocol selection.