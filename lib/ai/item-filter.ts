/**
 * item-filter.ts
 * All item filtering, pain-point scoring, and pre-ranking logic
 * for the recommendation engine.
 *
 * Extracted from app/api/recommend/route.ts so it can be:
 *  - Tested in isolation
 *  - Reused across endpoints
 *  - Updated without touching route HTTP handling
 */

import { UserContext, FurnitureItem, PainPointType } from '@/lib/types'
import { getPainPointStrategyRegistry } from './strategies'

// ── Category mapping ───────────────────────────────────────────────

export const FURNITURE_CATEGORY_MAP: Record<string, string[]> = {
  sofa:          ['sofa'],
  bed:           ['bed'],
  'dining-table':['dining-table'],
  desk:          ['study-table'],
  chair:         ['chair'],
  wardrobe:      ['wardrobe'],
}

// ── Slim item type — only fields needed for AI scoring ─────────────

export interface SlimItem {
  id: string
  name: string
  brand: string
  price: number
  style: string[]
  material: string
  w: number
  depth: number
  dur: string
  durScore: number
  maint: string
  warrantyYears: number
  assembly: string
  rating: number
  reviews: number
  tags: string[]
}

export function toSlimItem(item: FurnitureItem): SlimItem {
  return {
    id:           item.id,
    name:         item.name,
    brand:        item.brand,
    price:        item.price,
    style:        item.style,
    material:     item.material,
    w:            item.dimensions.width,
    depth:        item.dimensions.depth,
    dur:          item.durability,
    durScore:     item.durabilityScore,
    maint:        item.maintenanceEase,
    warrantyYears:item.warrantyYears,
    assembly:     item.assemblyComplexity,
    rating:       item.rating,
    reviews:      item.reviewCount,
    tags:         item.tags,
  }
}

// ── Pain point configuration ───────────────────────────────────────

export interface PainPointContext {
  selectedPainTypes: PainPointType[]
  boostSignals: string[]
  excludedSignals: string[]
}

export const PAIN_POINT_LABELS: Record<PainPointType, string> = {
  stains_easily:         'Stains too easily',
  broke_down_durability: 'Broke down / poor durability',
  too_uncomfortable:     'Too uncomfortable',
  too_bulky:             'Too bulky / took up too much space',
  assembly_nightmare:    'Assembly was a nightmare',
}

// ── Helpers ────────────────────────────────────────────────────────

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function passesPainHardFilter(item: FurnitureItem, pain: PainPointType): boolean {
  const registry = getPainPointStrategyRegistry()
  const strategy = registry.getStrategy(pain)
  if (!strategy) return true // Unknown pain point, allow item
  return strategy.hardFilter(item)
}

export function getPainBoostScore(item: FurnitureItem, painPoints: PainPointType[]): number {
  const registry = getPainPointStrategyRegistry()
  let totalScore = 0

  for (const pain of painPoints) {
    const strategy = registry.getStrategy(pain)
    if (strategy) {
      totalScore += strategy.boostScore(item)
    }
  }

  return totalScore
}

function buildPainPointContext(painPoints: PainPointType[]): PainPointContext {
  if (painPoints.length === 0) {
    return {
      selectedPainTypes: [],
      boostSignals: ['No prior furniture issue selected. Explain shortlist as first-purchase guidance.'],
      excludedSignals: [],
    }
  }

  const registry = getPainPointStrategyRegistry()
  const boostSignals: string[] = []
  const excludedSignals: string[] = []

  for (const pain of painPoints) {
    const strategy = registry.getStrategy(pain)
    if (strategy) {
      const labels = strategy.getLabels()
      boostSignals.push(...labels.boost)
      excludedSignals.push(...labels.exclude)
    }
  }

  return {
    selectedPainTypes: painPoints,
    boostSignals: unique(boostSignals),
    excludedSignals: unique(excludedSignals),
  }
}

function applyPainPointFilters(
  items: FurnitureItem[],
  painPoints: PainPointType[],
  relaxedFlags: string[],
): { items: FurnitureItem[]; painContext: PainPointContext } {
  const painContext = buildPainPointContext(painPoints)

  if (painPoints.length === 0) return { items, painContext }

  const filtered = items.filter(item => painPoints.every(p => passesPainHardFilter(item, p)))

  if (filtered.length === 0) {
    relaxedFlags.push('Inventory could not satisfy every pain-point hard rule — broader matches restored.')
    return { items, painContext }
  }

  return { items: filtered, painContext }
}

// ── Main filter + pre-rank function ───────────────────────────────

export interface FilterResult {
  items: FurnitureItem[]
  relaxedFlags: string[]
  painContext: PainPointContext
}

/**
 * Applies tiered filtering then pre-ranks by pain boost + style overlap + rating.
 * Hard filters: category, city, delivery, urgency, budget range.
 * Soft filter: style (only applied when pool > 15 items and leaves ≥8).
 * Max 15 items returned to keep prompt tokens manageable.
 *
 * @param availableItems - The full inventory to filter from
 * @param ctx - User context with filtering preferences
 * @returns Filtered and ranked items with metadata
 */
export function filterAndRankItems(availableItems: FurnitureItem[], ctx: UserContext): FilterResult {
  const relaxedFlags: string[] = []
  const allowedCategories = ctx.furnitureType
    ? (FURNITURE_CATEGORY_MAP[ctx.furnitureType] ?? [ctx.furnitureType])
    : null

  const hardMatch = (item: FurnitureItem) =>
    (!allowedCategories || allowedCategories.includes(item.category)) &&
    (item.cities.includes(ctx.city) || item.cities.includes('All India')) &&
    (!ctx.deliveryOk || item.deliveryAvailable) &&
    (ctx.urgency !== 'this_week' || item.inStock)

  const budgetCeiling = ctx.budgetMax ?? ctx.budget * 1.5
  const budgetFloor   = ctx.budget * 0.65

  let pool = availableItems.filter(
    item => hardMatch(item) && item.price >= budgetFloor && item.price <= budgetCeiling
  )

  // Relax city constraint if nothing found
  if (pool.length === 0) {
    pool = availableItems.filter(item =>
      (!allowedCategories || allowedCategories.includes(item.category)) &&
      item.cities.includes('All India') &&
      item.price >= budgetFloor && item.price <= budgetCeiling
    )
    relaxedFlags.push(`No items found in ${ctx.city} — showing All India delivery options`)
  }

  const { items: painFiltered, painContext } = applyPainPointFilters(pool, ctx.painPoint ?? [], relaxedFlags)
  pool = painFiltered

  // Soft style trim (only when pool is large)
  if (pool.length > 15 && ctx.stylePreference.length > 0) {
    const styleMatches = pool.filter(item => item.style.some(s => ctx.stylePreference.includes(s)))
    if (styleMatches.length >= 8) pool = styleMatches
    // Otherwise keep all — AI will score style appropriately
  }

  // Pre-rank: pain boost → style overlap → rating (best candidates first for the AI)
  pool.sort((a, b) => {
    const painDiff = getPainBoostScore(b, ctx.painPoint ?? []) - getPainBoostScore(a, ctx.painPoint ?? [])
    if (painDiff !== 0) return painDiff

    const aStyleScore = a.style.filter(s => ctx.stylePreference.includes(s)).length
    const bStyleScore = b.style.filter(s => ctx.stylePreference.includes(s)).length
    if (bStyleScore !== aStyleScore) return bStyleScore - aStyleScore

    return b.rating - a.rating
  })

  return {
    items: pool.slice(0, 15),
    relaxedFlags,
    painContext,
  }
}
