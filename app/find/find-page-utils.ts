import { FURNITURE_TYPES } from './find-page-constants'
import type { ContextualQuestion } from '@/lib/types'

/**
 * Format a number as Indian currency (₹)
 */
export const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

/**
 * Get the display label for a furniture type ID
 */
export const getFurnitureLabel = (value: string) =>
  FURNITURE_TYPES.find(item => item.id === value)?.label ?? value

/**
 * Get the option label from a question's options array
 */
export const getQuestionOptionLabel = (question: ContextualQuestion | undefined, optionId: string | undefined) => {
  if (!question || !optionId) return ''
  return question.options.find(option => option.id === optionId)?.label ?? optionId
}

/**
 * Extract a string from an analysis value or nested label object
 */
export function getAnalysisLabel(value: unknown, fallback = 'Not detected') {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (value && typeof value === 'object' && 'label' in value) {
    const label = (value as { label?: unknown }).label
    if (typeof label === 'string' && label.trim()) return label.trim()
  }

  return fallback
}

/**
 * Convert analysis text value, replacing underscores with spaces
 */
export function getAnalysisText(value: unknown, fallback = 'Not detected') {
  if (typeof value === 'string' && value.trim()) return value.trim().replace(/_/g, ' ')
  return fallback
}
