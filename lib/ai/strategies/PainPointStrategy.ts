// lib/ai/strategies/PainPointStrategy.ts
// Strategy pattern for pain-point filtering and scoring

import type { FurnitureItem, PainPointType } from '@/lib/types'

/**
 * Strategy for filtering and scoring items based on a pain point
 */
export interface IPainPointStrategy {
  /**
   * Hard filter: item must pass this to be considered
   */
  hardFilter(item: FurnitureItem): boolean

  /**
   * Boost score: how well this item addresses the pain point
   */
  boostScore(item: FurnitureItem): number

  /**
   * Get labels to pass to AI (exclude/boost signals)
   */
  getLabels(): { exclude: string[]; boost: string[] }
}

// ────────────────────────────────────────────────────────────────

/**
 * Stains too easily — prioritize stain-resistant materials
 */
export class StainResistanceStrategy implements IPainPointStrategy {
  hardFilter(item: FurnitureItem): boolean {
    const material = item.material.toLowerCase()
    return !material.includes('velvet') && !(material.includes('linen') && material.includes('light'))
  }

  boostScore(item: FurnitureItem): number {
    const material = item.material.toLowerCase()
    const tags = item.tags.map(t => t.toLowerCase())

    let score = 0
    if (material.includes('microfiber') || material.includes('leather'))  score++
    if (tags.includes('dark-fabric')) score++
    if (item.maintenanceEase === 'high') score++

    return score
  }

  getLabels() {
    return {
      exclude: ['Exclude light linen and velvet-heavy upholstery'],
      boost: ['Prioritize microfiber, leather, leatherette, dark fabric, and high maintenance ease'],
    }
  }
}

// ────────────────────────────────────────────────────────────────

/**
 * Broke down / poor durability — prioritize durable items with warranties
 */
export class DurabilityStrategy implements IPainPointStrategy {
  hardFilter(item: FurnitureItem): boolean {
    return item.durabilityScore >= 3
  }

  boostScore(item: FurnitureItem): number {
    let score = 0
    if (item.warrantyYears > 1) score++
    if (item.durabilityScore >= 4) score++
    return score
  }

  getLabels() {
    return {
      exclude: ['Exclude durability score below 3'],
      boost: ['Prioritize warranty longer than 1 year and durability score 4 or 5'],
    }
  }
}

// ────────────────────────────────────────────────────────────────

/**
 * Too uncomfortable — prioritize ergonomic items with good depth/rating
 */
export class ComfortStrategy implements IPainPointStrategy {
  hardFilter(): boolean {
    // No hard constraint for comfort
    return true
  }

  boostScore(item: FurnitureItem): number {
    const tags = item.tags.map(t => t.toLowerCase())
    let score = 0

    if (item.dimensions.depth > 80) score++
    if (tags.includes('ergonomic')) score++
    if (item.rating > 4.0) score++

    return score
  }

  getLabels() {
    return {
      exclude: [],
      boost: ['Prioritize depth above 80cm, ergonomic tags, and rating above 4.0'],
    }
  }
}

// ────────────────────────────────────────────────────────────────

/**
 * Too bulky / took up too much space — prioritize compact items
 */
export class CompactStrategy implements IPainPointStrategy {
  hardFilter(item: FurnitureItem): boolean {
    return item.dimensions.width <= 200
  }

  boostScore(item: FurnitureItem): number {
    const tags = item.tags.map(t => t.toLowerCase())
    let score = 0

    if (tags.includes('compact')) score++
    if (tags.includes('modular')) score++
    if (tags.includes('space-saving')) score++

    return score
  }

  getLabels() {
    return {
      exclude: ['Exclude width above 200cm'],
      boost: ['Prioritize compact, modular, and space-saving tags'],
    }
  }
}

// ────────────────────────────────────────────────────────────────

/**
 * Assembly nightmare — prioritize easy-to-assemble items
 */
export class AssemblyStrategy implements IPainPointStrategy {
  hardFilter(item: FurnitureItem): boolean {
    return item.assemblyComplexity !== 'high'
  }

  boostScore(item: FurnitureItem): number {
    const tags = item.tags.map(t => t.toLowerCase())
    let score = 0

    if (tags.includes('no-assembly')) score += 3
    if (tags.includes('easy-assembly')) score += 2
    if (tags.includes('professional-assembly-included')) score++

    return score
  }

  getLabels() {
    return {
      exclude: ['Exclude high assembly complexity'],
      boost: ['Prioritize no-assembly, easy-assembly, and professional-assembly-included tags'],
    }
  }
}
