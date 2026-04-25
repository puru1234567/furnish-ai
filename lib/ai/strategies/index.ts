// lib/ai/strategies/index.ts
// Strategies exports

export type { IPainPointStrategy } from './PainPointStrategy'
export {
  StainResistanceStrategy,
  DurabilityStrategy,
  ComfortStrategy,
  CompactStrategy,
  AssemblyStrategy,
} from './PainPointStrategy'
export { getPainPointStrategyRegistry } from './PainPointStrategyRegistry'
