// app/api/recommend/route.ts
// Key fixes in this version:
//   1. PROMPT.md is never sent to the API — only buildCompactPrompt() output goes
//   2. Filter relaxation is tiered — style is the LAST thing relaxed, not first
//   3. Prompt includes painPoint + purchaseTrigger + alreadyRejected signals
//   4. Token budget: ~3.2k tokens total (prompt + 15 slim items)

import { NextRequest, NextResponse } from 'next/server'
import { furnitureData } from '@/lib/furniture-data'
import { UserContext, FurnitureItem, RecommendedItem, PainPointType } from '@/lib/types'

// ── Provider config ────────────────────────────────────────────────
const PROVIDER =
  process.env.GEMINI_API_KEY ? 'gemini'
  : process.env.GROQ_API_KEY  ? 'groq'
  : 'ollama'

// ── Slim type — only scoring-relevant fields ───────────────────────
interface SlimItem {
  id: string; name: string; brand: string; price: number
  style: string[]; material: string; w: number; depth: number
  dur: string; durScore: number; maint: string; warrantyYears: number
  assembly: string; rating: number; reviews: number; tags: string[]
}

const slim = (i: FurnitureItem): SlimItem => ({
  id: i.id, name: i.name, brand: i.brand, price: i.price,
  style: i.style, material: i.material, w: i.dimensions.width, depth: i.dimensions.depth,
  dur: i.durability, durScore: i.durabilityScore, maint: i.maintenanceEase,
  warrantyYears: i.warrantyYears, assembly: i.assemblyComplexity,
  rating: i.rating, reviews: i.reviewCount, tags: i.tags,
})

interface PainPointContext {
  selectedPainTypes: PainPointType[]
  boostSignals: string[]
  excludedSignals: string[]
}

interface AIRecommendationItem {
  id: string
  score?: number
  tier?: 'primary' | 'stretch'
  whyItFits?: string
  stretchJustification?: string | null
}

interface AIRecommendationPayload {
  summary?: string
  archetypeLabel?: string
  contextInsights?: string[]
  items?: AIRecommendationItem[]
  flaggedIssues?: string[]
}

const PAIN_POINT_LABELS: Record<PainPointType, string> = {
  stains_easily: 'Stains too easily',
  broke_down_durability: 'Broke down / poor durability',
  too_uncomfortable: 'Too uncomfortable',
  too_bulky: 'Too bulky / took up too much space',
  assembly_nightmare: 'Assembly was a nightmare',
}

const PAIN_POINT_RULES: Record<PainPointType, { excludedSignals: string[]; boostSignals: string[] }> = {
  stains_easily: {
    excludedSignals: ['Exclude light linen and velvet-heavy upholstery'],
    boostSignals: ['Prioritize microfiber, leather, leatherette, dark fabric, and high maintenance ease'],
  },
  broke_down_durability: {
    excludedSignals: ['Exclude durability score below 3'],
    boostSignals: ['Prioritize warranty longer than 1 year and durability score 4 or 5'],
  },
  too_uncomfortable: {
    excludedSignals: [],
    boostSignals: ['Prioritize depth above 80cm, ergonomic tags, and rating above 4.0'],
  },
  too_bulky: {
    excludedSignals: ['Exclude width above 200cm'],
    boostSignals: ['Prioritize compact, modular, and space-saving tags'],
  },
  assembly_nightmare: {
    excludedSignals: ['Exclude high assembly complexity'],
    boostSignals: ['Prioritize no-assembly, easy-assembly, and professional-assembly-included tags'],
  },
}

const uniq = <T,>(values: T[]) => [...new Set(values)]

function passesPainHardFilter(item: FurnitureItem, pain: PainPointType): boolean {
  const material = item.material.toLowerCase()

  switch (pain) {
    case 'stains_easily':
      return !material.includes('velvet') && !(material.includes('linen') && material.includes('light'))
    case 'broke_down_durability':
      return item.durabilityScore >= 3
    case 'too_uncomfortable':
      return true
    case 'too_bulky':
      return item.dimensions.width <= 200
    case 'assembly_nightmare':
      return item.assemblyComplexity !== 'high'
  }
}

