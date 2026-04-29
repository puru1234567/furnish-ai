import { FURNITURE_INPUT_ALIASES, FURNITURE_TYPES } from './find-page-constants'

export interface ParsedIntake {
  furnitureType?: string
  candidates: string[]
  issue?: 'missing_request' | 'unknown_item' | 'multi_item'
}

function normalizeInput(value: string) {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `
}

function matchesAlias(normalizedInput: string, alias: string) {
  const normalizedAlias = normalizeInput(alias)
  return normalizedInput.includes(normalizedAlias)
}

export function parseFurnitureRequest(input: string): ParsedIntake {
  const normalizedInput = normalizeInput(input)

  if (normalizedInput.trim().length <= 2) {
    return { candidates: [], issue: 'missing_request' }
  }

  const matchedIds = Object.entries(FURNITURE_INPUT_ALIASES)
    .filter(([, aliases]) => aliases.some(alias => matchesAlias(normalizedInput, alias)))
    .map(([id]) => id)

  const uniqueMatches = [...new Set(matchedIds)]

  if (uniqueMatches.length === 1) {
    return { furnitureType: uniqueMatches[0], candidates: uniqueMatches }
  }

  if (uniqueMatches.length > 1) {
    return { candidates: uniqueMatches, issue: 'multi_item' }
  }

  const fuzzyCandidates = FURNITURE_TYPES
    .filter(item => normalizedInput.includes(item.label.toLowerCase().split(' ')[0]))
    .map(item => item.id)

  if (fuzzyCandidates.length === 1) {
    return { furnitureType: fuzzyCandidates[0], candidates: fuzzyCandidates }
  }

  return { candidates: fuzzyCandidates, issue: 'unknown_item' }
}