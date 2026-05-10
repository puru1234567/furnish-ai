// lib/ai/ranking/DeterministicRankingService.ts
// Deterministic, testable ranking logic independent of LLM
// Follows Single Responsibility and Dependency Inversion principles

import type { FurnitureItem, UserContext, PainPointType } from '@/lib/types'
import type { PainPointContext } from '@/lib/ai/item-filter'
import { getPainBoostScore } from '@/lib/ai/item-filter'

/**
 * Scoring breakdown for a single item
 * Each score is 0–100, combined via weighted sum
 */
export interface ItemScore {
  itemId: string
  itemName: string
  itemPrice: number           // actual price, needed for tier assignment
  
  // Individual scoring components
  painPointScore: number        // 0–30
  roomCompactScore: number      // 0–20
  roomNeedScore: number         // 0–15
  contextualScore: number       // 0–15
  existingFurnitureScore: number // 0–10
  styleMatchScore: number       // 0–25
  sizeScore: number             // 0–20
  priceTierScore: number        // 0–20
  useCaseScore: number          // 0–20
  socialProofScore: number      // 0–5
  
  // Final composite score
  totalScore: number            // 0–100
  tier: 'primary' | 'stretch' | 'discard'
  
  // Explanation for LLM to use when reranking
  scoringBreakdown: string
}

/**
 * Deterministic ranking service
 * 
 * Responsibility: Calculate deterministic scores for items based on user context
 * Does NOT depend on LLM; provides explainable reasoning for each score
 * 
 * Design:
 * - Each scoring function is pure and testable
 * - Scores are combined via weighted sum (not ML model)
 * - Breakdown can be logged for audit/debugging
 * - LLM only sees top candidates for final reranking/explanation
 */
export class DeterministicRankingService {
  /**
   * Score pain-point compatibility
   * If item doesn't have required durability/maintenance/features → penalize heavily
   * If item has beneficial properties → boost
   */
  private scorePainPoint(item: FurnitureItem, painContext: PainPointContext, budget: number): number {
    if (painContext.selectedPainTypes.length === 0) return 0

    // Boost for items matching pain-point signals
    const boost = getPainBoostScore(item, painContext.selectedPainTypes)
    
    // Hard exclusions should have already been filtered, but safety check
    const hasExcludedSignals = painContext.excludedSignals.some(signal => {
      const searchText = `${item.material} ${item.tags.join(' ')}`
      return searchText.toLowerCase().includes(signal.toLowerCase())
    })

    return hasExcludedSignals ? -30 : Math.min(boost, 30)
  }

  /**
   * Score room compactness fit
   * If room is narrow/tight and item is large → penalize
   * If room is tight and item is compact → boost
   */
  private scoreRoomCompact(item: FurnitureItem, roomSqft: number, spatialConstraints: string[]): number {
    const isCompactRoom = spatialConstraints.some(c => 
      ['narrow', 'tight', 'limited', 'small', 'compact'].some(word => c.toLowerCase().includes(word))
    )

    if (!isCompactRoom) return 0

    const estimatedWallCm = Math.round(Math.sqrt(roomSqft * 929) * 0.5)
    const hasCompactTag = item.tags.some(tag => ['compact', 'small', 'space-saving'].includes(tag))
    const width = item.dimensions.width

    if (width <= estimatedWallCm && hasCompactTag) return 20
    if (width <= estimatedWallCm) return 15
    if (width <= estimatedWallCm * 1.15) return 10
    return 0 // Oversized for tight room
  }

  /**
   * Score alignment with room needs from vision analysis
   */
  private scoreRoomNeeds(item: FurnitureItem, furnitureNeeds: string[]): number {
    if (furnitureNeeds.length === 0) return 0

    const itemTags = new Set(item.tags.map(t => t.toLowerCase()))
    const matches = furnitureNeeds.filter(need => 
      itemTags.has(need.toLowerCase()) || 
      need.includes(item.category)
    ).length

    if (matches > 1) return 15
    if (matches === 1) return 10
    return 0
  }

  /**
   * Score match with contextual answers
   * User answered specific questions about preferences
   */
  private scoreContextual(item: FurnitureItem, contextualAnswers: Record<string, string> | undefined): number {
    if (!contextualAnswers || Object.keys(contextualAnswers).length === 0) return 0

    const answerText = Object.values(contextualAnswers).join(' ').toLowerCase()
    const itemText = `${item.name} ${item.material} ${item.tags.join(' ')}`.toLowerCase()

    // Simple keyword matching; in production, use embedding similarity
    const keywords = answerText.split(/\s+/)
    const matches = keywords.filter(kw => itemText.includes(kw)).length

    if (matches > 3) return 15
    if (matches > 1) return 10
    if (matches > 0) return 5
    return 0
  }

  /**
   * Score compatibility with existing furniture
   */
  private scoreExistingFurniture(
    item: FurnitureItem,
    existingFurniture: string[],
    stylePreference: string[]
  ): number {
    if (existingFurniture.length === 0) return 0

    // Match style with existing furniture
    const styleMatches = item.style.filter(s => stylePreference.includes(s)).length
    if (styleMatches > 0) return 10

    // Check if item complements existing pieces
    const existingText = existingFurniture.join(' ').toLowerCase()
    if (existingText.includes('modern') && item.style.includes('modern')) return 8
    if (existingText.includes('traditional') && item.style.includes('traditional')) return 8

    return 0
  }

