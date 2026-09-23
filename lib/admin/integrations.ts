import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from './authorization'
import { vendorAdapterRegistry, type SyncDomain } from '@/lib/vendor/integrations'

type AdminClient = SupabaseClient
export interface AdminIntegration { id: string; vendorId: string; vendorName: string; displayName: string; providerKey: string; status: string; direction: string; domains: string[]; adminEnabled: boolean; disabledReason: string | null; adapterRegistered: boolean; lastSyncAt: string | null; nextSyncAt: string | null; lastError: string | null; createdAt: string; updatedAt: string }
export interface IntegrationListResult { items: AdminIntegration[]; total: number; page: number; pageSize: number; totalPages: number; vendors: Array<{ id: string; name: string }> }
export interface AdminSyncRun { id: string; integrationId: string; status: string; domains: string[]; startedAt: string | null; completedAt: string | null; totalRecords: number; succeededRecords: number; failedRecords: number; attempt: number; triggerSource: string; requestedBy: string | null; retryOfRunId: string | null }
export interface AdminSyncError { id: string; runId: string; externalRecordId: string | null; field: string | null; errorCode: string; message: string; retriable: boolean; attempt: number; createdAt: string }
export interface AdminWebhookEvent { id: string; integrationId: string; providerEventId: string | null; eventType: string | null; signatureVerified: boolean; processingStatus: string; receivedAt: string; processedAt: string | null }
export interface IntegrationHealth { totalIntegrations: number; connected: number; error: number; paused: number; syncing: number; disconnected: number; adminDisabled: number; recentFailedRuns: number; recentWebhookFailures: number }

