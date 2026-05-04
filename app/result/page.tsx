'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { RecommendedItem, RecommendationResponse, RoomAnalysis } from '@/lib/types'
import type { SortOption } from '@/lib/utils/sort-items'
import type { FormData } from '../find/find-page-model'
import { ResultsDisplay } from '../find/components/ResultsDisplay'
import { DEFAULTS } from '../find/find-page-constants'
import { fmt, getFurnitureLabel } from '../find/find-page-utils'

interface StoredResults {
  results: RecommendedItem[]
  meta: Pick<RecommendationResponse, 'summary' | 'archetypeLabel' | 'contextInsights' | 'flaggedIssues'>
  form: FormData
  roomAnalysis: RoomAnalysis | null
}

export default function ResultPage() {
  const [data, setData] = useState<StoredResults | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Local UI state — owned by this page, not the find flow
  const [priceFilter, setPriceFilter] = useState(100000)
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('relevance')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('furnish_ai_results')
      if (raw) {
        const parsed = JSON.parse(raw) as StoredResults
        setData(parsed)
        // Seed price filter from the budget stored in form
        setPriceFilter(Math.round((parsed.form?.budgetMax ?? parsed.form?.budget ?? 100000) * 1.3))
      }
    } catch {
      // bad JSON — fall through to empty state
    }
    setHydrated(true)
  }, [])

  const toggleCompare = (id: string) =>
    setCompareItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  if (!hydrated) return null

  if (!data) {
    return (
      <>
        <header className="site-header">
          <div className="logo">Furnish<span>AI</span></div>
          <Link href="/find" className="btn-skip">← New search</Link>
        </header>
        <div style={{
          minHeight: '80vh', display: 'flex', flexDirection: 'column',
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
          <Link href="/find" className="btn-skip">← New search</Link>
        </div>
      </header>

      <ResultsDisplay
        results={data.results}
        meta={data.meta}
        form={data.form ?? DEFAULTS}
        roomAnalysis={data.roomAnalysis}
        priceFilter={priceFilter}
        compareMode={compareMode}
        compareItems={compareItems}
        sortBy={sortBy}
        onPriceFilterChange={setPriceFilter}
        onCompareToggle={toggleCompare}
        onCompareModeToggle={() => setCompareMode(p => !p)}
        onCityChange={city =>
          setData(d => d ? { ...d, form: { ...d.form, city } } : d)
        }
        onSortChange={setSortBy}
      />
    </>
  )
}