  /**
   * Score style tag overlap
   * Full match, partial match, or no match
   */
  private scoreStyleMatch(item: FurnitureItem, stylePreference: string[]): number {
    if (stylePreference.length === 0) return 0

    const itemStyleSet = new Set(item.style as unknown as string[])
    const matchCount = stylePreference.filter(style => itemStyleSet.has(style)).length

    if (matchCount === stylePreference.length) return 25 // All styles match
    if (matchCount > 0) return 15 // Partial match
    return 0
  }

  /**
   * Score size fit for room
   */
  private scoreSize(item: FurnitureItem, roomSqft: number): number {
    const estimatedWallCm = Math.round(Math.sqrt(roomSqft * 929) * 0.5)
    const wall115 = Math.round(estimatedWallCm * 1.15)
    const width = item.dimensions.width

    if (width <= estimatedWallCm) return 20
    if (width <= wall115) return 10
    return 0
  }

  /**
   * Score price tier alignment
   * Reward items near budget, slight penalty for stretches
   */
  private scorePriceTier(
    item: FurnitureItem,
    budget: number,
    budgetMax: number,
    stretchCap: number
  ): number {
    const budget90 = Math.round(budget * 0.9)
    const budget125 = Math.round(budget * 1.25)

    if (item.price <= budget90) return 20
    if (item.price <= budget) return 15
    if (item.price <= budget125) return 8
    if (item.price <= stretchCap) return 5
    return 0
  }

  /**
   * Score use-case specificity (kids, pets, WFH, guests)
   */
  private scoreUseCase(item: FurnitureItem, useCase: string[]): number {
    if (useCase.length === 0) return 0

    let score = 0

    if (useCase.includes('kids') || useCase.includes('pets')) {
      if (item.maintenanceEase === 'high') score += 8
      if (item.durabilityScore >= 4) score += 5
    }

    if (useCase.includes('wfh')) {
      if (item.tags.some(tag => ['ergonomic', 'wfh', 'desk', 'office'].includes(tag))) score += 8
    }

    if (useCase.includes('guests')) {
      if (item.tags.some(tag => ['sofa-bed', 'convertible', 'multi-functional'].includes(tag))) score += 8
    }

    return Math.min(score, 20)
  }

  /**
   * Score social proof (reviews and rating)
   */
  private scoreSocialProof(item: FurnitureItem): number {
    if (item.rating >= 4.3 && item.reviewCount >= 500) return 5
    if (item.rating >= 4.0 && item.reviewCount >= 200) return 3
    return 0
  }

  /**
   * Score an item deterministically
   * Returns breakdown of all score components
   */
  scoreItem(
    item: FurnitureItem,
    ctx: UserContext,
    painContext: PainPointContext,
    budget: number,
    budgetMax: number,
    stretchCap: number
  ): ItemScore {
    const painScore = this.scorePainPoint(item, painContext, budget)
    const roomCompactScore = this.scoreRoomCompact(
      item,
      ctx.roomSqft,
      ctx.roomContext?.spatialConstraints ?? []
    )
    const roomNeedScore = this.scoreRoomNeeds(item, ctx.roomContext?.furnitureNeeds ?? [])
    const contextualScore = this.scoreContextual(item, ctx.contextualAnswers)
    const existingScore = this.scoreExistingFurniture(
      item,
      ctx.roomContext?.existingFurniture ?? [],
      ctx.stylePreference
    )
    const styleScore = this.scoreStyleMatch(item, ctx.stylePreference)
    const sizeScore = this.scoreSize(item, ctx.roomSqft)
    const priceScore = this.scorePriceTier(item, budget, budgetMax, stretchCap)
    const useCaseScore = this.scoreUseCase(item, ctx.useCase)
    const socialProofScore = this.scoreSocialProof(item)

    const totalScore = Math.round(
      painScore +
      roomCompactScore +
      roomNeedScore +
      contextualScore +
      existingScore +
      styleScore +
      sizeScore +
      priceScore +
      useCaseScore +
      socialProofScore
    )

    // Determine tier based on price and score
    let tier: 'primary' | 'stretch' | 'discard' = 'discard'
    if (totalScore >= 50 && item.price <= budget) {
      tier = 'primary'
    } else if (totalScore >= 64 && item.price > budget && item.price <= stretchCap) {
      tier = 'stretch'
    }

    const breakdown = [
      `pain_point: ${painScore}`,
      `room_compact: ${roomCompactScore}`,
      `room_needs: ${roomNeedScore}`,
      `contextual: ${contextualScore}`,
      `existing_fit: ${existingScore}`,
      `style_match: ${styleScore}`,
      `size_fit: ${sizeScore}`,
      `price_tier: ${priceScore}`,
      `use_case: ${useCaseScore}`,
      `social_proof: ${socialProofScore}`,
    ].join(' | ')

    return {
      itemId: item.id,
      itemName: item.name,
      itemPrice: item.price,
      painPointScore: painScore,
      roomCompactScore,
      roomNeedScore,
      contextualScore,
      existingFurnitureScore: existingScore,
      styleMatchScore: styleScore,
      sizeScore,
      priceTierScore: priceScore,
      useCaseScore,
      socialProofScore,
      totalScore,
      tier,
      scoringBreakdown: breakdown,
    }
  }
}

/**
 * Singleton instance
 */
export const deterministicRanker = new DeterministicRankingService()
