import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, type AdminRole } from './authorization'

export const VENDOR_STATUSES = ['invited', 'registered', 'onboarding', 'active', 'suspended', 'inactive', 'rejected'] as const
export type VendorStatus = typeof VENDOR_STATUSES[number]
export type VendorSort = 'updated_desc' | 'name_asc' | 'status_asc'

export interface AdminVendor {
  id: string
  name: string
  legalName: string | null
  email: string | null
  status: VendorStatus
  onboardingStatus: string | null
  updatedAt: string
  createdAt: string
  productsCount: number | null
  documentsCount: number | null
  usersCount: number | null
}

export interface VendorListResult { items: AdminVendor[]; total: number; page: number; pageSize: number; totalPages: number; role: AdminRole }
export interface VendorDetail extends AdminVendor {
  website: string | null
  contactName: string | null
  contactPhone: string | null
  businessType: string | null
  documents: Array<{ id: string; name: string; type: string; status: string; uploadedAt: string }>
  products: Array<{ id: string; name: string; sku: string; status: string; lifecycleStatus: string; updatedAt: string }>
  users: Array<{ id: string; email: string; name: string | null; role: string; createdAt: string }>
  activity: Array<{ id: string; action: string; detail: string; actorId: string; createdAt: string }>
}

type AdminClient = SupabaseClient

function serviceClient(): AdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function assertStatus(status: string): asserts status is VendorStatus {
  if (!VENDOR_STATUSES.includes(status as VendorStatus)) throw new Error('INVALID_VENDOR_STATUS')
}

const STATUSES_REQUIRING_REASON: readonly VendorStatus[] = ['suspended', 'rejected']

async function writeAudit(client: AdminClient, actorId: string, action: string, vendorId: string, metadata: Record<string, unknown> = {}) {
  const { error } = await client.from('admin_audit_events').insert({ actor_id: actorId, action, entity_type: 'vendor', entity_id: vendorId, metadata })
  if (error) throw new Error('AUDIT_WRITE_FAILED')
}

function text(source: Record<string, unknown> | undefined, key: string): string | null {
  const value = source?.[key]
  return typeof value === 'string' ? value : null
}

function baseVendor(row: Record<string, unknown>, account: Record<string, unknown> | undefined, productsCount: number | null, documentsCount: number | null, usersCount: number | null): AdminVendor {
  return { id: text(row, 'id') ?? '', name: text(row, 'full_name') || text(row, 'email') || 'Unnamed vendor', legalName: text(account, 'legal_name'), email: text(row, 'email'), status: (text(account, 'status') ?? 'registered') as VendorStatus, onboardingStatus: text(account, 'onboarding_status'), updatedAt: text(account, 'updated_at') ?? text(row, 'updated_at') ?? new Date(0).toISOString(), createdAt: text(account, 'created_at') ?? text(row, 'created_at') ?? new Date(0).toISOString(), productsCount, documentsCount, usersCount }
}

