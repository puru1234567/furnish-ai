-- FurnishAI Admin Portal - Phase 11: platform integrations and system administration
-- Run after vendor-integrations-schema.sql and admin-analytics-audit-schema.sql.

-- ── Integration oversight ───────────────────────────────────────────────
-- admin_enabled is a platform-level kill switch, independent of the vendor-reported
-- connection `status`. Disabling never fabricates a fake connection state.
alter table public.vendor_integrations add column if not exists admin_enabled boolean not null default true;
alter table public.vendor_integrations add column if not exists disabled_reason text;
alter table public.vendor_integrations add column if not exists disabled_by uuid references public.profiles(id);
alter table public.vendor_integrations add column if not exists disabled_at timestamptz;

alter table public.vendor_integration_sync_runs add column if not exists requested_by uuid references public.profiles(id);
alter table public.vendor_integration_sync_runs add column if not exists trigger_source text not null default 'system';
alter table public.vendor_integration_sync_runs drop constraint if exists vendor_integration_sync_runs_trigger_source_check;
alter table public.vendor_integration_sync_runs add constraint vendor_integration_sync_runs_trigger_source_check check (trigger_source in ('vendor', 'admin', 'system', 'webhook'));
alter table public.vendor_integration_sync_runs add column if not exists retry_of_run_id uuid references public.vendor_integration_sync_runs(id);

create index if not exists idx_vendor_integrations_status on public.vendor_integrations(status);
create index if not exists idx_vendor_integration_runs_retry on public.vendor_integration_sync_runs(retry_of_run_id);

-- ── Platform settings ───────────────────────────────────────────────────
-- Business/product configuration only. Never a home for infrastructure secrets.
create table if not exists public.platform_settings (
  key text primary key,
  category text not null check (category in ('product_rules', 'upload_limits', 'allowed_file_types', 'notifications', 'approval', 'catalog', 'feature_flags', 'marketplace')),
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_settings_category on public.platform_settings(category);
alter table public.platform_settings enable row level security;
-- No client policy is granted; all reads/writes go through the server service-role client after permission checks.

insert into public.platform_settings (key, category, value, description) values
  ('max_upload_file_size_mb', 'upload_limits', '25', 'Maximum upload size for vendor-submitted files, in megabytes.'),
  ('allowed_file_types', 'allowed_file_types', '["image/jpeg", "image/png", "image/webp", "application/pdf"]', 'MIME types accepted for vendor document and product image uploads.'),
  ('product_min_images_required', 'product_rules', '1', 'Minimum number of images required before a product can be submitted for approval.'),
  ('product_description_min_length', 'product_rules', '20', 'Minimum description length, in characters, required before submission.'),
  ('approval_auto_escalate_after_days', 'approval', '3', 'Days a product may remain in review before being flagged for escalation.'),
  ('notifications_digest_enabled', 'notifications', 'true', 'Whether vendors receive a daily digest instead of per-event notifications.'),
  ('catalog_default_page_size', 'catalog', '20', 'Default page size for vendor and Admin catalog listings.'),
  ('marketplace_low_stock_threshold', 'marketplace', '5', 'Stock quantity at or below which a listing is flagged low-stock.'),
  ('feature_bulk_operations_enabled', 'feature_flags', 'true', 'Enables the Admin bulk operations workspace.'),
  ('feature_scheduled_listings_enabled', 'feature_flags', 'true', 'Enables scheduling listing activation/deactivation in Marketplace Controls.')
on conflict (key) do nothing;
