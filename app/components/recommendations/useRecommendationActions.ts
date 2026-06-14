"use client"

import { useMemo, useState } from "react"
import type { AIRecommendation } from "./types"

interface UseRecommendationActionsResult {
  savedIds: Set<string>
  compareIds: Set<string>
  compareItems: AIRecommendation[]
  compareLimitReached: boolean
  toggleSaved: (id: string) => void
  toggleCompared: (id: string) => void
  clearCompared: () => void
}

export function useRecommendationActions(
  items: AIRecommendation[],
  maxCompareItems = 3,
): UseRecommendationActionsResult {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())

  function toggleSaved(id: string) {
    setSavedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleCompared(id: string) {
    setCompareIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
        return next
      }

      if (next.size >= maxCompareItems) {
        return next
      }

      next.add(id)
      return next
    })
  }

  function clearCompared() {
    setCompareIds(new Set())
  }

  const compareItems = useMemo(
    () => items.filter((item) => compareIds.has(item.id)),
    [compareIds, items],
  )

  return {
    savedIds,
    compareIds,
    compareItems,
    compareLimitReached: compareIds.size >= maxCompareItems,
    toggleSaved,
    toggleCompared,
    clearCompared,
  }
}
