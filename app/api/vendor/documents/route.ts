import { NextRequest, NextResponse } from 'next/server'
import { DOCUMENT_REQUIREMENTS, type VendorDocumentRecord } from '@/lib/vendor/documents'
import { requireVendor } from '@/lib/api/vendor-auth'
import { validateUpload } from '@/lib/security/upload-validation'

const BUCKET = 'vendor-documents'

interface DocumentRow {
  id: string; requirement_id: string; file_name: string | null; storage_path: string | null
  status: VendorDocumentRecord['status']; rejection_reason: string | null; expires_at: string | null
  uploaded_at: string | null; updated_at: string
}

function toRecord(vendorId: string, requirementId: string, row: DocumentRow | undefined): VendorDocumentRecord {
  if (!row) return { id: `missing-${requirementId}`, vendorId, requirementId, fileName: null, storagePath: null, status: 'missing', rejectionReason: null, expiresAt: null, uploadedAt: null, updatedAt: new Date(0).toISOString() }
  return { id: row.id, vendorId, requirementId, fileName: row.file_name, storagePath: row.storage_path, status: row.status, rejectionReason: row.rejection_reason, expiresAt: row.expires_at, uploadedAt: row.uploaded_at, updatedAt: row.updated_at }
}

export async function GET() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('vendor_documents').select('id, requirement_id, file_name, storage_path, status, rejection_reason, expires_at, uploaded_at, updated_at').eq('vendor_id', auth.user.id)
  if (error) return NextResponse.json({ error: 'Unable to load documents.' }, { status: 500 })
  const rows = (data ?? []) as DocumentRow[]
  const records = DOCUMENT_REQUIREMENTS.map((requirement) => toRecord(auth.user.id, requirement.id, rows.find((row) => row.requirement_id === requirement.id)))
  return NextResponse.json(records)
}

export async function POST(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const form = await request.formData()
  const requirementId = String(form.get('requirementId') ?? '')
  const file = form.get('file')
  if (!(file instanceof File) || !DOCUMENT_REQUIREMENTS.some((requirement) => requirement.id === requirementId)) return NextResponse.json({ error: 'A valid requirement and file are required.' }, { status: 400 })

  try { await validateUpload(file, 'document') } catch { return NextResponse.json({ error: 'This file type or size is not allowed.' }, { status: 400 }) }

  const path = `${auth.user.id}/${requirementId}-${Date.now()}-${file.name}`
  const { error: uploadError } = await auth.supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (uploadError) return NextResponse.json({ error: 'Unable to upload document.' }, { status: 500 })

  const now = new Date().toISOString()
  const { data, error } = await auth.supabase.from('vendor_documents').upsert({
    vendor_id: auth.user.id, requirement_id: requirementId, file_name: file.name, storage_path: path, status: 'pending', rejection_reason: null, uploaded_at: now, updated_at: now,
  }, { onConflict: 'vendor_id,requirement_id' }).select('id, requirement_id, file_name, storage_path, status, rejection_reason, expires_at, uploaded_at, updated_at').single()
  if (error || !data) return NextResponse.json({ error: 'Unable to save document record.' }, { status: 500 })
  return NextResponse.json(toRecord(auth.user.id, requirementId, data as DocumentRow))
}

