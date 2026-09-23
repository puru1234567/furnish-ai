import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import { buildOnboardingState, createEmptyOnboardingDraft, type VendorOnboardingDraft, type VendorOnboardingState } from '@/lib/vendor/onboarding'

interface OnboardingRow {
  vendor_id: string; company_name: string | null; legal_name: string | null; website: string | null
  contact_name: string | null; contact_email: string | null; contact_phone: string | null
  business_type: string | null; registration_number: string | null; tax_id: string | null; operating_regions: string | null
  agreed_to_terms: boolean; catalog_ready: boolean; status: VendorOnboardingState['status']; updated_at: string
}

interface OnboardingDocumentRow { id: string; document_type: string; original_name: string; uploaded_at: string }

function draftFromRow(vendorId: string, row: OnboardingRow | null, documents: OnboardingDocumentRow[]): VendorOnboardingDraft {
  const empty = createEmptyOnboardingDraft(vendorId)
  if (!row) return { ...empty, documents: documents.map(toVendorDocument) }
  return {
    vendorId, companyName: row.company_name ?? '', legalName: row.legal_name ?? '', website: row.website ?? '',
    contactName: row.contact_name ?? '', contactEmail: row.contact_email ?? '', contactPhone: row.contact_phone ?? '',
    businessType: row.business_type ?? '', registrationNumber: row.registration_number ?? '', taxId: row.tax_id ?? '',
    operatingRegions: row.operating_regions ?? '', documents: documents.map(toVendorDocument),
    agreedToTerms: row.agreed_to_terms, catalogReady: row.catalog_ready, updatedAt: row.updated_at,
  }
}

function toVendorDocument(row: OnboardingDocumentRow) { return { id: row.id, name: row.original_name, type: row.document_type, size: 0, uploadedAt: row.uploaded_at } }

async function loadState(supabase: SupabaseClient, vendorId: string): Promise<VendorOnboardingState> {
  const [{ data: row }, { data: documents }] = await Promise.all([
    supabase.from('vendor_onboarding').select('*').eq('vendor_id', vendorId).maybeSingle(),
    supabase.from('vendor_onboarding_documents').select('id, document_type, original_name, uploaded_at').eq('vendor_id', vendorId).order('uploaded_at', { ascending: false }),
  ])
  const draft = draftFromRow(vendorId, row as OnboardingRow | null, (documents ?? []) as OnboardingDocumentRow[])
  return buildOnboardingState(draft, row?.status)
}

async function syncDocuments(supabase: SupabaseClient, vendorId: string, draft: VendorOnboardingDraft) {
  const { data: existing } = await supabase.from('vendor_onboarding_documents').select('id, original_name').eq('vendor_id', vendorId)
  const knownNames = new Set((existing ?? []).map((item) => item.original_name))
  const additions = draft.documents.filter((document) => !knownNames.has(document.name))
  if (additions.length) {
    const { error } = await supabase.from('vendor_onboarding_documents').insert(additions.map((document) => ({
      vendor_id: vendorId, document_type: document.type || 'general', original_name: document.name,
      storage_path: `pending-upload/${vendorId}/${document.name}`,
    })))
    if (error) throw error
  }
}

async function upsertDraft(supabase: SupabaseClient, vendorId: string, draft: VendorOnboardingDraft, status?: VendorOnboardingState['status']) {
  const { data: current } = await supabase.from('vendor_onboarding').select('status').eq('vendor_id', vendorId).maybeSingle()
  const nextStatus = status ?? (current?.status === 'approved' ? 'approved' : current?.status === 'action_required' ? 'action_required' : 'in_progress')
  const service = vendorServiceClient()
  const { error } = await service.from('vendor_onboarding').upsert({
    vendor_id: vendorId, company_name: draft.companyName, legal_name: draft.legalName, website: draft.website,
    contact_name: draft.contactName, contact_email: draft.contactEmail, contact_phone: draft.contactPhone,
    business_type: draft.businessType, registration_number: draft.registrationNumber, tax_id: draft.taxId,
    operating_regions: draft.operatingRegions, agreed_to_terms: draft.agreedToTerms, catalog_ready: draft.catalogReady,
    status: nextStatus, submitted_at: status === 'submitted' ? new Date().toISOString() : undefined, updated_at: new Date().toISOString(),
  }, { onConflict: 'vendor_id' })
  if (error) throw error
  await syncDocuments(service, vendorId, draft)
}

export async function GET() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  return NextResponse.json(await loadState(auth.supabase, auth.user.id))
}

export async function PUT(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const draft = (await request.json()) as VendorOnboardingDraft
  await upsertDraft(auth.supabase, auth.user.id, draft)
  return NextResponse.json(await loadState(auth.supabase, auth.user.id))
}

export async function POST(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const draft = (await request.json()) as VendorOnboardingDraft
  await upsertDraft(auth.supabase, auth.user.id, draft, 'submitted')
  return NextResponse.json(await loadState(auth.supabase, auth.user.id))
}