export async function listAdminVendors(input: { search?: string; status?: string; sort?: VendorSort; page?: number; pageSize?: number } = {}): Promise<VendorListResult> {
  const { role } = await requireAdmin('manage_vendors')
  const client = serviceClient()
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20)); const page = Math.max(1, input.page ?? 1)
  let query = client.from('profiles').select('id, email, full_name, role, created_at, updated_at', { count: 'exact' }).eq('role', 'vendor')
  if (input.search?.trim()) { const search = input.search.trim().replaceAll(',', ''); query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`) }
  const { data: profiles, error } = await query
  if (error) throw error
  const ids = (profiles ?? []).map((profile) => profile.id)
  const [{ data: accounts, error: accountError }, { data: onboarding, error: onboardingError }] = ids.length ? await Promise.all([client.from('vendor_accounts').select('*').in('vendor_id', ids), client.from('vendor_onboarding').select('*').in('vendor_id', ids)]) : [{ data: [], error: null }, { data: [], error: null }]
  if (accountError) throw accountError
  if (onboardingError) throw onboardingError
  const accountMap = new Map((accounts ?? []).map((account) => [account.vendor_id, { ...account, ...(onboarding ?? []).find((item) => item.vendor_id === account.vendor_id) }]))
  const onboardingMap = new Map((onboarding ?? []).map((item) => [item.vendor_id, item]))
  let items = (profiles ?? []).map((profile) => baseVendor(profile, { ...onboardingMap.get(profile.id), ...accountMap.get(profile.id) }, null, null, null))
  if (input.status && VENDOR_STATUSES.includes(input.status as VendorStatus)) items = items.filter((item) => item.status === input.status)
  items.sort((a, b) => input.sort === 'name_asc' ? a.name.localeCompare(b.name) : input.sort === 'status_asc' ? a.status.localeCompare(b.status) : b.updatedAt.localeCompare(a.updatedAt))
  const total = items.length; const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages, role }
}

export async function getAdminVendor(vendorId: string): Promise<VendorDetail> {
  const { role } = await requireAdmin('manage_vendors'); const client = serviceClient()
  const [{ data: profile, error: profileError }, { data: account, error: accountError }, { data: onboarding, error: onboardingError }, { data: documents }, { data: products }, { data: users }, { data: audit }] = await Promise.all([
    client.from('profiles').select('id, email, full_name, role, created_at, updated_at').eq('id', vendorId).eq('role', 'vendor').maybeSingle(),
    client.from('vendor_accounts').select('*').eq('vendor_id', vendorId).maybeSingle(),
    client.from('vendor_onboarding').select('*').eq('vendor_id', vendorId).maybeSingle(),
    client.from('vendor_documents').select('id, file_name, requirement_id, status, uploaded_at').eq('vendor_id', vendorId).order('updated_at', { ascending: false }).limit(50),
    client.from('vendor_products').select('id, name, sku, status, lifecycle_status, updated_at').eq('vendor_id', vendorId).order('updated_at', { ascending: false }).limit(50),
    client.from('profiles').select('id, email, full_name, role, created_at').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(50),
    client.from('admin_audit_events').select('id, action, metadata, actor_id, created_at').eq('entity_type', 'vendor').eq('entity_id', vendorId).order('created_at', { ascending: false }).limit(50),
  ])
  if (profileError) throw profileError; if (accountError) throw accountError; if (onboardingError) throw onboardingError; if (!profile) throw new Error('VENDOR_NOT_FOUND')
  const vendorRecord = { ...(onboarding ?? {}), ...(account ?? {}) }
  const vendor = baseVendor(profile, vendorRecord, products?.length ?? null, documents?.length ?? null, users?.length ?? null)
  if (!role) throw new Error('ADMIN_FORBIDDEN')
  return { ...vendor, website: text(vendorRecord, 'website'), contactName: text(vendorRecord, 'contact_name'), contactPhone: text(vendorRecord, 'contact_phone'), businessType: text(vendorRecord, 'business_type'), documents: (documents ?? []).map((item) => ({ id: item.id, name: item.file_name || item.requirement_id, type: item.requirement_id, status: item.status, uploadedAt: item.uploaded_at })), products: (products ?? []).map((item) => ({ id: item.id, name: item.name, sku: item.sku, status: item.status, lifecycleStatus: item.lifecycle_status, updatedAt: item.updated_at })), users: (users ?? []).map((item) => ({ id: item.id, email: item.email, name: item.full_name, role: item.role, createdAt: item.created_at })), activity: (audit ?? []).map((item) => ({ id: item.id, action: item.action, detail: JSON.stringify(item.metadata), actorId: item.actor_id, createdAt: item.created_at })) }
}

export async function changeVendorStatus(vendorId: string, nextStatus: string, reason?: string) {
  const { user } = await requireAdmin('manage_vendors'); assertStatus(nextStatus)
  const trimmedReason = reason?.trim() ?? ''
  if (STATUSES_REQUIRING_REASON.includes(nextStatus) && !trimmedReason) throw new Error('REASON_REQUIRED')
  const client = serviceClient()
  const { data: targetProfile, error: profileError } = await client.from('profiles').select('id, role').eq('id', vendorId).maybeSingle()
  if (profileError) throw profileError
  if (!targetProfile) throw new Error('VENDOR_NOT_FOUND')
  if (targetProfile.role !== 'vendor') throw new Error('NOT_A_VENDOR')
  const { data: current, error: currentError } = await client.from('vendor_accounts').select('status').eq('vendor_id', vendorId).maybeSingle()
  if (currentError) throw currentError
  const { error } = await client.from('vendor_accounts').upsert({ vendor_id: vendorId, status: nextStatus, suspension_reason: nextStatus === 'suspended' ? trimmedReason : null, rejection_reason: nextStatus === 'rejected' ? trimmedReason : null, deactivated_at: nextStatus === 'inactive' ? new Date().toISOString() : null, activated_at: nextStatus === 'active' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: 'vendor_id' })
  if (error) throw error
  await writeAudit(client, user.id, `vendor.${nextStatus}`, vendorId, { previousStatus: current?.status ?? null, reason: trimmedReason || null })
  return { vendorId, status: nextStatus }
}

export async function inviteVendor(input: { email: string; companyName: string }) {
  const { user } = await requireAdmin('manage_vendors'); const client = serviceClient(); const email = input.email.trim().toLowerCase(); const companyName = input.companyName.trim()
  if (!email || !companyName) throw new Error('INVALID_INVITATION')
  const { data, error } = await client.from('vendor_invitations').insert({ email, company_name: companyName, invited_by: user.id }).select('id, email, company_name, status, created_at').single()
  if (error) throw error
  await writeAudit(client, user.id, 'vendor.invited', data.id, { email, companyName })
  return data
}
