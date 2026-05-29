import type { RecommendationResponse, RecommendedItem, RoomAnalysis } from '@/lib/types'
import type { FormData } from '@/app/find/find-page-model'

const STORAGE_KEY = 'furnish_ai_results'

export interface StoredResults {
  results: RecommendedItem[]
  meta: Pick<RecommendationResponse, 'summary' | 'archetypeLabel' | 'contextInsights' | 'flaggedIssues' | 'exclusionSummary' | 'pipelineDebug'>
  form: FormData
  roomAnalysis: RoomAnalysis | null
}

export interface SavedResultSummary {
  roomType: string
  furnitureType: string
  itemCount: number
  summary: string
}

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function saveStoredResults(data: StoredResults) {
  if (!canUseStorage()) return

  const serialized = JSON.stringify(data)
  window.sessionStorage.setItem(STORAGE_KEY, serialized)
  window.localStorage.setItem(STORAGE_KEY, serialized)
}

export function readStoredResults(): StoredResults | null {
  if (!canUseStorage()) return null

  const raw = window.sessionStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredResults
    if (!window.sessionStorage.getItem(STORAGE_KEY)) {
      window.sessionStorage.setItem(STORAGE_KEY, raw)
    }
    return parsed
  } catch {
    return null
  }
}

export function readSavedResultSummary(): SavedResultSummary | null {
  const stored = readStoredResults()
  if (!stored) return null

  return {
    roomType: stored.form?.roomType ?? 'room',
    furnitureType: stored.form?.furnitureType ?? 'shortlist',
    itemCount: stored.results?.length ?? 0,
    summary: stored.meta?.summary ?? 'Your last room read is ready to revisit.',
  }
}