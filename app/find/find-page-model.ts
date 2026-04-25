import type { PainPointType } from '@/lib/types'

export interface FormData {
  furnitureType: string
  roomType: string
  wallColor: string
  floorType: string
  roomLayout: string
  roomWidth: number
  roomDepth: number
  contextualAnswers: Record<string, string>
  universalDurability: string
  universalSpace: string
  universalMaterials: string[]
  typeSpecificAnswers: Record<string, string>
  showAvoidIssues?: boolean
  mustHaveFeatures: string[]
  pastIssues: string[]
  budgetFlexibility: string
  timeline: string
  deliveryPreference: string
  painPoint: PainPointType[]
  city: string
  budget: number
  budgetMax: number
  materialsToAvoid: string[]
  aestheticStyle: string
  trustedBrands: string[]
  additionalNotes: string
}

export interface MicroResponse {
  title: string
  detail: string
  tone: 'info' | 'success' | 'error'
}

export type PhotoSlotId = 'front' | 'left' | 'right' | 'back'

export interface PhotoSlot {
  id: PhotoSlotId
  label: string
  icon: string
  hint: string
}