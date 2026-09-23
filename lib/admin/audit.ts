import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from './authorization'

type AdminClient = SupabaseClient
export type AuditSeverity = 'info' | 'warning' | 'critical'
export interface AuditFilter { actorId?: string; vendorId?: string; action?: string; entityType?: string; dateFrom?: string; dateTo?: string; severity?: AuditSeverity; page?: number; pageSize?: number }
export interface AuditRecord { id: string; createdAt: string; actorId: string; action: string; entityType: string; entityId: string | null; vendorId: string | null; previousValue: unknown; newValue: unknown; reason: string | null; severity: AuditSeverity; ipAddress: string | null; userAgent: string | null; metadata: Record<string, unknown> }
export interface AuditListResult { items: AuditRecord[]; total: number; page: number; pageSize: number; totalPages: number }

function db(): AdminClient { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED'); return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }

function assertUuid(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('INVALID_VENDOR_ID')
}

// Older audit writes stored vendor/previous/next context inside `metadata` before
// dedicated columns existed. Fall back to those keys instead of inventing values.
function normalize(row: Record<string, unknown>): AuditRecord {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>
  return {
    id: String(row.id), createdAt: String(row.created_at), actorId: String(row.actor_id), action: String(row.action), entityType: String(row.entity_type), entityId: row.entity_id ? String(row.entity_id) : null,
    vendorId: (row.vendor_id as string | null) ?? (metadata.vendorId as string | undefined) ?? null,
    previousValue: row.previous_value ?? metadata.previous ?? metadata.previousStatus ?? null,
    newValue: row.new_value ?? metadata.next ?? metadata.nextStatus ?? null,
    reason: (row.reason as string | null) ?? (metadata.reason as string | undefined) ?? null,
    severity: (row.severity as AuditSeverity) ?? 'info',
    ipAddress: (row.ip_address as string | null) ?? null,
    userAgent: (row.user_agent as string | null) ?? null,
    metadata,
  }
}

function queryAuditEvents(filter: AuditFilter) {
  const client = db(); let query = client.from('admin_audit_events').select('*', { count: 'exact' })
  if (filter.actorId) query = query.eq('actor_id', filter.actorId)
  if (filter.action) query = query.ilike('action', `%${filter.action}%`)
  if (filter.entityType) query = query.eq('entity_type', filter.entityType)
  if (filter.severity) query = query.eq('severity', filter.severity)
  if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom)
  if (filter.dateTo) query = query.lte('created_at', filter.dateTo)
  if (filter.vendorId) { assertUuid(filter.vendorId); query = query.or(`vendor_id.eq.${filter.vendorId},metadata->>vendorId.eq.${filter.vendorId}`) }
  return query
}

export async function listAuditEvents(filter: AuditFilter = {}): Promise<AuditListResult> {
  await requireAdmin('audit.view'); const size = Math.min(100, Math.max(1, filter.pageSize ?? 25)); const page = Math.max(1, filter.page ?? 1)
  const { data, count, error } = await queryAuditEvents(filter).order('created_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (error) throw error
  const total = count ?? 0
  return { items: (data ?? []).map(normalize), total, page, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) }
}

export async function exportAuditEvents(filter: AuditFilter = {}): Promise<string> {
  await requireAdmin('audit.view'); const { data, error } = await queryAuditEvents(filter).order('created_at', { ascending: false }).limit(5000)
  if (error) throw error
  const rows = (data ?? []).map(normalize)
  const header = 'timestamp,actor,action,entity_type,entity_id,vendor_id,severity,reason,previous_value,new_value'
  const lines = rows.map((row: AuditRecord) => [row.createdAt, row.actorId, row.action, row.entityType, row.entityId ?? '', row.vendorId ?? '', row.severity, row.reason ?? '', JSON.stringify(row.previousValue ?? ''), JSON.stringify(row.newValue ?? '')].map((value) => JSON.stringify(value)).join(','))
  return [header, ...lines].join('\n')
}
