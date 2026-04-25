// lib/ai/strategies/PainPointStrategyRegistry.ts
// Registry for pain-point strategies

import type { PainPointType } from '@/lib/types'
import type { IPainPointStrategy } from './PainPointStrategy'
import {
  StainResistanceStrategy,
  DurabilityStrategy,
  ComfortStrategy,
  CompactStrategy,
  AssemblyStrategy,
} from './PainPointStrategy'

/**
 * Registry of pain-point strategies
 * Maps each pain point type to its strategy implementation
 */
class PainPointStrategyRegistry {
  private strategies: Map<PainPointType, IPainPointStrategy> = new Map()

  constructor() {
    // Register all strategies
    this.register('stains_easily', new StainResistanceStrategy())
    this.register('broke_down_durability', new DurabilityStrategy())
    this.register('too_uncomfortable', new ComfortStrategy())
    this.register('too_bulky', new CompactStrategy())
    this.register('assembly_nightmare', new AssemblyStrategy())
  }

  /**
   * Register a strategy for a pain point
   */
  register(painPoint: PainPointType, strategy: IPainPointStrategy): void {
    this.strategies.set(painPoint, strategy)
  }

  /**
   * Get strategy for a pain point
   */
  getStrategy(painPoint: PainPointType): IPainPointStrategy | null {
    return this.strategies.get(painPoint) ?? null
  }

  /**
   * Get all registered pain points
   */
  getAllPainPoints(): PainPointType[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): IPainPointStrategy[] {
    return Array.from(this.strategies.values())
  }
}

// Single instance
const registry = new PainPointStrategyRegistry()

export function getPainPointStrategyRegistry(): PainPointStrategyRegistry {
  return registry
}
