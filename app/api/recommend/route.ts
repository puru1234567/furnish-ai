import { NextRequest, NextResponse } from 'next/server'
import { UserContext, RecommendedItem } from '@/lib/types'
import { callGroqChat } from '@/lib/ai/groq-client'
import { filterAndRankItems, toSlimItem } from '@/lib/ai/item-filter'
import { buildRecommendationsPrompt } from '@/lib/ai/prompts/recommendations-prompt'
import { getFurnitureRepository } from '@/lib/repositories'

// Slim route orchestrating recommendation flow

export async function POST(req: NextRequest) {
  try {
    const ctx: UserContext = await req.json()

    // Get inventory from repository (later can be Supabase)
    const repository = getFurnitureRepository()
    const allItems = await repository.findAll()

    const { items: eligible, relaxedFlags, painContext } = filterAndRankItems(allItems, ctx)

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

    const prompt = buildRecommendationsPrompt(ctx, eligible.map(toSlimItem), relaxedFlags, painContext)
    const raw = await callGroqChat({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Furniture recommendation AI. Output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 1500,
      jsonMode: true,
    })

    const aiResult = JSON.parse(raw) as {
      summary?: string
      archetypeLabel?: string
      contextInsights?: string[]
      items?: Array<{ id: string; score?: number; tier?: string; whyItFits?: string; stretchJustification?: string | null }>
      flaggedIssues?: string[]
    }

    const itemMap = new Map(allItems.map(i => [i.id, i]))
    const recommended = (aiResult.items ?? [])
      .map(ai => {
        const full = itemMap.get(ai.id)
        if (!full) return null
        return { ...full, score: ai.score ?? 0, tier: ai.tier ?? 'primary', whyItFits: ai.whyItFits ?? '', stretchJustification: ai.stretchJustification ?? null }
      })
      .filter(Boolean) as RecommendedItem[]

    return NextResponse.json({
      summary: aiResult.summary ?? '',
      archetypeLabel: aiResult.archetypeLabel ?? '',
      contextInsights: aiResult.contextInsights ?? [],
      visionSummary: null,
      items: recommended,
      flaggedIssues: [...(aiResult.flaggedIssues ?? []), ...relaxedFlags],
    })
  } catch (error: unknown) {
    console.error('[recommend] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Recommendation failed.',
      details: error instanceof Error ? error.stack ?? null : null,
    }, { status: 500 })
  }
}
