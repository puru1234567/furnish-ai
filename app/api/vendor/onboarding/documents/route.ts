import { NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'

const BUCKET = 'vendor-documents'
const MAX_ONBOARDING_DOCUMENT_BYTES = 25 * 1024 * 1024

function safeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
  return normalized || 'document'
}

async function ensureBucket(service: ReturnType<typeof vendorServiceClient>) {
  const { data: bucket, error: lookupError } = await service.storage.getBucket(BUCKET)
  if (bucket) return
  if (lookupError && lookupError.message.toLowerCase().includes('not found')) {
    const { error: createError } = await service.storage.createBucket(BUCKET, { public: false })
    if (createError) throw createError
    return
  }
  if (lookupError) throw lookupError
}

async function ensureOnboardingRecord(service: ReturnType<typeof vendorServiceClient>, vendorId: string) {
  const { data: existing, error: lookupError } = await service
    .from('vendor_onboarding')
    .select('vendor_id')
    .eq('vendor_id', vendorId)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) return

  const { error: insertError } = await service
    .from('vendor_onboarding')
    .insert({ vendor_id: vendorId, status: 'not_started' })
  if (insertError) throw insertError
}

export async function POST(request: Request) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const form = await request.formData()
  const file = form.get('file')
  const documentType = String(form.get('documentType') ?? 'general')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'The selected file is empty.' }, { status: 400 })
  if (file.size > MAX_ONBOARDING_DOCUMENT_BYTES) return NextResponse.json({ error: 'The document must be 25 MB or smaller.' }, { status: 400 })

  const path = `${auth.user.id}/onboarding-${Date.now()}-${safeFileName(file.name)}`
  try {
    const service = vendorServiceClient()
    await ensureOnboardingRecord(service, auth.user.id)
    await ensureBucket(service)
    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
    if (uploadError) throw new Error(`STORAGE_UPLOAD_FAILED: ${uploadError.message}`)

    const { data, error } = await service.from('vendor_onboarding_documents').insert({
      vendor_id: auth.user.id, document_type: documentType, original_name: file.name,
      storage_path: path, storage_bucket: BUCKET, review_status: 'pending',
    }).select('id, document_type, original_name, uploaded_at').single()
    if (error || !data) {
      await service.storage.from(BUCKET).remove([path])
      throw new Error(`DOCUMENT_METADATA_FAILED: ${error?.message ?? 'No metadata row was returned.'}`)
    }
    return NextResponse.json({ id: data.id, name: data.original_name, type: data.document_type, size: file.size, uploadedAt: data.uploaded_at })
  } catch (error) {
    console.error('[vendor/onboarding/documents] upload failed', error)
    const message = error instanceof Error ? error.message : 'Unknown upload error'
    return NextResponse.json({ error: 'Unable to save the onboarding document.', code: message.split(':')[0] }, { status: 500 })
  }
}
