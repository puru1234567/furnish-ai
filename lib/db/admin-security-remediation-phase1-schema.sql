-- FurnishAI Admin Portal - Security Remediation Phase 1
-- Forward-only migration. Run after every prior schema file, including
-- admin-analytics-audit-schema.sql and admin-vendor-management-schema.sql.
--
-- Fixes:
--   C1 — set_user_role was reachable by any authenticated/anon session (no explicit
--        REVOKE existed anywhere in the project; Postgres grants EXECUTE to PUBLIC
--        by default on function creation).
--   C2 — set_user_role never set admin_role, and the TypeScript fallback in
--        getAdminRole() (lib/admin/authorization.ts) treated that as platform_admin.
--        The TS fallback is fixed in application code; this migration additionally
--        prevents set_user_role from ever producing an admin with no admin_role.
--   C3 — every admin_analytics_* SECURITY DEFINER RPC had no explicit REVOKE, so it
--        was reachable directly via supabase.rpc(...) by any signed-in user, bypassing
--        RLS and the Next.js requireAdmin() permission layer entirely.
--
-- This migration only changes function bodies and EXECUTE grants. It does not
-- alter table schemas, drop data, or touch RLS policies.

-- ============================================================================
-- 1. set_user_role — retained as a service-role-only bootstrap utility.
--    Confirmed via full-repository search: no application code calls this RPC.
--    Role assignment in the running app goes through
--    lib/admin/user-management.ts (assignAdminRole / removeAdminRole /
--    assignVendorRole), which already sets role + admin_role atomically and
--    enforces Super Admin authorization server-side. set_user_role remains only
--    for direct-SQL bootstrap (e.g. promoting the first Super Admin before any
--    admin exists to use the app-layer invite flow).
-- ============================================================================

-- Drop the old insecure 2-argument signature outright so it cannot coexist
-- with the hardened version below and be selected by exact-arity overload
-- resolution.
drop function if exists public.set_user_role(uuid, text);

create or replace function public.set_user_role(target_user_id uuid, new_role text, new_admin_role text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Defense in depth: even if EXECUTE grants are ever misconfigured again, this
  -- guard rejects calls made from an end-user session. Real user sessions always
  -- carry a JWT (auth.uid() is non-null); service-role calls do not.
  if auth.uid() is not null then
    raise exception 'set_user_role requires service-role privileges and cannot be called from a user session';
  end if;

  if new_role not in ('user', 'vendor', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- Do not allow role='admin' without a recognized admin_role: this is the
  -- exact inconsistent state that made the getAdminRole() fallback dangerous.
  if new_role = 'admin' and (new_admin_role is null or new_admin_role not in ('super_admin', 'platform_admin', 'vendor_admin', 'catalog_admin', 'support_admin', 'analytics_admin')) then
    raise exception 'A valid admin_role is required when assigning the admin role';
  end if;

  update public.profiles set role = new_role, updated_at = now()
  where id = target_user_id;

  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'role', new_role,
    'admin_role', case when new_role = 'admin' then new_admin_role else null end
  )
  where id = target_user_id;
end;
$$;

-- Convenience overload for the common 'user'/'vendor' case (no admin_role needed).
-- Delegates to the 3-argument version above so there is exactly one
-- implementation of the validation/elevation logic.
create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns void language sql security definer set search_path = public as $$
  select public.set_user_role(target_user_id, new_role, null);
$$;

revoke execute on function public.set_user_role(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.set_user_role(uuid, text) from public, anon, authenticated;
grant execute on function public.set_user_role(uuid, text, text) to service_role;
grant execute on function public.set_user_role(uuid, text) to service_role;

-- ============================================================================
-- 2. admin_analytics_* — called exclusively from lib/admin/analytics.ts via the
--    service-role Supabase client (SUPABASE_SERVICE_ROLE_KEY). No browser or
--    anon/authenticated-session call site exists anywhere in the repository.
-- ============================================================================

revoke execute on function public.admin_analytics_vendor_metrics(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_analytics_vendor_metrics(timestamptz, timestamptz) to service_role;

revoke execute on function public.admin_analytics_vendor_catalog_sizes(timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.admin_analytics_vendor_catalog_sizes(timestamptz, timestamptz, integer) to service_role;

revoke execute on function public.admin_analytics_product_metrics(timestamptz, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_analytics_product_metrics(timestamptz, timestamptz, uuid, text) to service_role;

revoke execute on function public.admin_analytics_products_by_category(uuid) from public, anon, authenticated;
grant execute on function public.admin_analytics_products_by_category(uuid) to service_role;

revoke execute on function public.admin_analytics_catalog_growth(timestamptz, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_analytics_catalog_growth(timestamptz, timestamptz, uuid, text) to service_role;

revoke execute on function public.admin_analytics_operational_metrics(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_analytics_operational_metrics(timestamptz, timestamptz) to service_role;

-- ============================================================================
-- 3. vendor_can_operate — audited separately. It is not currently invoked by any
--    RLS policy `using`/`with check` clause (verified across every lib/db/*.sql
--    file) and has no application call site. Least-privilege default: restrict
--    to service_role for now. If a future RLS policy needs to evaluate this
--    function as the querying user, that policy change must add
--    `grant execute on function public.vendor_can_operate(uuid) to authenticated`
--    at that time — do not add it preemptively while it is unused.
-- ============================================================================

revoke execute on function public.vendor_can_operate(uuid) from public, anon, authenticated;
grant execute on function public.vendor_can_operate(uuid) to service_role;

-- ============================================================================
-- Not modified, and why:
--   public.handle_new_user()      — `returns trigger`; Postgres does not allow
--                                    trigger functions to be invoked directly via
--                                    SQL/RPC, so it is not reachable outside its
--                                    trigger context regardless of grants.
--   public.protect_profile_role() — same as above, trigger-only.
--   public.jwt_role()             — not SECURITY DEFINER; runs as the calling
--                                    role and only reads the caller's own JWT
--                                    claims (no elevated access, no data touched).
--                                    It must remain executable by `authenticated`
--                                    because RLS policies on public.profiles
--                                    evaluate it as that role.
-- ============================================================================
