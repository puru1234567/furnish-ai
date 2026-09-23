import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { DOCUMENT_REQUIREMENTS } from '@/lib/vendor/documents'
import { requireAdmin, type AdminRole } from './authorization'

export const DOCUMENT_REVIEW_STATUSES = ['missing', 'uploaded', 'under_review', 'approved', 'rejected', 'expired'] as const
export type DocumentReviewStatus = typeof DOCUMENT_REVIEW_STATUSES[number]
export type OnboardingAction = 'approve' | 'reject' | 'request_documents'

export interface OnboardingDocument {
  id: string
  requirementId: string
  label: string
  fileName: string | null
  storagePath: string | null
  storageBucket: string
  status: DocumentReviewStatus
  reason: string | null
  uploadedAt: string | null
  expiresAt: string | null
  reviewedAt: string | null
}

export interface OnboardingVendor { id: string; name: string; email: string | null; status: string; onboardingStatus: string; progress: number; documentsPending: number; documentsTotal: number; updatedAt: string }
export interface OnboardingListResult { items: OnboardingVendor[]; total: number; page: number; pageSize: number; totalPages: number; role: AdminRole }
export interface OnboardingDetail extends OnboardingVendor { legalName: string | null; contactName: string | null; businessType: string | null; documents: OnboardingDocument[]; comments: Array<{ id: string; action: string; comment: string | null; actorId: string; createdAt: string }>; history: Array<{ id: string; action: string; comment: string | null; actorId: string; createdAt: string }> }

type AdminClient = SupabaseClient

function client(): AdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
function text(row: Record<string, unknown> | undefined, key: string): string | null { const value = row?.[key]; return typeof value === 'string' ? value : null }
function normalizeStatus(value: string | null, uploadedAt: string | null, expiresAt: string | null): DocumentReviewStatus {
  if (expiresAt && new Date(expiresAt) < new Date()) return 'expired'
  if (!uploadedAt || value === 'missing') return 'missing'
  if (value === 'verified' || value === 'approved') return 'approved'
  if (value === 'rejected' || value === 'action_required') return 'rejected'
  if (value === 'under_review') return 'under_review'
  return 'uploaded'
}
function requirement(requirementId: string) { return DOCUMENT_REQUIREMENTS.find((item) => item.id === requirementId) }
function mapDocument(row: Record<string, unknown> | undefined, requirementId: string): OnboardingDocument {
  const uploadedAt = text(row, 'uploaded_at'); const expiresAt = text(row, 'expires_at'); const requirementConfig = requirement(requirementId)
  return { id: text(row, 'id') ?? `missing-${requirementId}`, requirementId, label: requirementConfig?.label ?? requirementId, fileName: text(row, 'original_name'), storagePath: text(row, 'storage_path'), storageBucket: text(row, 'storage_bucket') ?? 'vendor-private', status: normalizeStatus(text(row, 'review_status'), uploadedAt, expiresAt), reason: text(row, 'rejection_reason') || text(row, 'review_comment'), uploadedAt, expiresAt, reviewedAt: text(row, 'reviewed_at') }
}
function documentsFor(rows: Record<string, unknown>[], vendorId: string) {
  return DOCUMENT_REQUIREMENTS.map((item) => mapDocument(rows.find((row) => text(row, 'vendor_id') === vendorId && text(row, 'document_type') === item.type), item.id))
}
function progress(documents: OnboardingDocument[], onboardingStatus: string) {
  if (onboardingStatus === 'approved') return 100
  const complete = documents.filter((document) => document.status === 'approved').length
  return Math.round((complete / Math.max(1, documents.length)) * 100)
}
async function audit(clientInstance: AdminClient, actorId: string, vendorId: string, action: string, comment: string | null, documentId?: string, metadata: Record<string, unknown> = {}) {
  const { error: eventError } = await clientInstance.from('admin_onboarding_review_events').insert({ vendor_id: vendorId, document_id: documentId ?? null, actor_id: actorId, action, comment, metadata })
  if (eventError) throw new Error('AUDIT_WRITE_FAILED')
  const { error: auditError } = await clientInstance.from('admin_audit_events').insert({ actor_id: actorId, action: `onboarding.${action}`, entity_type: documentId ? 'vendor_document' : 'vendor_onboarding', entity_id: documentId ?? vendorId, metadata: { ...metadata, comment } })
  if (auditError) throw new Error('AUDIT_WRITE_FAILED')
}

