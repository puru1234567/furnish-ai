import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, type AdminPermission, type AdminRole } from './authorization'

export type ManagedUserType = 'vendor' | 'admin'
export type AccountStatus = 'active' | 'inactive' | 'invited' | 'suspended'
export type VendorUserRole = 'vendor_owner' | 'vendor_manager' | 'vendor_editor' | 'vendor_viewer'
export const VENDOR_USER_ROLES: readonly VendorUserRole[] = ['vendor_owner', 'vendor_manager', 'vendor_editor', 'vendor_viewer']
export interface ManagedUser { id: string; email: string; name: string | null; type: ManagedUserType; vendorId: string | null; vendorName: string | null; status: AccountStatus; roles: string[]; permissions: string[]; createdAt: string; lastSeenAt: string | null }
export interface UserListResult { items: ManagedUser[]; total: number; page: number; pageSize: number; totalPages: number }

type AdminClient = SupabaseClient
function db(): AdminClient { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED'); return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
function text(row: Record<string, unknown>, key: string) { const value = row[key]; return typeof value === 'string' ? value : null }
function isSuperAdmin(role: AdminRole | null) { return role === 'super_admin' }
async function audit(client: AdminClient, actorId: string, userId: string, action: string, metadata: Record<string, unknown> = {}) { const { error: auditError } = await client.from('admin_audit_events').insert({ actor_id: actorId, action: `user.${action}`, entity_type: 'user', entity_id: userId, metadata }); if (auditError) throw new Error('AUDIT_WRITE_FAILED'); const { error: activityError } = await client.from('user_activity_events').insert({ user_id: userId, actor_id: actorId, action, metadata }); if (activityError) throw new Error('ACTIVITY_WRITE_FAILED') }
function mapProfile(row: Record<string, unknown>, vendorName: string | null, roles: string[]): ManagedUser { return { id: text(row, 'id') ?? '', email: text(row, 'email') ?? '', name: text(row, 'full_name'), type: text(row, 'role') === 'admin' ? 'admin' : 'vendor', vendorId: text(row, 'vendor_id'), vendorName, status: (text(row, 'account_status') ?? 'active') as AccountStatus, roles, permissions: [], createdAt: text(row, 'created_at') ?? '', lastSeenAt: text(row, 'last_seen_at') } }

async function requireUserManagement() { return requireAdmin('user.manage' as AdminPermission) }

export async function listUsers(input: { type: ManagedUserType; search?: string; vendorId?: string; status?: AccountStatus; page?: number; pageSize?: number }): Promise<UserListResult> {
  await requireUserManagement(); const client = db(); const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20)); const page = Math.max(1, input.page ?? 1)
  let query = client.from('profiles').select('*', { count: 'exact' }).eq('role', input.type === 'admin' ? 'admin' : 'vendor')
  if (input.vendorId) query = query.eq('vendor_id', input.vendorId)
  if (input.status) query = query.eq('account_status', input.status)
  if (input.search?.trim()) { const value = input.search.trim().replaceAll(',', ''); query = query.or(`email.ilike.%${value}%,full_name.ilike.%${value}%`) }
  const { data: profiles, count, error } = await query.order('created_at', { ascending: false }); if (error) throw error
  const rows = profiles ?? []; const ids = rows.map((row) => row.id); const vendorIds = [...new Set(rows.map((row) => row.vendor_id).filter(Boolean))]
  const [{ data: vendors }, { data: adminAssignments }, { data: vendorAssignments }] = await Promise.all([
    vendorIds.length ? client.from('profiles').select('id, full_name, email').in('id', vendorIds) : { data: [] },
    client.from('admin_user_roles').select('user_id, role_id').in('user_id', ids),
    client.from('vendor_user_roles').select('user_id, role_key').in('user_id', ids),
  ])
  const roleIds = [...new Set((adminAssignments ?? []).map((item) => item.role_id))]
  const { data: roleRows } = roleIds.length ? await client.from('admin_roles').select('id, key').in('id', roleIds) : { data: [] }
  const roleNames = new Map((roleRows ?? []).map((item) => [item.id, item.key])); const vendorNames = new Map((vendors ?? []).map((item) => [item.id, item.full_name || item.email || null])); const roles = new Map<string, string[]>()
  for (const item of adminAssignments ?? []) roles.set(item.user_id, [...(roles.get(item.user_id) ?? []), roleNames.get(item.role_id) ?? item.role_id])
  for (const item of vendorAssignments ?? []) roles.set(item.user_id, [...(roles.get(item.user_id) ?? []), item.role_key])
  const items = rows.map((row) => mapProfile(row, vendorNames.get(row.vendor_id) ?? null, roles.get(row.id) ?? [])); const total = count ?? items.length
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function inviteUser(input: { email: string; type: ManagedUserType; vendorId?: string; role?: string }) {
  const { user, role } = await requireUserManagement(); if (input.type === 'admin' && !isSuperAdmin(role)) throw new Error('SUPER_ADMIN_REQUIRED'); if (!input.email.trim()) throw new Error('INVALID_INVITATION'); if (input.type === 'vendor' && !input.vendorId) throw new Error('VENDOR_REQUIRED')
  const client = db(); const { data, error } = await client.auth.admin.inviteUserByEmail(input.email.trim().toLowerCase()); if (error) throw error; const userId = data.user?.id; if (!userId) throw new Error('INVITATION_FAILED')
  await client.from('profiles').upsert({ id: userId, email: input.email.trim().toLowerCase(), role: input.type, vendor_id: input.vendorId ?? null, account_status: 'invited', updated_at: new Date().toISOString() })
  if (input.type === 'admin' && input.role) await assignAdminRole(userId, input.role as AdminRole)
  if (input.type === 'vendor' && input.role) await assignVendorRole(userId, input.role as VendorUserRole)
  await audit(client, user.id, userId, 'invited', { type: input.type, vendorId: input.vendorId ?? null, role: input.role ?? null }); return { userId, email: input.email, status: 'invited' }
}

