import { NextRequest, NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import { validateUpload } from '@/lib/security/upload-validation'
import type { VendorDocumentRecord } from '@/lib/vendor/documents'

const BUCKET = 'vendor-documents'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required.' }, { status: 400 })

  const { data: existing, error: lookupError } = await auth.supabase.from('vendor_documents').select('requirement_id').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Unable to load document.' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })

  try { await validateUpload(file, 'document') } catch { return NextResponse.json({ error: 'This file type or size is not allowed.' }, { status: 400 }) }

  const path = `${auth.user.id}/${existing.requirement_id}-${Date.now()}-${file.name}`
  const { error: uploadError } = await auth.supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (uploadError) return NextResponse.json({ error: 'Unable to upload document.' }, { status: 500 })

  const now = new Date().toISOString()
  const { data, error } = await auth.supabase.from('vendor_documents').update({
    file_name: file.name, storage_path: path, status: 'pending', rejection_reason: null, uploaded_at: now, updated_at: now,
  }).eq('id', id).select('id, requirement_id, file_name, storage_path, status, rejection_reason, expires_at, uploaded_at, updated_at').single()
  if (error || !data) return NextResponse.json({ error: 'Unable to save document record.' }, { status: 500 })

  const record: VendorDocumentRecord = { id: data.id, vendorId: auth.user.id, requirementId: data.requirement_id, fileName: data.file_name, storagePath: data.storage_path, status: data.status, rejectionReason: data.rejection_reason, expiresAt: data.expires_at, uploadedAt: data.uploaded_at, updatedAt: data.updated_at }
  return NextResponse.json(record)
}
