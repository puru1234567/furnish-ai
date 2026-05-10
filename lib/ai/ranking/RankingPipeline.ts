// lib/ai/ranking/RankingPipeline.ts
// Unified ranking pipeline: deterministic scoring → optional LLM reranking
// Follows the principle of "Move logic to code, use LLM only for final soft judgment"

import type { FurnitureItem, UserContext } from '@/lib/types'
import type { PainPointContext } from '@/lib/ai/item-filter'
import { deterministicRanker, type ItemScore } from './DeterministicRankingService'

export interface RankingPipelineResult {
  // Deterministically scored and ranked candidates
  scoredItems: ItemScore[]
  
  // Final tier assignments
  primary: ItemScore[]      // Score >= 50 AND price <= budget
  stretch: ItemScore[]      // Score >= 64 AND price > budget but <= stretch cap
  discarded: ItemScore[]    // Everything else
  
  // Metadata
  totalEvaluated: number
  selectedCount: number     // primary + stretch
}

/**
 * Ranking pipeline orchestrator
 * 
 * Pipeline stages:
 * 1. Deterministic scoring (code-based, 100% explainable)
 * 2. Tier assignment (code-based rules)
 * 3. Optional LLM reranking (only top candidates, for soft judgment)
 * 
 * This architecture ensures:
 * - Controllable token usage (LLM only sees top ~15 items)
 * - Explainability (each score can be audited)
 * - Testability (no LLM dependency for basic ranking)
 * - Hybrid human + AI decision making
 */
export class RankingPipeline {
  /**
   * Score all candidate items deterministically
   */
  scoreAllItems(
    items: FurnitureItem[],
    ctx: UserContext,
    painContext: PainPointContext,
    budget: number,
    budgetMax: number,
    stretchCap: number
  ): ItemScore[] {
    return items
      .map(item =>
        deterministicRanker.scoreItem(item, ctx, painContext, budget, budgetMax, stretchCap)
      )
      .sort((a, b) => b.totalScore - a.totalScore)
  }

  /**
   * Categorize scored items into tiers
   */
  assignTiers(scored: ItemScore[], budget: number, stretchCap: number): RankingPipelineResult {
    const primary: ItemScore[] = []
    const stretch: ItemScore[] = []
    const discarded: ItemScore[] = []

    for (const item of scored) {
      if (item.tier === 'primary') {
        primary.push(item)
      } else if (item.tier === 'stretch') {
        stretch.push(item)
      } else {
        discarded.push(item)
      }
    }

    // Fallback: if no item passed the score threshold (e.g. low-context request
    // with no room photo / style selection), promote the top N by raw score
    // rather than returning an empty result set.
    // Respect price vs budget: over-budget items become stretch, rest become primary.
    if (primary.length === 0 && stretch.length === 0 && scored.length > 0) {
      const top = scored.slice(0, 10)
      const fallbackPrimary: ItemScore[] = []
      const fallbackStretch: ItemScore[] = []
      top.forEach(item => {
        if (item.itemPrice !== undefined && item.itemPrice > budget && item.itemPrice <= stretchCap) {
          item.tier = 'stretch'
          fallbackStretch.push(item)
        } else {
          item.tier = 'primary'
          fallbackPrimary.push(item)
        }
      })
      return {
        scoredItems: scored,
        primary: fallbackPrimary.slice(0, 10),
        stretch: fallbackStretch.slice(0, 2),
        discarded: scored.slice(10),
        totalEvaluated: scored.length,
        selectedCount: fallbackPrimary.length + fallbackStretch.length,
      }
    }

    return {
      scoredItems: scored,
      primary: primary.slice(0, 10),      // Max 10 primary items
      stretch: stretch.slice(0, 2),       // Max 2 stretch items
      discarded,
      totalEvaluated: scored.length,
      selectedCount: primary.length + stretch.length,
    }
  }

  /**
   * Full ranking pipeline
   * 
   * Returns ranked items separated into primary and stretch tiers,
   * ready for either:
   * - Direct display to user (deterministic confidence)
   * - LLM reranking for final soft judgment (on top candidates only)
   */
  rank(
    items: FurnitureItem[],
    ctx: UserContext,
    painContext: PainPointContext,
    budget: number,
    budgetMax: number,
    stretchCap: number
  ): RankingPipelineResult {
    const scored = this.scoreAllItems(
      items,
      ctx,
      painContext,
      budget,
      budgetMax,
      stretchCap
    )

    return this.assignTiers(scored, budget, stretchCap)
  }

  /**
   * Get top N items for LLM reranking
   * 
   * Strategy: combine primary and stretch, but limit LLM input to top 12
   * This dramatically reduces token usage while keeping LLM in the loop
   */
  getTopCandidatesForLLMReranking(result: RankingPipelineResult, maxCount: number = 12): ItemScore[] {
    const candidates = [
      ...result.primary.slice(0, 10),
      ...result.stretch.slice(0, 2),
    ]
    return candidates.slice(0, maxCount)
  }

  /**
   * Build a minimal prompt for LLM to rerank top candidates
   * 
   * LLM only makes soft decisions on final ordering and explanations,
   * not the heavy lifting of filtering/scoring
   */
  buildLLMRerankerPrompt(
    topCandidates: ItemScore[],
    ctx: UserContext
  ): string {
    const candidatesList = topCandidates
      .map(item => `${item.itemId}: ${item.itemName} (₹${ctx.budget}, score=${item.totalScore})`)
      .join('\n')

    return `You are a furniture recommendation expert. 

Below are the top furniture items already scored and ranked by our system (deterministically, based on room fit, budget, pain points, etc.).

Your job: Reorder these by best-fit for the specific user context. Consider:
- User's pain points, style preferences, and existing furniture
- Room constraints and needs from photo analysis  
- Contextual answers about their specific needs
- Which item would make them most satisfied

Top candidates (already vetted):
${candidatesList}

User context:
- Trigger: ${ctx.purchaseTrigger}
- Urgency: ${ctx.urgency}  
- Priority: ${ctx.rankingPriority}
- Room: ${ctx.roomContext?.summary ?? 'unknown'}
- Additional notes: ${ctx.additionalNotes ?? 'none'}

Output exactly this JSON structure, reordered by your judgment:
{
  "reranked": [
    {
      "id": "item_id",
      "reason": "Why this is the best match (≤50 words)"
    }
  ]
}`
  }
}

export const rankingPipeline = new RankingPipeline()
