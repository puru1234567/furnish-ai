// lib/types.ts

// ── Room photo analysis (returned by /api/analyze-room) ────────────
export interface RoomAnalysis {
  wallColor: { id: string; label: string }
  floorType: { id: string; label: string }
  roomLayout: string
  estimatedWidthFt: number | null
  estimatedDepthFt: number | null
  styleProfile: { id: string; description: string }
  colorPalette: string[]
  lighting: string
  existingFurniture: string[]
  spatialConstraints: string[]
  confidenceScore: number
}

export type RoomType = 'living' | 'bedroom' | 'dining' | 'study' | 'kids'

export type FurnitureCategory =
  | 'sofa' | 'bed' | 'dining-table' | 'chair'
  | 'wardrobe' | 'study-table' | 'coffee-table'

export type StyleTag = 'minimal' | 'warm' | 'modern' | 'traditional' | 'industrial' | 'eclectic'

export type Urgency = 'this_week' | 'next_month' | 'exploring'

export type RankingPriority = 'price' | 'quality' | 'design' | 'reviews'

export type PurchaseTrigger =
  | 'new_home'    // full furnishing, needs breadth
  | 'replacing'   // knows category, wants speed
  | 'upgrading'   // has something, wants better
  | 'gifting'     // external constraint, specific use
  | 'renovating'  // partial redo, match existing

export type PainPointType =
  | 'stains_easily'
  | 'broke_down_durability'
  | 'too_uncomfortable'
  | 'too_bulky'
  | 'assembly_nightmare'

export type AssemblyComplexity = 'low' | 'medium' | 'high'

// ── Inventory item ──────────────────────────────────────────────────
export interface FurnitureItem {
  id: string
  name: string
  category: FurnitureCategory
  price: number
  brand: string
  cities: string[]
  deliveryAvailable: boolean
  style: StyleTag[]
  material: string
  dimensions: { width: number; depth: number; height: number }
  durability: 'low' | 'medium' | 'high'
  durabilityScore: number
  maintenanceEase: 'low' | 'medium' | 'high'
  warrantyYears: number
  assemblyComplexity: AssemblyComplexity
  imageUrl: string
  productUrl: string
  inStock: boolean
  rating: number
  reviewCount: number
  description: string
  tags: string[]
}

// ── UserContext — richer intent model ──────────────────────────────
export interface UserContext {
  // Basic
  roomType: RoomType
  roomSqft: number
  city: string
  deliveryOk: boolean

  // Budget (split — comfortable vs absolute max)
  budget: number        // primary filter ceiling
  budgetMax: number     // stretch tier ceiling (user's real limit)

  // WHY buying now — highest-leverage signal
  purchaseTrigger: PurchaseTrigger

  // What they already have (if upgrading/replacing/renovating)
  existingFurnitureDesc: string   // free text, empty string if new_home

  // Structured pain points for deterministic filtering and scoring
  painPoint: PainPointType[]

  // Style + use case (classic signals, still important)
  stylePreference: StyleTag[]
  useCase: string[]

  // What they already looked at and rejected (optional but gold)
  alreadyRejected: string  // e.g. "IKEA too modern, Pepperfry too expensive"

  // Decision factors
  urgency: Urgency
  rankingPriority: RankingPriority
}

// ── AI response ────────────────────────────────────────────────────
export interface RecommendedItem extends FurnitureItem {
  score: number
  tier: 'primary' | 'stretch'
  whyItFits: string
  stretchJustification: string | null
}

export interface RecommendationResponse {
  summary: string
  archetypeLabel: string
  contextInsights: string[]
  visionSummary: string | null
  items: RecommendedItem[]
  flaggedIssues: string[]
}