export async function changeUserStatus(userId: string, status: AccountStatus) { const { user, role } = await requireUserManagement(); const client = db(); const { data: target, error: lookupError } = await client.from('profiles').select('id, role, account_status').eq('id', userId).maybeSingle(); if (lookupError) throw lookupError; if (!target) throw new Error('USER_NOT_FOUND'); if (target.role === 'admin' && role !== 'super_admin') throw new Error('SUPER_ADMIN_REQUIRED'); const { error } = await client.from('profiles').update({ account_status: status, updated_at: new Date().toISOString() }).eq('id', userId); if (error) throw error; await client.auth.admin.updateUserById(userId, { ban_duration: status === 'inactive' || status === 'suspended' ? '876000h' : 'none' }); await audit(client, user.id, userId, 'status_changed', { previous: target.account_status, next: status }); return { userId, status } }

export async function resetUserAccess(userId: string) { const { user, role } = await requireUserManagement(); const client = db(); const { data: target, error } = await client.from('profiles').select('id, email, role').eq('id', userId).maybeSingle(); if (error) throw error; if (!target) throw new Error('USER_NOT_FOUND'); if (target.role === 'admin' && role !== 'super_admin') throw new Error('SUPER_ADMIN_REQUIRED'); const { error: resetError } = await client.auth.admin.generateLink({ type: 'recovery', email: target.email }); if (resetError) throw resetError; await audit(client, user.id, userId, 'access_reset', {}); return { userId, sent: true } }

export async function assignAdminRole(userId: string, roleKey: AdminRole) { const { user, role } = await requireUserManagement(); if (!isSuperAdmin(role)) throw new Error('SUPER_ADMIN_REQUIRED'); const client = db(); const { data: roleRow, error: roleError } = await client.from('admin_roles').select('id, key').eq('key', roleKey).maybeSingle(); if (roleError) throw roleError; if (!roleRow) throw new Error('ROLE_NOT_FOUND'); const { error } = await client.from('admin_user_roles').upsert({ user_id: userId, role_id: roleRow.id, assigned_by: user.id }, { onConflict: 'user_id,role_id' }); if (error) throw error; await client.auth.admin.updateUserById(userId, { app_metadata: { role: 'admin', admin_role: roleKey } }); await audit(client, user.id, userId, 'role_assigned', { role: roleKey }); return { userId, role: roleKey } }

export async function removeAdminRole(userId: string, roleKey: AdminRole) { const { user, role } = await requireUserManagement(); if (!isSuperAdmin(role)) throw new Error('SUPER_ADMIN_REQUIRED'); const client = db(); const { data: roleRow } = await client.from('admin_roles').select('id').eq('key', roleKey).maybeSingle(); if (!roleRow) throw new Error('ROLE_NOT_FOUND'); const { error } = await client.from('admin_user_roles').delete().eq('user_id', userId).eq('role_id', roleRow.id); if (error) throw error; await audit(client, user.id, userId, 'role_removed', { role: roleKey }); return { userId, role: roleKey } }

export async function assignVendorRole(userId: string, roleKey: VendorUserRole) { const { user } = await requireUserManagement(); const client = db(); const { data: target } = await client.from('profiles').select('id, role, vendor_id').eq('id', userId).maybeSingle(); if (!target || target.role !== 'vendor') throw new Error('VENDOR_USER_NOT_FOUND'); const { error } = await client.from('vendor_user_roles').upsert({ user_id: userId, role_key: roleKey, assigned_by: user.id }, { onConflict: 'user_id,role_key' }); if (error) throw error; await audit(client, user.id, userId, 'vendor_role_assigned', { role: roleKey, vendorId: target.vendor_id }); return { userId, role: roleKey } }
