/**
 * recommendations-prompt.ts
 * Builds the complete prompt for the Groq recommendation scoring call.
 *
 * Design goals (accuracy-first):
 *  - Signal priority explicitly ranked (pain > room > contextual > existing > price > style)
 *  - Scoring rules in key=value format — clearer than prose for instruction-tuned models
 *  - "whyItFits" constraints are explicit: must include ₹ amount AND a user signal
 *  - FORBIDDEN list prevents hallucination and generic output
 *
 * Token budget: ~2,400 tokens (vs ~3,200 previously). Savings: removed narrative scoring
 * explanations, removed redundant examples, restructured blocks.
 * Qualitative impact: better adherence to the intended signal hierarchy and fewer generic phrases.
 */

import { UserContext, PainPointType } from '@/lib/types'
import { SlimItem, PainPointContext, PAIN_POINT_LABELS } from '@/lib/ai/item-filter'

// ── Trigger intent descriptions ────────────────────────────────────

const TRIGGER_CONTEXT: Record<string, string> = {
  new_home:   'furnishing from scratch — prioritise delivery + versatility',
  replacing:  'knows the category, has broken/old item — wants decisive shortlist',
  upgrading:  'has existing furniture — match or intentionally contrast style',
  gifting:    'buying for someone else — practical fit over personal aesthetic',
  renovating: 'partial redo — must work with remaining existing pieces',
}

// ── Scoring rules ──────────────────────────────────────────────────

function buildScoringRules(
  ctx: UserContext,
  wallCm: number,
  painContext: PainPointContext,
  useCaseBonuses: string[],
): string {
  const budget  = ctx.budget
  const budget90 = Math.round(budget * 0.9)
  const budget125 = Math.round(budget * 1.25)
  const wall115 = Math.round(wallCm * 1.15)

  const priorityRule: Record<string, string> = {
    price:   'cheapest price ranks higher',
    quality: 'highest (durability + rating) ranks higher',
    design:  'best style-tag overlap ranks higher',
    reviews: 'highest (rating × log10(reviews)) ranks higher',
  }

  return [
    `SIGNAL PRIORITY (rank in this order — higher = stronger override):`,
    `1. pain_point  — hard exclusions already applied; boostSignals = non-negotiable ranking preference`,
    `2. room_context — spatialConstraints + furnitureNeeds from vision analysis`,
    `3. contextual_answers — user explicitly clarified intent for this room`,
    `4. existing_furniture — match style or intentional contrast as signalled`,
    `5. price_tier — primary budget as default tiebreaker`,
    `6. style — only if signals 1–5 leave a clear gap`,
    ``,
    `SCORING MATRIX (0–100, combine applicable scores):`,
    `pain_match:    +30 if item satisfies boostSignals (material/durability/tag match)`,
    `room_compact:  +20 if w≤${wallCm}cm and spatialConstraints includes narrow/tight/limited`,
    `room_need:     +15 if tags match furnitureNeeds (storage/guest/work_surface)`,
    `contextual:    +15 if item attributes match contextual_answers directly`,
    `existing_fit:  +10 if style overlaps existing_furniture or signals intentional contrast`,
    `style_match:   +25 all tags match | +15 partial (≥1 tag) | +0 none`,
    `size_fit:      +20 if w≤${wallCm}cm | +10 if w≤${wall115}cm | +0 oversized`,
    `price_tier:    +20 if ≤₹${budget90} | +15 if ≤₹${budget} | +8 if ≤₹${budget125} | +0 over`,
    `use_case:      +5 per matching tag (max 20 pts)`,
    useCaseBonuses.length > 0 ? useCaseBonuses.join('\n') : '',
    `priority_bonus:+10 for top performer by "${priorityRule[ctx.rankingPriority]}"`,
    `social_proof:  +5 if rating≥4.3 and reviews≥500 | +3 if rating≥4.0 and reviews≥200`,
  ].filter(Boolean).join('\n')
}

// ── Context block builders ─────────────────────────────────────────