export async function listPendingOnboarding(input: { search?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<OnboardingListResult> {
  const { role } = await requireAdmin('review_onboarding'); const db = client(); const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20)); const page = Math.max(1, input.page ?? 1)
  let query = db.from('vendor_onboarding').select('vendor_id, company_name, legal_name, status, updated_at', { count: 'exact' }).in('status', ['submitted', 'action_required', 'in_progress', 'rejected'])
  if (input.search?.trim()) { const search = input.search.trim().replaceAll(',', ''); query = query.or(`company_name.ilike.%${search}%,legal_name.ilike.%${search}%`) }
  if (input.status) query = query.eq('status', input.status)
  const { data: onboarding, error } = await query.order('updated_at', { ascending: false })
  if (error) throw error
  const ids = (onboarding ?? []).map((item) => item.vendor_id)
  const [{ data: profiles }, { data: accountRows }, { data: documentRows }] = ids.length ? await Promise.all([db.from('profiles').select('id, email, full_name').in('id', ids), db.from('vendor_accounts').select('vendor_id, status').in('vendor_id', ids), db.from('vendor_onboarding_documents').select('id, vendor_id, document_type, original_name, storage_path, storage_bucket, review_status, rejection_reason, review_comment, uploaded_at, expires_at, reviewed_at').in('vendor_id', ids)]) : [{ data: [] }, { data: [] }, { data: [] }]
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item])); const accountMap = new Map((accountRows ?? []).map((item) => [item.vendor_id, item]))
  const items = (onboarding ?? []).map((item) => { const docs = documentsFor(documentRows ?? [], item.vendor_id); const profile = profileMap.get(item.vendor_id); const account = accountMap.get(item.vendor_id); return { id: item.vendor_id, name: item.company_name || profile?.full_name || profile?.email || 'Unnamed vendor', email: profile?.email ?? null, status: account?.status ?? 'registered', onboardingStatus: item.status, progress: progress(docs, item.status), documentsPending: docs.filter((doc) => doc.status === 'missing' || doc.status === 'uploaded' || doc.status === 'under_review' || doc.status === 'rejected').length, documentsTotal: docs.length, updatedAt: item.updated_at } })
  const total = items.length; const totalPages = Math.max(1, Math.ceil(total / pageSize)); return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages, role }
}

export async function getOnboardingDetail(vendorId: string): Promise<OnboardingDetail> {
  await requireAdmin('review_onboarding'); const db = client()
  const [{ data: onboarding }, { data: profile }, { data: documentRows }, { data: reviewRows }] = await Promise.all([
    db.from('vendor_onboarding').select('*').eq('vendor_id', vendorId).maybeSingle(), db.from('profiles').select('id, email, full_name').eq('id', vendorId).maybeSingle(), db.from('vendor_onboarding_documents').select('id, vendor_id, document_type, original_name, storage_path, storage_bucket, review_status, rejection_reason, review_comment, uploaded_at, expires_at, reviewed_at').eq('vendor_id', vendorId), db.from('admin_onboarding_review_events').select('id, action, comment, actor_id, created_at, document_id').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(100),
  ])
  if (!onboarding) throw new Error('ONBOARDING_NOT_FOUND')
  const docs = documentsFor(documentRows ?? [], vendorId); const onboardingStatus = onboarding.status as string
  const events = (reviewRows ?? []).map((item) => ({ id: item.id, action: item.action, comment: item.comment, actorId: item.actor_id, createdAt: item.created_at }))
  return { id: vendorId, name: onboarding.company_name || profile?.full_name || profile?.email || 'Unnamed vendor', email: profile?.email ?? onboarding.contact_email ?? null, status: 'registered', onboardingStatus, progress: progress(docs, onboardingStatus), documentsPending: docs.filter((doc) => doc.status !== 'approved').length, documentsTotal: docs.length, updatedAt: onboarding.updated_at, legalName: onboarding.legal_name, contactName: onboarding.contact_name, businessType: onboarding.business_type, documents: docs, comments: events.filter((event) => event.action === 'comment_added' || event.comment), history: events }
}