function getPainBoostScore(item: FurnitureItem, painPoints: PainPointType[]): number {
  const material = item.material.toLowerCase()
  const tags = item.tags.map(tag => tag.toLowerCase())
  let score = 0

  for (const pain of painPoints) {
    switch (pain) {
      case 'stains_easily':
        if (
          material.includes('microfiber') ||
          material.includes('leather') ||
          tags.includes('dark-fabric') ||
          item.maintenanceEase === 'high'
        ) score += 1
        break
      case 'broke_down_durability':
        if (item.warrantyYears > 1 || item.durabilityScore >= 4) score += 1
        break
      case 'too_uncomfortable':
        if (item.dimensions.depth > 80 || tags.includes('ergonomic') || item.rating > 4.0) score += 1
        break
      case 'too_bulky':
        if (tags.includes('compact') || tags.includes('modular') || tags.includes('space-saving')) score += 1
        break
      case 'assembly_nightmare':
        if (
          tags.includes('no-assembly') ||
          tags.includes('easy-assembly') ||
          tags.includes('professional-assembly-included')
        ) score += 1
        break
    }
  }

  return score
}

function buildPainPointContext(painPoints: PainPointType[]): PainPointContext {
  if (painPoints.length === 0) {
    return {
      selectedPainTypes: [],
      boostSignals: ['No prior furniture issue selected. Explain shortlist from scratch.'],
      excludedSignals: [],
    }
  }

  return {
    selectedPainTypes: painPoints,
    boostSignals: uniq(painPoints.flatMap(pain => PAIN_POINT_RULES[pain].boostSignals)),
    excludedSignals: uniq(painPoints.flatMap(pain => PAIN_POINT_RULES[pain].excludedSignals)),
  }
}

function applyPainPointFilters(
  items: FurnitureItem[],
  painPoints: PainPointType[],
  relaxed: string[],
): { items: FurnitureItem[]; painContext: PainPointContext } {
  const painContext = buildPainPointContext(painPoints)

  if (painPoints.length === 0) {
    return { items, painContext }
  }

  const filtered = items.filter(item => painPoints.every(pain => passesPainHardFilter(item, pain)))
  if (filtered.length === 0) {
    relaxed.push('Current inventory could not satisfy every hard pain-point rule, so broader matches were restored.')
    return { items, painContext }
  }

  return { items: filtered, painContext }
}

// ── Smart filter with tiered relaxation ───────────────────────────
// Old problem: style was filtered hard BEFORE sending to AI.
// If user picks "traditional" and inventory has 2 traditional items → 2 results.
// Fix: city + budget + delivery are hard filters (non-negotiable).
//      Style is a SOFT filter — AI handles it via scoring, not pre-exclusion.
//      We only pre-filter style if we have >15 items after hard filters (to trim).
function filterItems(ctx: UserContext): { items: FurnitureItem[]; relaxed: string[]; painContext: PainPointContext } {
  const relaxed: string[] = []
  const hardMatch = (i: FurnitureItem) =>
    (i.cities.includes(ctx.city) || i.cities.includes('All India')) &&
    (!ctx.deliveryOk || i.deliveryAvailable) &&
    (ctx.urgency !== 'this_week' || i.inStock)

  // Budget filter: use budgetMax as ceiling so stretch items are included
  const ceiling = ctx.budgetMax ?? ctx.budget * 1.5
  const floor   = ctx.budget * 0.65

  let pool = furnitureData.filter(i =>
    hardMatch(i) && i.price >= floor && i.price <= ceiling
  )

  // If pool is still empty, relax city to All India only
  if (pool.length === 0) {
    pool = furnitureData.filter(i =>
      i.cities.includes('All India') && i.price >= floor && i.price <= ceiling
    )
    relaxed.push(`No items found in ${ctx.city} — showing All India delivery options`)
  }

  const painFiltered = applyPainPointFilters(pool, ctx.painPoint ?? [], relaxed)
  pool = painFiltered.items

  // If pool > 15, use style pre-filter to trim (soft — keeps partial matches)
  if (pool.length > 15) {
    const styleFiltered = pool.filter(i =>
      i.style.some(s => ctx.stylePreference.includes(s))
    )
    // Only apply style trim if it leaves ≥8 items
    if (styleFiltered.length >= 8) {
      pool = styleFiltered
    }
    // Otherwise send all — AI will score style appropriately
  }

  // Sort: style overlap first, then by rating (best pre-ranking before AI)
  pool.sort((a, b) => {
    const aPain = getPainBoostScore(a, ctx.painPoint ?? [])
    const bPain = getPainBoostScore(b, ctx.painPoint ?? [])
    const aStyle = a.style.filter(s => ctx.stylePreference.includes(s)).length
    const bStyle = b.style.filter(s => ctx.stylePreference.includes(s)).length
    if (bPain !== aPain) return bPain - aPain
    if (bStyle !== aStyle) return bStyle - aStyle
    return b.rating - a.rating
  })

  return { items: pool.slice(0, 15), relaxed, painContext: painFiltered.painContext }
}

