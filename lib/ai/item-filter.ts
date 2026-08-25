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

import { UserContext, FurnitureItem, PainPointType, ExclusionReason } from '@/lib/types'
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
  exclusions: ExclusionReason[],
): { items: FurnitureItem[]; painContext: PainPointContext } {
  const painContext = buildPainPointContext(painPoints)

  if (painPoints.length === 0) return { items, painContext }

  const filtered = items.filter(item => {
    for (const p of painPoints) {
      if (!passesPainHardFilter(item, p)) {
        const painLabel = PAIN_POINT_EXCLUSION_REASON[p](item)
        exclusions.push({ itemId: item.id, reason: painLabel })
        return false
      }
    }
    return true
  })

  if (filtered.length === 0) {
    // Restore items and clear the pain-point exclusions we just added
    const filteredIds = new Set(filtered.map(i => i.id))
    const removedByPain = items.filter(i => !filteredIds.has(i.id)).map(i => i.id)
    for (let k = exclusions.length - 1; k >= 0; k--) {
      if (removedByPain.includes(exclusions[k].itemId)) exclusions.splice(k, 1)
    }
    relaxedFlags.push('Inventory could not satisfy every pain-point hard rule — broader matches restored.')
    return { items, painContext }
  }

  return { items: filtered, painContext }
}

// Human-readable exclusion reason per pain point
const PAIN_POINT_EXCLUSION_REASON: Record<PainPointType, (item: FurnitureItem) => string> = {
  stains_easily:         (item) => `${item.material} — you asked to avoid stain-prone materials`,
  broke_down_durability: (item) => `Durability score ${item.durabilityScore}/10 — too low for your requirement`,
  too_uncomfortable:     ()     => 'Does not meet comfort requirements (your must-have)',
  too_bulky:             (item) => `${item.dimensions.width}cm wide — too large for tight spaces (your must-have)`,
  assembly_nightmare:    (item) => `Assembly complexity: ${item.assemblyComplexity} — you asked to avoid complex assembly`,
}

// ── Main filter + pre-rank function ───────────────────────────────

export interface FilterResult {
  items: FurnitureItem[]
  relaxedFlags: string[]
  painContext: PainPointContext
  exclusions: ExclusionReason[]
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
  const exclusions: ExclusionReason[] = []
  const allowedCategories = ctx.furnitureType
    ? (FURNITURE_CATEGORY_MAP[ctx.furnitureType] ?? [ctx.furnitureType])
    : null

  // Allow stretch candidates through; ranker assigns tiers and enforces caps
  const budgetCeiling = ctx.budgetMax ?? Math.round(ctx.budget * 1.4)

  // Hard filters with per-item exclusion tracking
  let pool: FurnitureItem[] = []
  for (const item of availableItems) {
    // Category is a silent filter — items of wrong category are not interesting to the user
    if (allowedCategories && !allowedCategories.includes(item.category)) continue

    if (item.price > budgetCeiling) {
      exclusions.push({
        itemId: item.id,
        reason: `₹${item.price.toLocaleString('en-IN')} — over your ₹${budgetCeiling.toLocaleString('en-IN')} budget`,
      })
      continue
    }

    if (!item.cities.includes(ctx.city) && !item.cities.includes('All India')) {
      exclusions.push({ itemId: item.id, reason: `Not available in ${ctx.city}` })
      continue
    }

    if (ctx.deliveryOk && !item.deliveryAvailable) {
      exclusions.push({ itemId: item.id, reason: `Delivery not available in ${ctx.city}` })
      continue
    }

    if (ctx.urgency === 'this_week' && !item.inStock) {
      exclusions.push({ itemId: item.id, reason: 'Currently out of stock' })
      continue
    }

    // Material avoidance (universalNeeds)
    const materialsAvoid = ctx.universalNeeds?.materials_avoid ?? []
    if (materialsAvoid.length > 0) {
      const itemMaterialLower = item.material.toLowerCase()
      const avoided = materialsAvoid.find(m => itemMaterialLower.includes(m.toLowerCase()))
      if (avoided) {
        exclusions.push({ itemId: item.id, reason: `${item.material} — you asked to avoid this` })
        continue
      }
    }

    // Room width hard filter
    if (ctx.roomWidthCm && item.dimensions.width) {
      const maxAllowedWidth = ctx.roomWidthCm - 30 // 30cm minimum clearance
      if (item.dimensions.width > maxAllowedWidth) {
        exclusions.push({
          itemId: item.id,
          reason: `${item.dimensions.width}cm wide — ${item.dimensions.width - maxAllowedWidth}cm too wide for your wall`,
        })
        continue
      }
    }

    pool.push(item)
  }

  // Relax city constraint if nothing found
  if (pool.length === 0) {
    // Remove the city exclusions we just recorded — they won't apply after relaxation
    const removedForCity = new Set(
      exclusions.filter(e => e.reason.startsWith('Not available in')).map(e => e.itemId)
    )
    for (let k = exclusions.length - 1; k >= 0; k--) {
      if (removedForCity.has(exclusions[k].itemId)) exclusions.splice(k, 1)
    }
    pool = availableItems.filter(item =>
      (!allowedCategories || allowedCategories.includes(item.category)) &&
      item.cities.includes('All India') &&
      item.price <= budgetCeiling
    )
    relaxedFlags.push(`No items found in ${ctx.city} — showing All India delivery options`)
  }

  const { items: painFiltered, painContext } = applyPainPointFilters(pool, ctx.painPoint ?? [], relaxedFlags, exclusions)
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
    exclusions,
  }
}
