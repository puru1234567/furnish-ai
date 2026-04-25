import { useState, useCallback } from 'react'
import type { RecommendedItem, RecommendationResponse, UserContext } from '@/lib/types'

interface RecommendationMeta {
  summary: string
  archetypeLabel: string
  contextInsights: string[]
  flaggedIssues: string[]
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
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<string[]>([])
  const [priceFilter, setPriceFilter] = useState(45000)

  const getRecommendations = useCallback(async (ctx: UserContext) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
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
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to get recommendations'
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleCompare = useCallback((itemId: string) => {
    setCompareItems(current => {
      if (current.includes(itemId)) {
        return current.filter(id => id !== itemId)
      } else if (current.length < 2) {
        return [...current, itemId]
      }
      return current
    })
  }, [])

  const resetRecommendations = useCallback(() => {
    setResults([])
    setMeta({ summary: '', archetypeLabel: '', contextInsights: [], flaggedIssues: [] })
    setError('')
    setCompareItems([])
    setCompareMode(false)
  }, [])

  return {
    results,
    meta,
    loading,
    error,
    compareMode,
    setCompareMode,
    compareItems,
    priceFilter,
    setPriceFilter,
    getRecommendations,
    toggleCompare,
    resetRecommendations,
  }
}
