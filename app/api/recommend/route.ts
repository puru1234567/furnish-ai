import { NextRequest, NextResponse } from 'next/server'
import { UserContext, RecommendedItem } from '@/lib/types'
import { callGroqChat } from '@/lib/ai/groq-client'
import { filterAndRankItems } from '@/lib/ai/item-filter'
import { rankingPipeline } from '@/lib/ai/ranking'
import { getFurnitureRepository } from '@/lib/repositories'
import { ApiLogger } from '@/lib/ai/logger'

/**
 * Recommendation endpoint
 * 
 * Pipeline:
 * 1. Hard filtering: category, budget, city, delivery, stock, pain points
 * 2. Deterministic scoring: pain fit, room fit, style, price, social proof
 * 3. Tier assignment: primary (≥50 & ≤budget), stretch (≥64 & >budget), discard
 * 4. Optional LLM reranking: soft judgment on top 12 candidates for final explanation
 * 
 * Feature flags:
 * - ENABLE_LLM_RERANK: Set to 'false' to skip LLM and return deterministic scores only
 */
export async function POST(req: NextRequest) {
  const logger = new ApiLogger('POST /api/recommend')
  
  try {
    const ctx: UserContext = await req.json()
    logger.info('start', 'Recommendation request received', {
      furnitureType: ctx.furnitureType,
      budget: ctx.budget,
      city: ctx.city,
    })

    // ─ Step 1: Hard filtering ─────────────────────────────────────────────
    const repository = getFurnitureRepository()
    const allItems = await repository.findAll()
    logger.debug('repository', `Loaded ${allItems.length} items from repository`)

    const { items: eligible, relaxedFlags, painContext } = filterAndRankItems(allItems, ctx)
    logger.debug('filtering', `After hard filters: ${eligible.length} eligible items`, { relaxedFlags })

    if (eligible.length === 0) {
      logger.warn('filtering', 'No eligible items after filtering')
      return NextResponse.json({
        summary: `No items found for your criteria.`,
        archetypeLabel: '',
        contextInsights: [],
        visionSummary: null,
        items: [],
        flaggedIssues: [`No items matched in ${ctx.city} at ₹${ctx.budget.toLocaleString('en-IN')}. Try a higher budget or different city.`],
      })
    }

    // ─ Step 2: Deterministic scoring ──────────────────────────────────────
    const budget = ctx.budget
    const budgetMax = ctx.budgetMax ?? Math.round(budget * 1.4)
    const stretchCap = Math.min(budgetMax, Math.round(budget * 1.15))

    const rankingResult = rankingPipeline.rank(
      eligible,
      ctx,
      painContext,
      budget,
      budgetMax,
      stretchCap
    )
    logger.debug('ranking', 'Deterministic ranking complete', {
      primary: rankingResult.primary.length,
      stretch: rankingResult.stretch.length,
      totalEvaluated: rankingResult.totalEvaluated,
    })

    // ─ Step 3: Optional LLM reranking (feature flag) ───────────────────────
    const enableLLMRerank = process.env.ENABLE_LLM_RERANK !== 'false'
    const topCandidates = rankingPipeline.getTopCandidatesForLLMReranking(rankingResult, 12)
    
    let finalOrder = [...rankingResult.primary, ...rankingResult.stretch]
    let archetypeLabel = ''
    let contextInsights: string[] = []

    if (enableLLMRerank && topCandidates.length > 0) {
      logger.info('llm', `Sending ${topCandidates.length} top candidates to LLM for soft reranking`)
      
      try {
        const rerankerPrompt = rankingPipeline.buildLLMRerankerPrompt(topCandidates, ctx)
        const raw = await callGroqChat({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Return only valid JSON. Reorder by best fit.' },
            { role: 'user', content: rerankerPrompt },
          ],
          temperature: 0.1,
          maxTokens: 512,
          jsonMode: true,
        })

        const rerankerResult = JSON.parse(raw) as {
          reranked?: Array<{ id: string; reason?: string }>
        }

        // Validate LLM results against candidate pool
        const candidateIds = topCandidates.map(item => item.itemId)
        const validResults = rerankerResult.reranked?.filter(result => {
          const isValid = candidateIds.includes(result.id)
          if (!isValid) {
            console.warn(
              '[recommend] LLM returned unknown item ID, dropping:',
              result.id
            )
          }
          return isValid
        }) ?? []

        // Rebuild order from LLM
        if (validResults.length > 0) {
          const llmOrderMap = new Map(
            validResults.map((item, idx) => [item.id, { idx, reason: item.reason }])
          )

          // Collect insight from LLM reasoning if available
          const reasons = validResults.slice(0, 2).map(r => r.reason).filter(Boolean)
          contextInsights = reasons as string[]

          // Keep top candidate but allow LLM to suggest different order
          finalOrder.sort((a, b) => {
            const aOrder = llmOrderMap.get(a.itemId)?.idx ?? 999
            const bOrder = llmOrderMap.get(b.itemId)?.idx ?? 999
            return aOrder - bOrder
          })

          logger.debug('llm', 'LLM reranking complete', { insights: contextInsights.length })
        }

        // Determine archetype from top candidate
        if (finalOrder.length > 0) {
          const topItem = finalOrder[0]
          archetypeLabel = `${topItem.itemName.split(' ')[0]} recommendation`
        }
      } catch (error) {
        logger.warn('llm', `LLM reranking failed, using deterministic order: ${error}`)
        // Fall back to deterministic order
      }
    } else {
      logger.info('llm', 'LLM reranking disabled or no candidates')
      // Determine archetype from top candidate
      if (finalOrder.length > 0) {
        const topItem = finalOrder[0]
        archetypeLabel = `${topItem.itemName.split(' ')[0]} recommendation`
      }
    }

    // ─ Step 4: Hydrate full items and prepare response ────────────────────
    const itemMap = new Map(allItems.map(i => [i.id, i]))
    const recommended: RecommendedItem[] = finalOrder
      .map(score => {
        const fullItem = itemMap.get(score.itemId)
        if (!fullItem) return null

        return {
          ...fullItem,
          score: score.totalScore,
          tier: score.tier,
          whyItFits: score.scoringBreakdown, // Include deterministic breakdown
          stretchJustification:
            score.tier === 'stretch'
              ? `₹${(fullItem.price - budget).toLocaleString('en-IN')} over your ₹${budget.toLocaleString('en-IN')} budget`
              : null,
        }
      })
      .filter(Boolean) as RecommendedItem[]

    logger.success('complete', 'Recommendation complete', {
      items: recommended.length,
      primary: recommended.filter(r => r.tier === 'primary').length,
      stretch: recommended.filter(r => r.tier === 'stretch').length,
    })

    return NextResponse.json({
      summary: `Found ${recommended.length} ${ctx.furnitureType || 'furniture'} items in ${ctx.city} ranked by fit.`,
      archetypeLabel,
      contextInsights,
      visionSummary: null,
      items: recommended,
      flaggedIssues: relaxedFlags,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Recommendation failed'
    logger.error('error', message, error as Error)
    return NextResponse.json({
      error: message,
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : null,
    }, { status: 500 })
  }
}
