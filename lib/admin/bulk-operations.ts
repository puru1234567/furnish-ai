import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, type AdminPermission } from './authorization'
import { moderateProduct } from './catalog'
import { adjustInventory, adjustPrice } from './marketplace-controls'
import { changeVendorStatus } from './vendors'

type AdminClient = SupabaseClient
export type BulkOperation = 'product_approve' | 'product_reject' | 'product_deactivate' | 'product_activate' | 'product_archive' | 'product_category' | 'inventory_update' | 'price_update' | 'vendor_status' | 'platform_announcement'
export interface BulkRequest { operation: BulkOperation; entityIds: string[]; value?: string | number; reason: string; payload?: { title?: string; body?: string; communicationId?: string } }
export interface BulkResult { jobId: string; status: string; totalCount: number; successCount: number; failureCount: number; errors: Array<{ entityId: string; message: string }> }
const MAX_SYNC_ITEMS = 100
const PROCESS_BATCH_SIZE = 100
function db(): AdminClient { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED'); return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
function permission(operation: BulkOperation): AdminPermission { if (operation.startsWith('product_')) return 'review_products'; if (operation === 'inventory_update') return 'manage_inventory'; if (operation === 'price_update') return 'manage_pricing'; if (operation === 'vendor_status') return 'manage_vendors'; if (operation === 'platform_announcement') return 'notifications.manage'; throw new Error('INVALID_BULK_OPERATION') }
function entityType(operation: BulkOperation) { return operation === 'vendor_status' || operation === 'platform_announcement' ? 'vendor' : operation.startsWith('inventory') ? 'inventory' : operation.startsWith('price') ? 'price' : 'product' }
async function audit(client: AdminClient, actorId: string, jobId: string, operation: string, metadata: Record<string, unknown>) { const { error } = await client.from('admin_audit_events').insert({ actor_id: actorId, action: `bulk.${operation}`, entity_type: 'bulk_job', entity_id: jobId, metadata }); if (error) throw new Error('AUDIT_WRITE_FAILED') }
async function updateJob(client: AdminClient, jobId: string, values: Record<string, unknown>) { const { error } = await client.from('admin_bulk_jobs').update(values).eq('id', jobId); if (error) throw error }

async function applyItem(request: BulkRequest, entityId: string, client: AdminClient) {
  if (!request.reason.trim()) throw new Error('REASON_REQUIRED')
  if (request.operation === 'product_approve') return moderateProduct(entityId, 'approve', request.reason)
  if (request.operation === 'product_reject') return moderateProduct(entityId, 'reject', request.reason)
  if (request.operation === 'product_deactivate') return moderateProduct(entityId, 'disable', request.reason)
  if (request.operation === 'product_activate') return moderateProduct(entityId, 'reactivate', request.reason)
  if (request.operation === 'product_archive') return moderateProduct(entityId, 'archive', request.reason)
  if (request.operation === 'inventory_update') return adjustInventory(entityId, Number(request.value), request.reason)
  if (request.operation === 'price_update') return adjustPrice(entityId, Number(request.value), request.reason)
  if (request.operation === 'vendor_status') return changeVendorStatus(entityId, String(request.value), request.reason)
  if (request.operation === 'platform_announcement') {
    if (!request.payload?.title?.trim() || !request.payload.body?.trim() || !request.payload.communicationId) throw new Error('INVALID_ANNOUNCEMENT_PAYLOAD')
    const { data: notification, error } = await client.from('vendor_notifications').insert({ vendor_id: entityId, type: 'announcement', title: request.payload.title.trim(), body: request.payload.body.trim() }).select('id').single()
    if (error) throw error
    const { error: recipientError } = await client.from('admin_communication_recipients').insert({ communication_id: request.payload.communicationId, vendor_id: entityId, notification_id: notification.id })
    if (recipientError) throw recipientError
    return notification
  }
  const { data: product, error } = await client.from('vendor_products').select('id, vendor_id, category').eq('id', entityId).maybeSingle(); if (error) throw error; if (!product) throw new Error('PRODUCT_NOT_FOUND'); if (typeof request.value !== 'string' || !request.value.trim()) throw new Error('CATEGORY_REQUIRED'); const { error: updateError } = await client.from('vendor_products').update({ category: request.value.trim(), updated_at: new Date().toISOString() }).eq('id', entityId); if (updateError) throw updateError; return product
}

function requestFromJob(job: Record<string, unknown>): BulkRequest { const payload = (job.payload ?? {}) as Record<string, unknown>; return { operation: job.operation as BulkOperation, entityIds: [], value: payload.value as string | number | undefined, reason: String(payload.reason ?? ''), payload: { title: payload.title as string | undefined, body: payload.body as string | undefined, communicationId: payload.communicationId as string | undefined } } }

async function resultForJob(client: AdminClient, job: Record<string, unknown>, errors: Array<{ entityId: string; message: string }> = []): Promise<BulkResult> {
  const { count: successCount } = await client.from('admin_bulk_job_items').select('*', { count: 'exact', head: true }).eq('job_id', job.id).eq('status', 'succeeded')
  const { count: failureCount } = await client.from('admin_bulk_job_items').select('*', { count: 'exact', head: true }).eq('job_id', job.id).eq('status', 'failed')
  return { jobId: String(job.id), status: String(job.status), totalCount: Number(job.total_count), successCount: successCount ?? 0, failureCount: failureCount ?? 0, errors }
}

export async function processBulkJob(jobId: string): Promise<BulkResult> {
  const client = db(); const { data: job, error } = await client.from('admin_bulk_jobs').select('*').eq('id', jobId).maybeSingle(); if (error) throw error; if (!job) throw new Error('JOB_NOT_FOUND')
  const { user } = await requireAdmin(permission(job.operation as BulkOperation))
  if (['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(job.status)) return resultForJob(client, job)
  if (job.status === 'queued') { await client.from('admin_bulk_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId).eq('status', 'queued') }
  const currentRequest = requestFromJob(job)
  const { data: pendingItems } = await client.from('admin_bulk_job_items').select('id, entity_id').eq('job_id', jobId).eq('status', 'pending').order('created_at').limit(PROCESS_BATCH_SIZE)
  const errors: Array<{ entityId: string; message: string }> = []
  for (const item of pendingItems ?? []) {
    const { data: claimed } = await client.from('admin_bulk_job_items').update({ status: 'processing', claimed_at: new Date().toISOString(), claimed_by: user.id }).eq('id', item.id).eq('status', 'pending').select('id').maybeSingle()
    if (!claimed) continue
    try { await applyItem({ ...currentRequest, entityIds: [item.entity_id] }, item.entity_id, client); await client.from('admin_bulk_job_items').update({ status: 'succeeded' }).eq('id', item.id).eq('status', 'processing') }
    catch (processingError) { const message = processingError instanceof Error ? processingError.message : 'Operation failed'; errors.push({ entityId: item.entity_id, message }); await client.from('admin_bulk_job_items').update({ status: 'failed', error_code: message, error_message: message }).eq('id', item.id).eq('status', 'processing') }
  }
  const { count: pendingCount } = await client.from('admin_bulk_job_items').select('*', { count: 'exact', head: true }).eq('job_id', jobId).in('status', ['pending', 'processing'])
  if ((pendingCount ?? 0) === 0) {
    const { count: failedCount } = await client.from('admin_bulk_job_items').select('*', { count: 'exact', head: true }).eq('job_id', jobId).eq('status', 'failed')
    const finalStatus = (failedCount ?? 0) > 0 ? ((failedCount ?? 0) < Number(job.total_count) ? 'completed_with_errors' : 'failed') : 'completed'
    await updateJob(client, jobId, { status: finalStatus, completed_at: new Date().toISOString() }); job.status = finalStatus
    await audit(client, user.id, jobId, 'completed', { status: finalStatus, failureCount: failedCount ?? 0 })
  } else { job.status = 'running'; await updateJob(client, jobId, { status: 'running' }) }
  return resultForJob(client, job, errors)
}

export async function createBulkJob(request: BulkRequest): Promise<BulkResult> {
  const { user } = await requireAdmin(permission(request.operation)); const entityIds = [...new Set(request.entityIds.filter(Boolean))]; if (!entityIds.length || !request.reason.trim()) throw new Error('INVALID_BULK_REQUEST'); const client = db(); const payload = { value: request.value, reason: request.reason, ...(request.payload ?? {}) }; const { data: job, error } = await client.from('admin_bulk_jobs').insert({ operation: request.operation, entity_type: entityType(request.operation), requested_by: user.id, total_count: entityIds.length, payload }).select('id').single(); if (error) throw error; await client.from('admin_bulk_job_items').insert(entityIds.map((entityId) => ({ job_id: job.id, entity_id: entityId, status: 'pending' }))); await audit(client, user.id, job.id, request.operation, { count: entityIds.length, reason: request.reason, queued: entityIds.length > MAX_SYNC_ITEMS }); if (entityIds.length > MAX_SYNC_ITEMS) return { jobId: job.id, status: 'queued', totalCount: entityIds.length, successCount: 0, failureCount: 0, errors: [] }
  return processBulkJob(job.id)
}

export async function getBulkJob(jobId: string) { const client = db(); const { data: job, error } = await client.from('admin_bulk_jobs').select('*').eq('id', jobId).maybeSingle(); if (error) throw error; if (!job) throw new Error('JOB_NOT_FOUND'); const { user } = await requireAdmin(permission(job.operation as BulkOperation)); const { data: items } = await client.from('admin_bulk_job_items').select('*').eq('job_id', jobId).order('created_at'); await audit(client, user.id, jobId, 'viewed', {}); return { ...job, items: items ?? [] } }
