import type { FurnitureItem, UserContext } from "@/lib/types"
import type { PersonalizationScoringInput, ScoringBreakdown, TasteProfile } from "./types"
import { PERSONALIZATION_WEIGHTS, computePersonalizationWeight } from "./weights"

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function styleOverlapScore(item: FurnitureItem, context: UserContext, profile?: TasteProfile | null): number {
  const contextSet = new Set(context.stylePreference)
  const itemSet = new Set(item.style)

  const contextOverlap = item.style.filter((tag) => contextSet.has(tag)).length
  const contextComponent = context.stylePreference.length > 0
    ? contextOverlap / context.stylePreference.length
    : 0.5

  if (!profile) return contextComponent

  const weightedPreference = item.style.reduce((acc, styleTag) => {
    const strength = profile.stylePreference[styleTag]
    if (!strength) return acc
    return acc + strength.value * (0.4 + strength.confidence * 0.6)
  }, 0)

  const profileComponent = clampScore(weightedPreference / Math.max(1, item.style.length * 4))
  return clampScore(contextComponent * 0.6 + profileComponent * 0.4)
}

function budgetScore(item: FurnitureItem, context: UserContext, profile?: TasteProfile | null): number {
  const maxBudget = Math.max(context.budget, context.budgetMax)
  const contextDistance = Math.abs(item.price - maxBudget) / Math.max(1, maxBudget)
  const contextComponent = clampScore(1 - contextDistance)

  if (!profile) return contextComponent

  const targetCenter = (profile.budgetPreference.minBudget + profile.budgetPreference.maxBudget) / 2
  const profileDistance = Math.abs(item.price - targetCenter) / Math.max(1, targetCenter)
  const profileComponent = clampScore(1 - profileDistance)

  return clampScore(contextComponent * 0.55 + profileComponent * 0.45)
}

function roomScore(item: FurnitureItem, context: UserContext, profile?: TasteProfile | null): number {
  const roomWidth = context.roomWidthCm ?? context.roomSqft * 8
  const footprint = item.dimensions.width * item.dimensions.depth
  const roomFootprintBudget = Math.max(1, roomWidth * roomWidth * 0.35)
  const contextComponent = clampScore(1 - Math.max(0, (footprint - roomFootprintBudget) / roomFootprintBudget))

  if (!profile) return contextComponent

  const roomPreferenceMap = {
    compact: 0.82,
    mid: 0.9,
    spacious: 1,
  } as const

  const preferredMultiplier = roomPreferenceMap[profile.roomPreference.dominant]
  const profileComponent = clampScore(contextComponent * preferredMultiplier)
  return clampScore(contextComponent * 0.65 + profileComponent * 0.35)
}

function colorScore(item: FurnitureItem, profile?: TasteProfile | null): number {
  if (!profile) return 0.5

  const normalizedTags = item.tags.map((tag) => tag.toLowerCase())
  let score = 0

  normalizedTags.forEach((tag) => {
    const strength = profile.colorAffinity[tag]
    if (strength) {
      score += strength.value * (0.5 + strength.confidence * 0.5)
    }
  })

  return clampScore(score / Math.max(1, normalizedTags.length * 4))
}

function categoryScore(item: FurnitureItem, profile?: TasteProfile | null): number {
  if (!profile) return 0.5
  const strength = profile.categoryAffinity[item.category]
  if (!strength) return 0.45
  return clampScore((strength.value / 5) * (0.5 + strength.confidence * 0.5))
}

function behaviorBoost(profile?: TasteProfile | null): number {
  if (!profile) return 0

  const dwellComponent = clampScore(profile.dwellSignals.medianDwellMs / Math.max(1, profile.dwellSignals.longDwellThresholdMs * 2))
  const refinementPenalty = Math.max(0, profile.searchHistory.refinementRate - 0.2) * 0.25

  return clampScore(dwellComponent - refinementPenalty)
}

export function computePersonalizedScore(input: PersonalizationScoringInput): ScoringBreakdown {
  const { item, context, tasteProfile, baseModelScore } = input

  const style = styleOverlapScore(item, context, tasteProfile)
  const budget = budgetScore(item, context, tasteProfile)
  const room = roomScore(item, context, tasteProfile)
  const color = colorScore(item, tasteProfile)
  const category = categoryScore(item, tasteProfile)
  const boost = behaviorBoost(tasteProfile)

  const personalizedComposite =
    style * PERSONALIZATION_WEIGHTS.style +
    budget * PERSONALIZATION_WEIGHTS.budget +
    room * PERSONALIZATION_WEIGHTS.room +
    color * PERSONALIZATION_WEIGHTS.color +
    category * PERSONALIZATION_WEIGHTS.category +
    boost * PERSONALIZATION_WEIGHTS.behaviorBoost

  const personalizationWeight = computePersonalizationWeight(tasteProfile?.behavioralVolume ?? 0)
  const finalScore = baseModelScore * (1 - personalizationWeight) + personalizedComposite * personalizationWeight

  return {
    baseModelScore,
    styleScore: style,
    budgetScore: budget,
    roomScore: room,
    colorScore: color,
    categoryScore: category,
    behaviorBoost: boost,
    personalizationWeight,
    finalScore,
  }
}

export function rerankWithPersonalization(
  items: FurnitureItem[],
  context: UserContext,
  baseScores: Record<string, number>,
  tasteProfile?: TasteProfile | null,
): Array<{ item: FurnitureItem; breakdown: ScoringBreakdown }> {
  return items
    .map((item) => {
      const baseModelScore = baseScores[item.id] ?? 0.5
      const breakdown = computePersonalizedScore({ item, context, baseModelScore, tasteProfile })
      return { item, breakdown }
    })
    .sort((a, b) => b.breakdown.finalScore - a.breakdown.finalScore)
}
