-- FurnishAI Admin Portal - Security Remediation Phase 2
-- Forward-only migration. Run after admin-security-remediation-phase1-schema.sql.
--
-- Fixes:
--   H1 — "Admins can view all profiles" let any role='admin' session (regardless
--        of granular admin_role/permission) read the entire profiles table
--        directly via the browser/PostgREST, bypassing the app's permission model.
--   H2 — vendor_accounts had no protection against being created/updated for a
--        profile that isn't actually a vendor (relied solely on the FK existing).

-- ============================================================================
-- H1 — remove the blanket admin SELECT policy on profiles.
--
-- Verified across every app/admin/** page and every lib/admin/*.ts service: all
-- Admin reads of public.profiles go through the server-side service-role client
-- (which bypasses RLS entirely), never through a browser/anon-key session. This
-- policy is not required for any working feature and only exists as a coarse,
-- unused bypass. Removing it does not affect the "own profile" policies below,
-- which remain unchanged and are the only client-facing access to this table.
-- ============================================================================

drop policy if exists "Admins can view all profiles" on public.profiles;

-- ============================================================================
-- H2 — enforce at the database level that vendor_accounts only ever references
-- a profile with role='vendor', independent of the foreign key (which only
-- guarantees the id exists, not that it is a vendor).
-- ============================================================================

create or replace function public.enforce_vendor_account_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = new.vendor_id and role = 'vendor') then
    raise exception 'vendor_accounts.vendor_id must reference a profile with role = vendor';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendor_accounts_role_check on public.vendor_accounts;
create trigger trg_vendor_accounts_role_check
  before insert or update on public.vendor_accounts
  for each row execute procedure public.enforce_vendor_account_role();
