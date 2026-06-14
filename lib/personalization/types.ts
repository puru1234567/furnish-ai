import type { FurnitureCategory, FurnitureItem, StyleTag, UserContext } from "@/lib/types"

export type BudgetBand = "value" | "balanced" | "premium"
export type RoomPreference = "compact" | "mid" | "spacious"

export interface PreferenceSignalStrength {
  value: number
  confidence: number
}

export interface TasteProfile {
  userId: string
  profileVersion: number
  updatedAt: string
  behavioralVolume: number
  stylePreference: Partial<Record<StyleTag, PreferenceSignalStrength>>
  budgetPreference: {
    preferredBand: BudgetBand
    minBudget: number
    maxBudget: number
    confidence: number
  }
  roomPreference: {
    dominant: RoomPreference
    confidence: number
  }
  colorAffinity: Partial<Record<string, PreferenceSignalStrength>>
  categoryAffinity: Partial<Record<FurnitureCategory, PreferenceSignalStrength>>
  searchHistory: {
    recentQueries: string[]
    refinementRate: number
  }
  dwellSignals: {
    medianDwellMs: number
    longDwellThresholdMs: number
  }
  vectorProfile?: {
    embeddingModel: string
    embeddingDimensions: number
    embedding: number[]
    updatedAt: string
  }
}

export type PersonalizationSignalType =
  | "click"
  | "save"
  | "compare"
  | "search"
  | "search_refined"
  | "dwell"

export interface PersonalizationSignalEvent {
  type: PersonalizationSignalType
  timestamp: string
  category?: FurnitureCategory
  styleTags?: StyleTag[]
  colorTags?: string[]
  price?: number
  roomSizeSqft?: number
  query?: string
  dwellMs?: number
}

export interface ScoringBreakdown {
  baseModelScore: number
  styleScore: number
  budgetScore: number
  roomScore: number
  colorScore: number
  categoryScore: number
  behaviorBoost: number
  personalizationWeight: number
  finalScore: number
}

export interface PersonalizationScoringInput {
  item: FurnitureItem
  context: UserContext
  tasteProfile?: TasteProfile | null
  baseModelScore: number
}
