import type { PersonalizationSignalType } from "./types"

export const SIGNAL_WEIGHTS: Record<PersonalizationSignalType, number> = {
  click: 1,
  compare: 2,
  save: 3,
  dwell: 1.5,
  search: 1,
  search_refined: 1.2,
}

export const PERSONALIZATION_WEIGHTS = {
  style: 0.24,
  budget: 0.2,
  room: 0.18,
  color: 0.14,
  category: 0.2,
  behaviorBoost: 0.04,
} as const

export const PROFILE_CONFIDENCE_CONFIG = {
  minEventsForWeakSignal: 6,
  minEventsForStrongSignal: 25,
  maxPersonalizationWeight: 0.45,
  minPersonalizationWeight: 0.12,
} as const

export function computePersonalizationWeight(behavioralVolume: number): number {
  const { minEventsForWeakSignal, minEventsForStrongSignal, minPersonalizationWeight, maxPersonalizationWeight } = PROFILE_CONFIDENCE_CONFIG

  if (behavioralVolume <= minEventsForWeakSignal) return minPersonalizationWeight
  if (behavioralVolume >= minEventsForStrongSignal) return maxPersonalizationWeight

  const t = (behavioralVolume - minEventsForWeakSignal) / (minEventsForStrongSignal - minEventsForWeakSignal)
  return minPersonalizationWeight + t * (maxPersonalizationWeight - minPersonalizationWeight)
}
