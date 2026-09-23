import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type AdminRole = 'super_admin' | 'platform_admin' | 'vendor_admin' | 'catalog_admin' | 'support_admin' | 'analytics_admin'
export const ADMIN_ROLES: readonly AdminRole[] = ['super_admin', 'platform_admin', 'vendor_admin', 'catalog_admin', 'support_admin', 'analytics_admin']
export type AdminPermission = 'view_dashboard' | 'manage_vendors' | 'review_products' | 'review_imports' | 'manage_categories' | 'view_vendor_users' | 'review_onboarding' | 'manage_catalog_configuration' | 'manage_inventory' | 'manage_pricing' | 'manage_marketplace' | 'user.manage' | 'audit.view' | 'notifications.manage' | 'support.manage' | 'analytics.view' | 'integration.manage' | 'settings.manage'

const rolePermissions: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ['view_dashboard', 'manage_vendors', 'review_products', 'review_imports', 'manage_categories', 'view_vendor_users', 'review_onboarding', 'manage_catalog_configuration', 'manage_inventory', 'manage_pricing', 'manage_marketplace', 'user.manage', 'audit.view', 'notifications.manage', 'support.manage', 'analytics.view', 'integration.manage', 'settings.manage'],
  platform_admin: ['view_dashboard', 'manage_vendors', 'review_products', 'review_imports', 'manage_categories', 'view_vendor_users', 'review_onboarding', 'manage_catalog_configuration', 'manage_inventory', 'manage_pricing', 'manage_marketplace', 'user.manage', 'audit.view', 'notifications.manage', 'support.manage', 'analytics.view', 'integration.manage', 'settings.manage'],
  vendor_admin: ['view_dashboard', 'manage_vendors', 'view_vendor_users', 'review_onboarding', 'user.manage', 'audit.view', 'support.manage', 'analytics.view'],
  catalog_admin: ['view_dashboard', 'review_products', 'review_imports', 'manage_categories', 'manage_catalog_configuration', 'manage_inventory', 'manage_pricing', 'manage_marketplace', 'audit.view', 'analytics.view', 'integration.manage'],
  support_admin: ['view_dashboard', 'audit.view', 'notifications.manage', 'support.manage'],
  analytics_admin: ['view_dashboard', 'audit.view', 'analytics.view'],
}

export function getAdminRole(user: Pick<User, 'app_metadata'> | null | undefined): AdminRole | null {
  if (user?.app_metadata?.role !== 'admin') return null
  const role = user.app_metadata?.admin_role
  // Fail closed: an admin-flagged account with a missing/unrecognized admin_role
  // gets no permissions rather than silently inheriting platform_admin.
  return rolePermissions[role as AdminRole] ? (role as AdminRole) : null
}

export function hasAdminPermission(role: AdminRole | null, permission: AdminPermission): boolean {
  return Boolean(role && rolePermissions[role].includes(permission))
}

export async function requireAdmin(permission: AdminPermission): Promise<{ user: User; role: AdminRole }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = getAdminRole(user)
  if (!user || !role || !hasAdminPermission(role, permission)) {
    throw new Error('ADMIN_FORBIDDEN')
  }
  return { user, role }
}

export function getAdminPermissions(role: AdminRole): AdminPermission[] {
  return [...rolePermissions[role]]
}
