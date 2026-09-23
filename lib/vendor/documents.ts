export type DocumentVerificationStatus = 'missing' | 'pending' | 'verified' | 'rejected' | 'action_required'
export interface VendorDocumentRequirement { id: string; type: string; label: string; required: boolean; expires: boolean }
export interface VendorDocumentRecord { id: string; vendorId: string; requirementId: string; fileName: string | null; storagePath: string | null; status: DocumentVerificationStatus; rejectionReason: string | null; expiresAt: string | null; uploadedAt: string | null; updatedAt: string }
export interface VendorDocumentService { list(vendorId: string): Promise<VendorDocumentRecord[]>; upload(vendorId: string, requirementId: string, file: File): Promise<VendorDocumentRecord>; replace(vendorId: string, documentId: string, file: File): Promise<VendorDocumentRecord> }
export const DOCUMENT_REQUIREMENTS: VendorDocumentRequirement[] = [{ id: 'business-registration', type: 'business_registration', label: 'Business registration certificate', required: true, expires: false }, { id: 'tax-document', type: 'tax_document', label: 'Tax registration document', required: true, expires: true }, { id: 'bank-verification', type: 'bank_verification', label: 'Bank account verification', required: true, expires: false }, { id: 'product-compliance', type: 'product_compliance', label: 'Product compliance certificate', required: false, expires: true }]
async function readList(vendorId: string): Promise<VendorDocumentRecord[]> {
  const response = await fetch('/api/vendor/documents')
  if (!response.ok) return DOCUMENT_REQUIREMENTS.map((requirement) => ({ id: `missing-${requirement.id}`, vendorId, requirementId: requirement.id, fileName: null, storagePath: null, status: 'missing' as const, rejectionReason: null, expiresAt: null, uploadedAt: null, updatedAt: new Date(0).toISOString() }))
  return response.json() as Promise<VendorDocumentRecord[]>
}

/** Vendor-scoped adapter backed by /api/vendor/documents; the server derives the vendor from the session. */
export const vendorDocumentService: VendorDocumentService = {
  async list(vendorId) { return readList(vendorId) },
  async upload(_vendorId, requirementId, file) {
    const form = new FormData(); form.set('requirementId', requirementId); form.set('file', file)
    const response = await fetch('/api/vendor/documents', { method: 'POST', body: form })
    if (!response.ok) throw new Error('Unable to upload document.')
    return response.json() as Promise<VendorDocumentRecord>
  },
  async replace(_vendorId, documentId, file) {
    const form = new FormData(); form.set('file', file)
    const response = await fetch(`/api/vendor/documents/${documentId}`, { method: 'PUT', body: form })
    if (!response.ok) throw new Error('Unable to replace document.')
    return response.json() as Promise<VendorDocumentRecord>
  },
}