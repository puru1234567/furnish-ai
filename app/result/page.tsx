'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isAuthEnabled } from '@/lib/config/auth-config'
import type {
  PurchaseTrigger,
  RankingPriority,
  RecommendationResponse,
  RoomType,
  StyleTag,
  Urgency,
  UserContext,
} from '@/lib/types'
import type { SortOption } from '@/lib/utils/sort-items'
import type { FormData } from '../find/find-page-model'
import { readStoredResults, saveStoredResults, type StoredResults } from '@/lib/utils/saved-results'
import { ResultsDisplay } from '../find/components/ResultsDisplay'
import { DEFAULTS } from '../find/find-page-constants'
import { fmt, getFurnitureLabel } from '../find/find-page-utils'

export default function ResultPage() {
  const router = useRouter()
  const authEnabled = isAuthEnabled()
  const [userId, setUserId] = useState<string | null>(null)
  const sessionId: string | null = null
  const [data, setData] = useState<StoredResults | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!authEnabled) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (!user) router.replace('/?auth=login&next=/result')
    })
  }, [authEnabled, router])

  // Local UI state — owned by this page, not the find flow
  const [priceFilter, setPriceFilter] = useState(0)
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('relevance')

  useEffect(() => {
    try {
      const parsed = readStoredResults()
      if (parsed) {
        setData(parsed)
      }
    } catch {
      // bad JSON — fall through to empty state
    }
    setHydrated(true)
  }, [])

  const toggleCompare = (id: string) =>
    setCompareItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const refreshRecommendations = useCallback(async (overrides: { budgetMax?: number; city?: string }) => {
    if (!data) return

    const form = data.form ?? DEFAULTS
    const nextForm: FormData = {
      ...form,
      budgetMax: overrides.budgetMax ?? form.budgetMax,
      city: overrides.city ?? form.city,
    }

    const roomAnalysis = data.roomAnalysis
    const roomSqftFromAnalysis = roomAnalysis?.estimatedWidthFt && roomAnalysis?.estimatedDepthFt
      ? roomAnalysis.estimatedWidthFt * roomAnalysis.estimatedDepthFt
      : form.roomWidth * form.roomDepth

    const requestContext: UserContext = {
      roomType: nextForm.roomType as RoomType,
      roomSqft: roomSqftFromAnalysis,
      city: nextForm.city,
      deliveryOk: true,
      furnitureType: nextForm.furnitureType,
      budget: nextForm.budget,
      budgetMax: nextForm.budgetMax,
      purchaseTrigger: 'new_home' as PurchaseTrigger,
      existingFurnitureDesc: roomAnalysis?.existingFurniture.join(', ') ?? '',
      painPoint: nextForm.painPoint,
      stylePreference: [] as StyleTag[],
      useCase: [],
      alreadyRejected: '',
      alreadyRejectedIds: [],
      additionalNotes: nextForm.additionalNotes.trim() || undefined,
      roomContext: roomAnalysis
        ? {
            summary: roomAnalysis.roomSummary,
            furnitureNeeds: roomAnalysis.furnitureNeeds,
            spatialConstraints: roomAnalysis.spatialConstraints,
            existingFurniture: roomAnalysis.existingFurniture,
            lighting: roomAnalysis.lighting,
          }
        : undefined,
      contextualAnswers: Object.keys(nextForm.contextualAnswers).length > 0 ? nextForm.contextualAnswers : undefined,
      urgency: 'next_month' as Urgency,
      rankingPriority: 'quality' as RankingPriority,
    }

    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestContext),
    })

    if (!response.ok) return
    const refreshed = await response.json() as RecommendationResponse

    const nextData: StoredResults = {
      results: refreshed.items ?? [],
      meta: {
        summary: refreshed.summary ?? '',
        archetypeLabel: refreshed.archetypeLabel ?? '',
        contextInsights: refreshed.contextInsights ?? [],
        flaggedIssues: refreshed.flaggedIssues ?? [],
        exclusionSummary: refreshed.exclusionSummary,
        pipelineDebug: refreshed.pipelineDebug,
      },
      form: nextForm,
      roomAnalysis,
    }

    setData(nextData)
    saveStoredResults(nextData)
  }, [data])

  const applyPriceCap = useCallback(async (nextCap: number) => {
    setData(current => {
      if (!current) return current
      return {
        ...current,
        form: {
          ...current.form,
          budgetMax: nextCap,
        },
      }
    })
    await refreshRecommendations({ budgetMax: nextCap })
  }, [refreshRecommendations])

  const handleCityChange = useCallback(async (city: string) => {
    setData(current => {
      if (!current) return current
      return {
        ...current,
        form: {
          ...current.form,
          city,
        },
      }
    })
    await refreshRecommendations({ city })
  }, [refreshRecommendations])

  if (!hydrated) return null

  if (!data) {
    return (
      <>
        <header className="site-header">
          <div className="logo">Furnish<span>AI</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {authEnabled ? <Link href="/account" className="btn-skip">Account</Link> : null}
            <Link href="/find" className="btn-skip">← New search</Link>
          </div>
        </header>
        <div style={{
          minHeight: '80dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
        }}>
          <div style={{ fontSize: '48px' }}>🔍</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '28px', color: 'var(--charcoal)' }}>
            No results found
          </h2>
          <p style={{ color: 'var(--warm-grey)', fontSize: '15px' }}>
            Start a new search to get personalised recommendations.
          </p>
          <Link href="/find" className="btn-next" style={{ marginTop: '8px' }}>
            ← Start a new search
          </Link>
        </div>
      </>
    )
  }

  const archetypeLabel = data.meta.archetypeLabel
  const leadingInsight = data.meta.contextInsights[0] ?? data.meta.flaggedIssues[0] ?? null
  const storySignals = [
    data.form?.furnitureType ? getFurnitureLabel(data.form.furnitureType) : null,
    data.form?.roomType,
    data.form?.budget ? fmt(data.form.budget) : null,
    data.roomAnalysis ? 'AI room read' : null,
    Object.keys(data.form?.contextualAnswers ?? {}).length > 0
      ? `${Object.keys(data.form.contextualAnswers).length} preference signals`
      : null,
  ].filter(Boolean) as string[]

  return (
    <>
      <header className="site-header">
        <div className="logo">Furnish<span>AI</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {authEnabled ? <Link href="/account" className="btn-skip">Account</Link> : null}
          <Link href="/find" className="btn-skip">← New search</Link>
        </div>
      </header>

      <ResultsDisplay
        results={data.results}
        meta={data.meta}
        form={data.form ?? DEFAULTS}
        roomAnalysis={data.roomAnalysis}
        userId={userId}
        sessionId={sessionId}
        priceFilter={priceFilter}
        compareMode={compareMode}
        compareItems={compareItems}
        sortBy={sortBy}
        onPriceFilterChange={setPriceFilter}
        onApplyPriceCap={applyPriceCap}
        onCompareToggle={toggleCompare}
        onCompareModeToggle={() => setCompareMode(p => !p)}
        onCityChange={handleCityChange}
        onSortChange={setSortBy}
      />
    </>
  )
}
