"use client"

import { useEffect, useMemo, useRef } from "react"
import { analyticsService } from "./service"

export function useAnalyticsSession(userId?: string | null) {
  useEffect(() => {
    analyticsService.initialize(userId ?? null)
    analyticsService.setUserId(userId ?? null)
  }, [userId])

  return analyticsService
}

export function useScrollDepthTracking(page: string) {
  const sent = useRef<Set<number>>(new Set())

  useEffect(() => {
    function onScroll() {
      const root = document.documentElement
      const scrollTop = root.scrollTop || document.body.scrollTop
      const scrollHeight = Math.max(root.scrollHeight, document.body.scrollHeight)
      const viewportHeight = window.innerHeight
      const maxScrollable = Math.max(1, scrollHeight - viewportHeight)
      const depth = Math.round((scrollTop / maxScrollable) * 100)

      ;([25, 50, 75, 100] as const).forEach((threshold) => {
        if (depth >= threshold && !sent.current.has(threshold)) {
          sent.current.add(threshold)
          analyticsService.track("session.scroll_depth", {
            depthPercent: threshold,
            page,
          })
        }
      })
    }

    const handler = () => {
      window.requestAnimationFrame(onScroll)
    }

    window.addEventListener("scroll", handler, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener("scroll", handler)
    }
  }, [page])
}

export function useSessionDurationTracking(page: string) {
  const startedAt = useRef<number>(Date.now())

  useEffect(() => {
    startedAt.current = Date.now()

    return () => {
      analyticsService.track("session.duration_reported", {
        durationMs: Date.now() - startedAt.current,
        page,
      })
      void analyticsService.flush(true)
    }
  }, [page])
}

export function useSearchRefinementTracking() {
  const previousQueryRef = useRef<string | null>(null)
  const refinementCountRef = useRef(0)

  return useMemo(() => {
    return {
      trackSearchSubmitted(query: string, resultCount?: number, source?: "hero" | "find" | "refinement" | "other") {
        analyticsService.track("search.query_submitted", { query, resultCount, source })

        if (previousQueryRef.current && previousQueryRef.current !== query) {
          refinementCountRef.current += 1
          analyticsService.track("search.refined", {
            previousQuery: previousQueryRef.current,
            nextQuery: query,
            refinementCount: refinementCountRef.current,
          })
        }

        previousQueryRef.current = query
      },
    }
  }, [])
}
