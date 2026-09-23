export type OnboardingStepId = 'company' | 'contact' | 'business' | 'documents' | 'agreement' | 'catalog' | 'completion'
export type OnboardingStepStatus = 'completed' | 'in_progress' | 'pending' | 'action_required'

export interface VendorDocument { id: string; name: string; type: string; size: number; uploadedAt: string }

export interface VendorOnboardingDraft {
  vendorId: string
  companyName: string
  legalName: string
  website: string
  contactName: string
  contactEmail: string
  contactPhone: string
  businessType: string
  registrationNumber: string
  taxId: string
  operatingRegions: string
  documents: VendorDocument[]
  agreedToTerms: boolean
  catalogReady: boolean
  updatedAt: string | null
}

export interface VendorOnboardingState {
  draft: VendorOnboardingDraft
  status: 'not_started' | 'in_progress' | 'action_required' | 'submitted' | 'approved'
  stepStatuses: Record<OnboardingStepId, OnboardingStepStatus>
  completionPercent: number
  lastSavedAt: string | null
}

export interface VendorOnboardingService {
  getState(vendorId: string): Promise<VendorOnboardingState>
  saveDraft(vendorId: string, draft: VendorOnboardingDraft): Promise<VendorOnboardingState>
  submit(vendorId: string, draft: VendorOnboardingDraft): Promise<VendorOnboardingState>
}

export const ONBOARDING_STEPS: Array<{ id: OnboardingStepId; label: string; description: string }> = [
  { id: 'company', label: 'Company information', description: 'Tell us about your business.' },
  { id: 'contact', label: 'Contact information', description: 'Give the team a reliable point of contact.' },
  { id: 'business', label: 'Business information', description: 'Help us understand your operating footprint.' },
  { id: 'documents', label: 'Required documents', description: 'Upload verification documents.' },
  { id: 'agreement', label: 'Agreement and terms', description: 'Review the vendor terms.' },
  { id: 'catalog', label: 'Catalog setup', description: 'Confirm your catalog is ready to begin.' },
  { id: 'completion', label: 'Onboarding completion', description: 'Submit your application for review.' },
]

export function createEmptyOnboardingDraft(vendorId: string): VendorOnboardingDraft {
  return { vendorId, companyName: '', legalName: '', website: '', contactName: '', contactEmail: '', contactPhone: '', businessType: '', registrationNumber: '', taxId: '', operatingRegions: '', documents: [], agreedToTerms: false, catalogReady: false, updatedAt: null }
}

function getStepStatuses(draft: VendorOnboardingDraft): Record<OnboardingStepId, OnboardingStepStatus> {
  const complete = [
    Boolean(draft.companyName.trim() && draft.legalName.trim()),
    Boolean(draft.contactName.trim() && draft.contactEmail.trim() && draft.contactPhone.trim()),
    Boolean(draft.businessType.trim() && draft.registrationNumber.trim() && draft.operatingRegions.trim()),
    draft.documents.length > 0,
    draft.agreedToTerms,
    draft.catalogReady,
  ]
  const firstIncomplete = complete.findIndex((value) => !value)
  const statusFor = (isComplete: boolean, index: number): OnboardingStepStatus => isComplete ? 'completed' : index === firstIncomplete ? 'in_progress' : 'pending'
  const allComplete = firstIncomplete === -1
  return {
    company: statusFor(complete[0], 0), contact: statusFor(complete[1], 1), business: statusFor(complete[2], 2),
    documents: statusFor(complete[3], 3), agreement: statusFor(complete[4], 4), catalog: statusFor(complete[5], 5),
    completion: allComplete ? 'completed' : 'pending',
  }
}

export function buildOnboardingState(draft: VendorOnboardingDraft, status?: VendorOnboardingState['status']): VendorOnboardingState {
  const stepStatuses = getStepStatuses(draft)
  const completedSteps = Object.values(stepStatuses).filter((stepStatus) => stepStatus === 'completed').length
  return { draft, status: status ?? (completedSteps === 0 ? 'not_started' : 'in_progress'), stepStatuses, completionPercent: Math.round((completedSteps / ONBOARDING_STEPS.length) * 100), lastSavedAt: draft.updatedAt }
}

async function request(method: 'GET' | 'PUT' | 'POST', vendorId: string, draft?: VendorOnboardingDraft): Promise<VendorOnboardingState> {
  const response = await fetch('/api/vendor/onboarding', {
    method, headers: draft ? { 'Content-Type': 'application/json' } : undefined, body: draft ? JSON.stringify(draft) : undefined,
  })
  if (!response.ok) throw new Error('Unable to reach the vendor onboarding service.')
  const state = (await response.json()) as VendorOnboardingState
  return buildOnboardingState({ ...createEmptyOnboardingDraft(vendorId), ...state.draft }, state.status)
}

/** Vendor-scoped adapter backed by /api/vendor/onboarding; the server derives the vendor from the session. */
export const vendorOnboardingService: VendorOnboardingService = {
  async getState(vendorId) { return request('GET', vendorId) },
  async saveDraft(vendorId, draft) { return request('PUT', vendorId, draft) },
  async submit(vendorId, draft) { return request('POST', vendorId, draft) },
}