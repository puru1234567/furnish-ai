export type BudgetFit = "under" | "stretch" | "over"
export type RoomFit = "perfect" | "good" | "tight"

export interface ExplainabilityData {
  reasoningBadges: string[]
  compatibilityBreakdown: {
    style: number
    room: number
    budget: number
    aesthetic: number
  }
  styleAnalysis: string
  budgetReasoningLabel: string
  roomOptimization: string
  aestheticMatching: string
  confidenceLabel: string
  detailedReasoning: {
    style: string[]
    room: string[]
    aesthetic: string[]
  }
  alternatives: string[]
}

export interface AIRecommendation {
  id: string
  name: string
  brand: string
  priceInr: number
  priceLabel: string
  compatibilityScore: number
  budgetFit: BudgetFit
  budgetDeltaLabel: string
  roomFit: RoomFit
  roomFitNote: string
  tasteTags: string[]
  whyThisMatches: string[]
  explainability: ExplainabilityData
}
