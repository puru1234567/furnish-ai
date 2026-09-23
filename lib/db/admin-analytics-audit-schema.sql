-- FurnishAI Admin Portal - Phase 10: analytics, reporting, and audit center
-- Run after all previous Admin schema files.

-- ── Audit hardening: enrich admin_audit_events and make it append-only ─────
alter table public.admin_audit_events add column if not exists vendor_id uuid references public.profiles(id) on delete set null;
alter table public.admin_audit_events add column if not exists previous_value jsonb;
alter table public.admin_audit_events add column if not exists new_value jsonb;
alter table public.admin_audit_events add column if not exists reason text;
alter table public.admin_audit_events add column if not exists severity text not null default 'info';
alter table public.admin_audit_events drop constraint if exists admin_audit_events_severity_check;
alter table public.admin_audit_events add constraint admin_audit_events_severity_check check (severity in ('info', 'warning', 'critical'));
-- Nullable: not yet populated by any write path. Reserved for future request-scoped capture.
alter table public.admin_audit_events add column if not exists ip_address text;
alter table public.admin_audit_events add column if not exists user_agent text;

create index if not exists idx_admin_audit_vendor on public.admin_audit_events(vendor_id, created_at desc);
create index if not exists idx_admin_audit_actor on public.admin_audit_events(actor_id, created_at desc);
create index if not exists idx_admin_audit_action on public.admin_audit_events(action);
create index if not exists idx_admin_audit_severity on public.admin_audit_events(severity, created_at desc);

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'admin_audit_events is append-only; % is not permitted', tg_op;
end;
$$;

drop trigger if exists trg_admin_audit_append_only on public.admin_audit_events;
create trigger trg_admin_audit_append_only
  before update or delete on public.admin_audit_events
  for each row execute procedure public.prevent_audit_mutation();

revoke update, delete on public.admin_audit_events from authenticated, anon;

-- ── Vendor analytics ────────────────────────────────────────────────────
create or replace function public.admin_analytics_vendor_metrics(date_from timestamptz, date_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'totalVendors', (select count(*) from public.profiles where role = 'vendor'),
    'activeVendors', (select count(*) from public.vendor_accounts where status = 'active'),
    'newVendors', (select count(*) from public.profiles where role = 'vendor' and created_at between date_from and date_to),
    'onboardingCompleted', (select count(*) from public.vendor_onboarding where status = 'approved'),
    'onboardingTotal', (select count(*) from public.vendor_onboarding),
    'vendorActivityEvents', (select count(*) from public.vendor_product_activity where created_at between date_from and date_to)
  );
$$;

create or replace function public.admin_analytics_vendor_catalog_sizes(date_from timestamptz, date_to timestamptz, result_limit integer default 25)
returns table(vendor_id uuid, vendor_name text, total_products bigint, approved_products bigint, active_listings bigint, new_products bigint, last_activity timestamptz)
language sql stable security definer set search_path = public as $$
  select p.vendor_id,
    coalesce(prof.full_name, prof.email, 'Unknown vendor') as vendor_name,
    count(*) as total_products,
    count(*) filter (where p.status = 'approved') as approved_products,
    count(*) filter (where p.lifecycle_status = 'active') as active_listings,
    count(*) filter (where p.created_at between date_from and date_to) as new_products,
    max(p.updated_at) as last_activity
  from public.vendor_products p
  join public.profiles prof on prof.id = p.vendor_id
  group by p.vendor_id, prof.full_name, prof.email
  order by total_products desc
  limit result_limit;
$$;

-- ── Product analytics ───────────────────────────────────────────────────
create or replace function public.admin_analytics_product_metrics(date_from timestamptz, date_to timestamptz, vendor_filter uuid, category_filter text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'total', count(*),
    'approved', count(*) filter (where status = 'approved'),
    'rejected', count(*) filter (where status = 'rejected'),
    'draft', count(*) filter (where status = 'draft'),
    'pendingApproval', count(*) filter (where status in ('submitted', 'under_review', 'resubmitted')),
    'requiringAction', count(*) filter (where status in ('rejected', 'vendor_fix_required')),
    'activeListings', count(*) filter (where lifecycle_status = 'active'),
    'inactiveListings', count(*) filter (where lifecycle_status = 'inactive'),
    'archived', count(*) filter (where lifecycle_status = 'archived'),
    'newInRange', count(*) filter (where created_at between date_from and date_to)
  ) into result
  from public.vendor_products
  where (vendor_filter is null or vendor_id = vendor_filter)
    and (category_filter is null or category = category_filter);
  return result;
end;
$$;

create or replace function public.admin_analytics_products_by_category(vendor_filter uuid)
returns table(category text, product_count bigint)
language sql stable security definer set search_path = public as $$
  select category, count(*) from public.vendor_products
  where vendor_filter is null or vendor_id = vendor_filter
  group by category order by count(*) desc;
$$;

create or replace function public.admin_analytics_catalog_growth(date_from timestamptz, date_to timestamptz, vendor_filter uuid, category_filter text)
returns table(period date, product_count bigint)
language sql stable security definer set search_path = public as $$
  select date_trunc('day', created_at)::date as period, count(*)
  from public.vendor_products
  where created_at between date_from and date_to
    and (vendor_filter is null or vendor_id = vendor_filter)
    and (category_filter is null or category = category_filter)
  group by period order by period;
$$;

-- ── Operational analytics ───────────────────────────────────────────────
create or replace function public.admin_analytics_operational_metrics(date_from timestamptz, date_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'importsTotal', (select count(*) from public.vendor_catalog_imports where uploaded_at between date_from and date_to),
    'importsFailed', (select count(*) from public.vendor_catalog_imports where uploaded_at between date_from and date_to and status in ('failed', 'validation_failed', 'completed_with_errors')),
    'approvalsProcessed', (select count(*) from public.vendor_product_approval_events where changed_at between date_from and date_to),
    'ticketsTotal', (select count(*) from public.vendor_support_tickets where created_at between date_from and date_to),
    'ticketsOpen', (select count(*) from public.vendor_support_tickets where status in ('open', 'assigned', 'in_progress', 'waiting_on_vendor')),
    'documentsVerified', (select count(*) from public.vendor_onboarding_documents where review_status in ('verified', 'approved')),
    'documentsPending', (select count(*) from public.vendor_onboarding_documents where review_status in ('pending', 'uploaded', 'under_review')),
    'systemActivityEvents', (select count(*) from public.admin_audit_events where created_at between date_from and date_to)
  ) into result;
  return result;
end;
$$;

-- All RPC functions are security definer and are only ever invoked by the
-- server-side service-role client after an explicit Admin permission check.