function db(): AdminClient { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED'); return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
async function audit(client: AdminClient, actorId: string, action: string, entityId: string, vendorId: string | null, metadata: Record<string, unknown>) { const { error } = await client.from('admin_audit_events').insert({ actor_id: actorId, action: `integration.${action}`, entity_type: 'vendor_integration', entity_id: entityId, vendor_id: vendorId, metadata }); if (error) throw new Error('AUDIT_WRITE_FAILED') }
function mapIntegration(row: Record<string, unknown>, vendorName: string): AdminIntegration { return { id: row.id as string, vendorId: row.vendor_id as string, vendorName, displayName: row.display_name as string, providerKey: row.provider_key as string, status: row.status as string, direction: row.direction as string, domains: (row.domains as string[]) ?? [], adminEnabled: row.admin_enabled !== false, disabledReason: (row.disabled_reason as string | null) ?? null, adapterRegistered: Boolean(vendorAdapterRegistry.get(row.provider_key as string)), lastSyncAt: (row.last_sync_at as string | null) ?? null, nextSyncAt: (row.next_sync_at as string | null) ?? null, lastError: (row.last_error as string | null) ?? null, createdAt: row.created_at as string, updatedAt: row.updated_at as string } }

export async function listIntegrations(input: { vendorId?: string; providerKey?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<IntegrationListResult> {
  await requireAdmin('integration.manage'); const client = db(); const size = Math.min(50, Math.max(1, input.pageSize ?? 20)); const page = Math.max(1, input.page ?? 1)
  let query = client.from('vendor_integrations').select('*', { count: 'exact' })
  if (input.vendorId) query = query.eq('vendor_id', input.vendorId)
  if (input.providerKey) query = query.eq('provider_key', input.providerKey)
  if (input.status) query = query.eq('status', input.status)
  const { data, count, error } = await query.order('updated_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (error) throw error
  const rows = data ?? []; const vendorIds = [...new Set(rows.map((row) => row.vendor_id))]
  const { data: vendors } = vendorIds.length ? await client.from('profiles').select('id, full_name, email').in('id', vendorIds) : { data: [] }
  const names = new Map((vendors ?? []).map((vendor) => [vendor.id, vendor.full_name || vendor.email || 'Unnamed vendor']))
  const total = count ?? 0
  return { items: rows.map((row) => mapIntegration(row, names.get(row.vendor_id) ?? 'Unknown vendor')), total, page, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)), vendors: (vendors ?? []).map((vendor) => ({ id: vendor.id, name: vendor.full_name || vendor.email || 'Unnamed vendor' })) }
}

export async function getIntegration(integrationId: string): Promise<AdminIntegration> {
  await requireAdmin('integration.manage'); const client = db()
  const { data: row, error } = await client.from('vendor_integrations').select('*').eq('id', integrationId).maybeSingle()
  if (error) throw error; if (!row) throw new Error('INTEGRATION_NOT_FOUND')
  const { data: vendor } = await client.from('profiles').select('full_name, email').eq('id', row.vendor_id).maybeSingle()
  return mapIntegration(row, vendor?.full_name || vendor?.email || 'Unknown vendor')
}

export async function getIntegrationHealth(): Promise<IntegrationHealth> {
  await requireAdmin('integration.manage'); const client = db()
  async function countStatus(status: string) { const { count } = await client.from('vendor_integrations').select('*', { count: 'exact', head: true }).eq('status', status); return count ?? 0 }
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const [total, connected, errorCount, paused, syncing, disconnected, disabled, failedRuns, failedWebhooks] = await Promise.all([
    client.from('vendor_integrations').select('*', { count: 'exact', head: true }).then((response) => response.count ?? 0),
    countStatus('connected'), countStatus('error'), countStatus('paused'), countStatus('syncing'), countStatus('disconnected'),
    client.from('vendor_integrations').select('*', { count: 'exact', head: true }).eq('admin_enabled', false).then((response) => response.count ?? 0),
    client.from('vendor_integration_sync_runs').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('started_at', since).then((response) => response.count ?? 0),
    client.from('vendor_integration_webhook_events').select('*', { count: 'exact', head: true }).eq('signature_verified', false).gte('received_at', since).then((response) => response.count ?? 0),
  ])
  return { totalIntegrations: total, connected, error: errorCount, paused, syncing, disconnected, adminDisabled: disabled, recentFailedRuns: failedRuns, recentWebhookFailures: failedWebhooks }
}

export async function setIntegrationEnabled(integrationId: string, enabled: boolean, reason: string) {
  const { user } = await requireAdmin('integration.manage'); if (!reason.trim()) throw new Error('REASON_REQUIRED'); const client = db()
  const { data: current, error: lookupError } = await client.from('vendor_integrations').select('id, vendor_id, admin_enabled').eq('id', integrationId).maybeSingle()
  if (lookupError) throw lookupError; if (!current) throw new Error('INTEGRATION_NOT_FOUND')
  const { error } = await client.from('vendor_integrations').update({ admin_enabled: enabled, disabled_reason: enabled ? null : reason.trim(), disabled_by: enabled ? null : user.id, disabled_at: enabled ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', integrationId)
  if (error) throw error
  await audit(client, user.id, enabled ? 'enabled' : 'disabled', integrationId, current.vendor_id, { previousEnabled: current.admin_enabled, reason: reason.trim() })
  return { integrationId, adminEnabled: enabled }
}

export async function listSyncRuns(integrationId: string, page = 1, pageSize = 20): Promise<{ items: AdminSyncRun[]; total: number; page: number; pageSize: number; totalPages: number }> {
  await requireAdmin('integration.manage'); const client = db(); const size = Math.min(50, Math.max(1, pageSize))
  const { data, count, error } = await client.from('vendor_integration_sync_runs').select('*', { count: 'exact' }).eq('integration_id', integrationId).order('started_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (error) throw error
  const total = count ?? 0
  return { items: (data ?? []).map((row) => ({ id: row.id, integrationId: row.integration_id, status: row.status, domains: row.domains ?? [], startedAt: row.started_at, completedAt: row.completed_at, totalRecords: row.total_records, succeededRecords: row.succeeded_records, failedRecords: row.failed_records, attempt: row.attempt, triggerSource: row.trigger_source ?? 'system', requestedBy: row.requested_by, retryOfRunId: row.retry_of_run_id })), total, page, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) }
}

export async function listSyncErrors(runId: string): Promise<AdminSyncError[]> {
  await requireAdmin('integration.manage'); const client = db()
  const { data, error } = await client.from('vendor_integration_sync_errors').select('*').eq('run_id', runId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, runId: row.run_id, externalRecordId: row.external_record_id, field: row.field, errorCode: row.error_code, message: row.message, retriable: row.retriable, attempt: row.attempt, createdAt: row.created_at }))
}

export async function triggerSync(integrationId: string, domains: SyncDomain[]) {
  const { user } = await requireAdmin('integration.manage'); const client = db()
  const { data: integration, error } = await client.from('vendor_integrations').select('id, vendor_id, provider_key, admin_enabled').eq('id', integrationId).maybeSingle()
  if (error) throw error; if (!integration) throw new Error('INTEGRATION_NOT_FOUND'); if (!integration.admin_enabled) throw new Error('INTEGRATION_DISABLED')
  const adapterRegistered = Boolean(vendorAdapterRegistry.get(integration.provider_key))
  const { data: run, error: insertError } = await client.from('vendor_integration_sync_runs').insert({ integration_id: integrationId, status: 'queued', domains, attempt: 0, requested_by: user.id, trigger_source: 'admin' }).select('*').single()
  if (insertError) throw insertError
  await audit(client, user.id, 'sync_requested', integrationId, integration.vendor_id, { domains, adapterRegistered })
  return { runId: run.id, status: run.status, adapterRegistered }
}

export async function retrySync(runId: string) {
  const { user } = await requireAdmin('integration.manage'); const client = db()
  const { data: previousRun, error } = await client.from('vendor_integration_sync_runs').select('*').eq('id', runId).maybeSingle()
  if (error) throw error; if (!previousRun) throw new Error('RUN_NOT_FOUND')
  if (!['failed', 'completed_with_errors'].includes(previousRun.status)) throw new Error('RUN_NOT_RETRYABLE')
  const { data: integration } = await client.from('vendor_integrations').select('vendor_id, admin_enabled').eq('id', previousRun.integration_id).maybeSingle()
  if (!integration?.admin_enabled) throw new Error('INTEGRATION_DISABLED')
  const { data: run, error: insertError } = await client.from('vendor_integration_sync_runs').insert({ integration_id: previousRun.integration_id, status: 'queued', domains: previousRun.domains, attempt: (previousRun.attempt ?? 0) + 1, requested_by: user.id, trigger_source: 'admin', retry_of_run_id: runId }).select('*').single()
  if (insertError) throw insertError
  await audit(client, user.id, 'sync_retried', previousRun.integration_id, integration.vendor_id, { previousRunId: runId, attempt: run.attempt })
  return { runId: run.id, status: run.status }
}

export async function listWebhookEvents(input: { integrationId?: string; page?: number; pageSize?: number } = {}): Promise<{ items: AdminWebhookEvent[]; total: number; page: number; pageSize: number; totalPages: number }> {
  await requireAdmin('integration.manage'); const client = db(); const size = Math.min(50, Math.max(1, input.pageSize ?? 20)); const page = Math.max(1, input.page ?? 1)
  let query = client.from('vendor_integration_webhook_events').select('*', { count: 'exact' })
  if (input.integrationId) query = query.eq('integration_id', input.integrationId)
  const { data, count, error } = await query.order('received_at', { ascending: false }).range((page - 1) * size, page * size - 1)
  if (error) throw error
  const total = count ?? 0
  return { items: (data ?? []).map((row) => ({ id: row.id, integrationId: row.integration_id, providerEventId: row.provider_event_id, eventType: row.event_type, signatureVerified: row.signature_verified, processingStatus: row.processing_status, receivedAt: row.received_at, processedAt: row.processed_at })), total, page, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) }
}