// ── Compact prompt — intent-aware, ~3.2k tokens ────────────────────
// What makes this version smarter than before:
//   - painPoint directly maps to material/durability filters in AI reasoning
//   - purchaseTrigger tells AI how broad or narrow to be
//   - alreadyRejected eliminates brands/styles the user has consciously rejected
//   - existingFurnitureDesc gives AI the room context without a photo
//   - budgetMax enables honest stretch tier without guessing
function buildPrompt(ctx: UserContext, items: SlimItem[], relaxedFlags: string[], painContext: PainPointContext): string {
  const wall    = Math.round(Math.sqrt(ctx.roomSqft * 929) * 0.5)
  const budget  = ctx.budget
  const bMax    = ctx.budgetMax ?? Math.round(budget * 1.4)

  // Derive intent summary from trigger — replaces vague "why"
  const triggerContext: Record<string, string> = {
    new_home:   'Furnishing from scratch — prioritise delivery availability and versatility',
    replacing:  'Has something broken/old — knows the category, wants fast decision',
    upgrading:  'Has existing furniture — match or intentionally contrast existing style',
    gifting:    'Buying for someone else — practical fit over personal aesthetic',
    renovating: 'Partial redo — must work with existing pieces in the room',
  }

  // Build use-case bonus rules only for signals present
  const useCaseRules: string[] = []
  if (ctx.useCase.includes('kids') || ctx.useCase.includes('pets'))
    useCaseRules.push('kids/pets: maint=high +8pts, dur=high +5pts — non-negotiable')
  if (ctx.useCase.includes('wfh'))
    useCaseRules.push('wfh: ergonomic/wfh tags +8pts')
  if (ctx.useCase.includes('guests'))
    useCaseRules.push('guests: sofa-bed/convertible +8pts')

  const hasExisting  = ctx.existingFurnitureDesc?.trim().length > 0
  const hasRejected  = ctx.alreadyRejected?.trim().length > 0

  const priorityRule: Record<string, string> = {
    price:   'cheapest items rank higher',
    quality: 'highest durability+rating items rank higher',
    design:  'best style-tag overlap items rank higher',
    reviews: 'highest (rating × log10(reviews)) items rank higher',
  }

  return `You are a furniture recommendation AI. Output ONLY valid JSON, no markdown, no explanation.

USER:
room=${ctx.roomType} sqft=${ctx.roomSqft} city=${ctx.city} budget=₹${budget} budget_max=₹${bMax}
style=${ctx.stylePreference.join('+')} use_case=${ctx.useCase.join(',')}
urgency=${ctx.urgency} priority=${ctx.rankingPriority} delivery=${ctx.deliveryOk}
trigger=${ctx.purchaseTrigger} → ${triggerContext[ctx.purchaseTrigger]}
pain_point_context=${JSON.stringify({
  selectedLabels: painContext.selectedPainTypes.map(pain => PAIN_POINT_LABELS[pain]),
  selectedPainTypes: painContext.selectedPainTypes,
  excludedSignals: painContext.excludedSignals,
  boostSignals: painContext.boostSignals,
})}
${hasExisting   ? `existing_furniture="${ctx.existingFurnitureDesc}" → match or contrast as appropriate` : ''}
${hasRejected   ? `already_rejected="${ctx.alreadyRejected}" → do NOT recommend these brands/styles` : ''}

SCORING (0–100):
style_match:  +25 all tags match, +15 partial (≥1 tag), +0 none
size_fit:     +20 if w≤${wall}cm, +10 if w≤${Math.round(wall*1.15)}cm, +0 oversized
price:        +20 if ≤₹${Math.round(budget*.9)}, +15 if ≤₹${budget}, +8 if ≤₹${Math.round(budget*1.25)}, +0 over
use_case:     +5 per matching tag (max 20pts)
${useCaseRules.join('\n')}
priority:     ${priorityRule[ctx.rankingPriority]} → top performer gets +10pts
social_proof: +5 if rating≥4.3 and reviews≥500, +3 if ≥4.0 and ≥200
pain_point:   excludedSignals are hard constraints already applied before ranking; boostSignals are hard ranking preferences inside the remaining pool

ITEMS:
${JSON.stringify(items)}

TIERS:
primary: score≥50, price≤₹${Math.round(budget*1.25)}, max 10 items
stretch: score≥60, price ₹${Math.round(budget*1.25)}–₹${bMax}, max 3 items
discard: everything else — do not mention

OUTPUT (exact JSON shape, no extra keys):
{"summary":"Found N [style] items in [city] under ₹[budget] ranked by [priority]","archetypeLabel":"3-5 word label","contextInsights":["max 2 specific insights that changed ranking"],"items":[{"id":"exact_id","score":0,"tier":"primary","whyItFits":"1 sentence ≤40 words with at least one real number AND one intent signal from pain_point/trigger/existing","stretchJustification":null}],"flaggedIssues":[]}

RULES:
- stretch items: stretchJustification = "₹[exact_over] over your ₹${budget} budget. Worth it because: [quantified reason]"
- whyItFits: MUST reference ₹ amount OR sqft OR cm AND at least one user intent (pain_point/trigger/existing)
- NEVER generic phrases: "great quality","beautiful","perfect","stunning","ideal","excellent"
- NEVER recommend items outside the ITEMS list
- If pain_point_context.selectedPainTypes is empty, explain choices as first-purchase guidance from scratch
- If pain_point_context.selectedPainTypes is non-empty, mention the specific issue being solved and treat boostSignals as hard ranking preferences
- sort primary desc by score, then stretch desc by score
${relaxedFlags.length > 0 ? `- NOTE: ${relaxedFlags.join('; ')}` : ''}`
}

