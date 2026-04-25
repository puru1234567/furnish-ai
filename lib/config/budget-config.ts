// lib/config/budget-config.ts
// Budget, timeline, and delivery preferences

export interface BudgetOption {
  label: string
  desc: string
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { label: 'Stick to it', desc: 'No surprises beyond this amount' },
  { label: 'Small overflow OK', desc: 'Can go ₹5k–10k above if right item' },
  { label: 'Flexible', desc: 'Best match is priority, budget secondary' },
]

export const TIMELINES = [
  'This week',
  'This month',
  'Next month',
  'Exploring (no rush)',
]

export const DELIVERIES = [
  '🚗 Pickup preferred',
  '📦 Delivery required',
  '↔️ Either works',
]

/**
 * Get budget option by label
 */
export function getBudgetOption(label: string): BudgetOption | null {
  return BUDGET_OPTIONS.find(bo => bo.label === label) ?? null
}

/**
 * Validate timeline option
 */
export function isValidTimeline(timeline: string): boolean {
  return TIMELINES.includes(timeline)
}

/**
 * Validate delivery preference
 */
export function isValidDeliveryPreference(delivery: string): boolean {
  return DELIVERIES.includes(delivery)
}