export async function reviewDocument(vendorId: string, documentId: string, action: 'approve' | 'reject' | 'replace', comment?: string) {
  const { user } = await requireAdmin('review_onboarding'); const db = client(); const { data: document, error: lookupError } = await db.from('vendor_onboarding_documents').select('id, vendor_id, review_status').eq('id', documentId).eq('vendor_id', vendorId).maybeSingle()
  if (lookupError) throw lookupError; if (!document) throw new Error('DOCUMENT_NOT_FOUND'); if ((action === 'reject' || action === 'replace') && !comment?.trim()) throw new Error('DOCUMENT_REASON_REQUIRED')
  const nextStatus = action === 'approve' ? 'approved' : 'rejected'; const { error } = await db.from('vendor_onboarding_documents').update({ review_status: nextStatus, rejection_reason: nextStatus === 'rejected' ? comment?.trim() : null, review_comment: comment?.trim() ?? null, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', documentId).eq('vendor_id', vendorId)
  if (error) throw error
  await audit(db, user.id, vendorId, action === 'approve' ? 'document_approved' : action === 'replace' ? 'replacement_requested' : 'document_rejected', comment?.trim() ?? null, documentId)
  return { documentId, status: nextStatus }
}

export async function addOnboardingComment(vendorId: string, comment: string) {
  const { user } = await requireAdmin('review_onboarding'); if (!comment?.trim()) throw new Error('COMMENT_REQUIRED'); const db = client(); await audit(db, user.id, vendorId, 'comment_added', comment.trim()); return { ok: true }
}

export async function changeOnboardingStatus(vendorId: string, action: OnboardingAction, comment?: string) {
  const { user } = await requireAdmin('review_onboarding'); if (action === 'reject' && !comment?.trim()) throw new Error('ONBOARDING_REASON_REQUIRED'); const db = client(); const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'action_required'
  const { error } = await db.from('vendor_onboarding').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('vendor_id', vendorId)
  if (error) throw error
  if (action === 'approve') await db.from('vendor_accounts').upsert({ vendor_id: vendorId, status: 'active', activated_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'vendor_id' })
  if (action === 'reject') await db.from('vendor_accounts').upsert({ vendor_id: vendorId, status: 'rejected', rejection_reason: comment?.trim(), updated_at: new Date().toISOString() }, { onConflict: 'vendor_id' })
  await audit(db, user.id, vendorId, action === 'approve' ? 'onboarding_approved' : action === 'reject' ? 'onboarding_rejected' : 'additional_documents_requested', comment?.trim() ?? null)
  return { vendorId, status: nextStatus }
}

export async function getDocumentUrl(vendorId: string, documentId: string) {
  await requireAdmin('review_onboarding'); const db = client(); const { data: document, error } = await db.from('vendor_onboarding_documents').select('storage_path, storage_bucket').eq('id', documentId).eq('vendor_id', vendorId).maybeSingle()
  if (error) throw error; if (!document?.storage_path) throw new Error('DOCUMENT_NOT_AVAILABLE')
  const { data: signed, error: signedError } = await db.storage.from(document.storage_bucket || 'vendor-private').createSignedUrl(document.storage_path, 300)
  if (signedError || !signed?.signedUrl) throw new Error('DOCUMENT_URL_FAILED')
  return { url: signed.signedUrl, expiresIn: 300 }
}