function buildUserContextBlock(ctx: UserContext, budgetMax: number, painContext: PainPointContext): string {
  const lines: string[] = []

  lines.push(`room=${ctx.roomType} sqft=${ctx.roomSqft} city=${ctx.city}`)
  lines.push(`budget=₹${ctx.budget} budget_max=₹${budgetMax}`)
  lines.push(`furniture_type=${ctx.furnitureType ?? 'unspecified'}`)
  lines.push(`urgency=${ctx.urgency} priority=${ctx.rankingPriority} delivery_required=${ctx.deliveryOk}`)
  lines.push(`trigger=${ctx.purchaseTrigger} → ${TRIGGER_CONTEXT[ctx.purchaseTrigger] ?? ''}`)

  lines.push(`pain_points={`)
  lines.push(`  labels=[${painContext.selectedPainTypes.map(p => PAIN_POINT_LABELS[p]).join(', ')}]`)
  lines.push(`  boostSignals=[${painContext.boostSignals.join('; ')}]`)
  lines.push(`  excludedSignals=[${painContext.excludedSignals.join('; ')}]`)
  lines.push(`}`)

  if (ctx.roomContext?.summary)              lines.push(`room_summary="${ctx.roomContext.summary}"`)
  if (ctx.roomContext?.furnitureNeeds?.length)    lines.push(`room_needs=${ctx.roomContext.furnitureNeeds.join('|')}`)
  if (ctx.roomContext?.spatialConstraints?.length) lines.push(`room_constraints=${ctx.roomContext.spatialConstraints.join('|')}`)

  if (ctx.universalNeeds && Object.values(ctx.universalNeeds).some(Boolean)) {
    const parts: string[] = []
    if (ctx.universalNeeds.durability)          parts.push(`durability=${ctx.universalNeeds.durability}`)
    if (ctx.universalNeeds.space)               parts.push(`space=${ctx.universalNeeds.space}`)
    if (ctx.universalNeeds.materials_avoid?.length) parts.push(`avoid_materials=${ctx.universalNeeds.materials_avoid.join('|')}`)
    lines.push(`universal_needs=${parts.join(' ')}`)
  }

  if (ctx.typeSpecificNeeds && Object.keys(ctx.typeSpecificNeeds).length > 1) {
    const typeParts = Object.entries(ctx.typeSpecificNeeds)
      .filter(([key, val]) => key !== 'type' && val)
      .map(([key, val]) => `${key}=${val}`)
    if (typeParts.length > 0) {
      lines.push(`type_specific_needs[${ctx.typeSpecificNeeds.type}]=${typeParts.join(' ')}`)
    }
  }

  if (ctx.contextualAnswers && Object.keys(ctx.contextualAnswers).length > 0) {
    const answers = Object.entries(ctx.contextualAnswers).map(([k, v]) => `${k}=${v}`).join(' ')
    lines.push(`contextual_answers=${answers}`)
  }

  if (ctx.additionalNotes?.trim()) {
    lines.push(`additional_notes="${ctx.additionalNotes.trim()}" → treat as soft preference signal; use for ranking explanation only when supported by item data`)
  }

  if (ctx.existingFurnitureDesc?.trim()) {
    lines.push(`existing_furniture="${ctx.existingFurnitureDesc.trim()}" → match or contrast as appropriate`)
  }

  if (ctx.alreadyRejected?.trim()) {
    lines.push(`already_rejected="${ctx.alreadyRejected.trim()}" → do NOT recommend these`)
  }

  return lines.join('\n')
}

// ── Main prompt builder ────────────────────────────────────────────

export function buildRecommendationsPrompt(
  ctx: UserContext,
  items: SlimItem[],
  relaxedFlags: string[],
  painContext: PainPointContext,
): string {
  const wallCm  = Math.round(Math.sqrt(ctx.roomSqft * 929) * 0.5)
  const budget  = ctx.budget
  const budgetMax = ctx.budgetMax ?? Math.round(budget * 1.4)
  const budget112 = Math.round(budget * 1.12)
  const stretchCap = Math.min(budgetMax, Math.round(budget * 1.15))

  const useCaseBonuses: string[] = []
  if (ctx.useCase.includes('kids') || ctx.useCase.includes('pets'))
    useCaseBonuses.push('kids/pets:   maint=high +8pts, durScore≥4 +5pts — non-negotiable override')
  if (ctx.useCase.includes('wfh'))
    useCaseBonuses.push('wfh:         ergonomic or wfh tag +8pts')
  if (ctx.useCase.includes('guests'))
    useCaseBonuses.push('guests:      sofa-bed or convertible tag +8pts')

  const userContextBlock  = buildUserContextBlock(ctx, budgetMax, painContext)
  const scoringRulesBlock = buildScoringRules(ctx, wallCm, painContext, useCaseBonuses)

  return `Output ONLY valid JSON — no markdown, no explanation.

USER CONTEXT:
${userContextBlock}

${scoringRulesBlock}

ITEMS TO SCORE:
${JSON.stringify(items)}

TIER RULES:
primary: score≥50 AND price≤₹${budget}, max 10 items, sort desc by score
stretch: score≥64 AND price >₹${budget} and price≤₹${stretchCap}, max 2 items, sort desc by score
stretch gate: include ONLY if item has a concrete, user-relevant improvement over likely in-budget options such as higher durabilityScore, longer warranty, better rating/reviews, easier maintenance, or materially better size fit for room constraints
soft preference: prefer stretch items within ~12% of budget (≤₹${budget112}) unless a stronger quantified gain clearly justifies going higher
discard: everything else — omit entirely

OUTPUT SHAPE (exact keys, no extras):
{
  "summary": "Found N [style] items in [city] under ₹[budget] ranked by [priority]",
  "archetypeLabel": "<3-5 word label>",
  "contextInsights": ["<max 2 specific insights that changed ranking>"],
  "items": [
    {
      "id": "<exact item id from ITEMS>",
      "score": <0-100>,
      "tier": "primary" | "stretch",
      "whyItFits": "<≤40 words — MUST include ₹price OR dimensions in cm AND one signal from: pain/room/contextual/trigger/existing>",
      "stretchJustification": null | "₹[exact_overage] over your ₹${budget} budget. Worth it because: [specific improvement vs likely in-budget options] and why that matters for this user's room, pain point, or contextual answers"
    }
  ],
  "flaggedIssues": []
}

FORBIDDEN (accuracy killers):
- Generic praise: "great quality", "beautiful", "perfect", "stunning", "ideal", "excellent"
- Items not in the ITEMS list
- Hallucinating features not in item data
- Overriding pain_point hard exclusions
- whyItFits without a real number (₹, cm, or rating)
- stretch items without a quantified improvement tied to user needs
${relaxedFlags.length > 0 ? `\nNOTE: ${relaxedFlags.join('; ')}` : ''}`
}