// ── Gemini ─────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<AIRecommendationPayload> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}') as AIRecommendationPayload
}

// ── Groq ───────────────────────────────────────────────────────────
async function callGroq(prompt: string): Promise<AIRecommendationPayload> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Furniture recommendation AI. Output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return JSON.parse(data.choices[0]?.message?.content ?? '{}') as AIRecommendationPayload
}

// ── Router ─────────────────────────────────────────────────────────
async function callAI(prompt: string): Promise<AIRecommendationPayload> {
  // Only Gemini and Groq supported; Ollama fallback commented out for clarity
  try {
    if (PROVIDER === 'gemini') return await callGemini(prompt)
    if (PROVIDER === 'groq')   return await callGroq(prompt)
    // return await callOllama(prompt)
    throw new Error('No supported AI provider configured.')
  } catch (error: unknown) {
    // Commented out Ollama fallback
    // if (PROVIDER !== 'ollama') {
    //   console.warn('[recommend] Primary failed, falling back to Ollama:', error)
    //   return callOllama(prompt)
    // }
    throw error
  }
}

// ── Handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ctx: UserContext = await req.json()

    const { items: eligible, relaxed, painContext } = filterItems(ctx)

    if (eligible.length === 0) {
      return NextResponse.json({
        summary: `No items found for your criteria.`,
        archetypeLabel: '',
        contextInsights: [],
        visionSummary: null,
        items: [],
        flaggedIssues: [`No items matched in ${ctx.city} at ₹${ctx.budget.toLocaleString('en-IN')}. Try a higher budget or different city.`],
      })
    }

    const prompt   = buildPrompt(ctx, eligible.map(slim), relaxed, painContext)
    const aiResult = await callAI(prompt)

    const itemMap = new Map(furnitureData.map(i => [i.id, i]))
    const recommended = (aiResult.items ?? [])
      .map((ai: AIRecommendationItem) => {
        const full = itemMap.get(ai.id)
        if (!full) return null
        return { ...full, score: ai.score ?? 0, tier: ai.tier ?? 'primary', whyItFits: ai.whyItFits ?? '', stretchJustification: ai.stretchJustification ?? null }
      })
      .filter(Boolean) as RecommendedItem[]

    return NextResponse.json({
      summary:         aiResult.summary         ?? '',
      archetypeLabel:  aiResult.archetypeLabel   ?? '',
      contextInsights: aiResult.contextInsights  ?? [],
      visionSummary:   null,
      items:           recommended,
      flaggedIssues:   [...(aiResult.flaggedIssues ?? []), ...relaxed],
    })
  } catch (error: unknown) {
    console.error('[recommend] Error:', error)
    // Propagate error details for frontend error step
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Recommendation failed.',
      details: error instanceof Error ? error.stack ?? null : null,
    }, { status: 500 })
  }
}
