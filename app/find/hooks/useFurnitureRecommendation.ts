import { useState, useCallback } from 'react'
import type { RecommendedItem, RecommendationResponse, UserContext, PipelineDebug } from '@/lib/types'
import { sortRecommendations, type SortOption } from '@/lib/utils/sort-items'
import { getRejectedIds } from '@/lib/services/userDataService'

interface RecommendationMeta {
  summary: string
  archetypeLabel: string
  contextInsights: string[]
  flaggedIssues: string[]
  pipelineDebug?: PipelineDebug
  exclusionSummary?: RecommendationResponse['exclusionSummary']
}

/**
 * Manages furniture recommendation API calls and result state
 */
export function useFurnitureRecommendation() {
  const [results, setResults] = useState<RecommendedItem[]>([])
  const [meta, setMeta] = useState<RecommendationMeta>({
    summary: '',
    archetypeLabel: '',
    contextInsights: [],
    flaggedIssues: [],
    pipelineDebug: undefined,
    exclusionSummary: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<string[]>([])
  const [priceFilter, setPriceFilter] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')

  const getRecommendations = useCallback(async (ctx: UserContext, userId: string | null) => {
    setLoading(true)
    setError('')

    try {
      const rejectedIds = userId
        ? await getRejectedIds(userId)
        : []

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ctx,
          alreadyRejected: rejectedIds.join(', '),
          alreadyRejectedIds: rejectedIds,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch((): { error?: string } => ({}))
        throw new Error(errData.error || 'API failed')
      }

      const data: RecommendationResponse = await res.json()
      setResults(data.items ?? [])
      setMeta({
        summary: data.summary ?? '',
        archetypeLabel: data.archetypeLabel ?? '',
        contextInsights: data.contextInsights ?? [],
        flaggedIssues: data.flaggedIssues ?? [],
        pipelineDebug: data.pipelineDebug,
        exclusionSummary: data.exclusionSummary,
      })
      return data
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to get recommendations'
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleCompare = useCallback((itemId: string) => {
    setCompareItems(current =>
      current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId]
    )
  }, [])

  const sortedResults = sortRecommendations(results, sortBy)

  const resetRecommendations = useCallback(() => {
    setResults([])
    setMeta({ summary: '', archetypeLabel: '', contextInsights: [], flaggedIssues: [], pipelineDebug: undefined, exclusionSummary: undefined })
    setError('')
    setCompareItems([])
    setCompareMode(false)
    setSortBy('relevance')
  }, [])

  return {
    results: sortedResults,
    meta,
    loading,
    error,
    compareMode,
    setCompareMode,
    compareItems,
    priceFilter,
    setPriceFilter,
    sortBy,
    setSortBy,
    getRecommendations,
    toggleCompare,
    resetRecommendations,
  }
}
