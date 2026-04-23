'use client'

import { useCallback } from 'react'
import type { FormData } from '../find-page-model'
import type { RecommendedItem, RecommendationResponse, RoomAnalysis } from '@/lib/types'
import { fmt, getFurnitureLabel } from '../find-page-utils'
import { CITIES } from '../find-page-constants'

interface ResultsDisplayProps {
  results: RecommendedItem[]
  meta: Pick<RecommendationResponse, 'summary' | 'archetypeLabel' | 'contextInsights' | 'flaggedIssues'>
  form: FormData
  roomAnalysis: RoomAnalysis | null
  priceFilter: number
  compareMode: boolean
  compareItems: string[]
  onPriceFilterChange: (price: number) => void
  onCompareToggle: (itemId: string) => void
  onCompareModeToggle: () => void
  onCityChange: (city: string) => void
  onReset: () => void
}

export function ResultsDisplay({
  results,
  meta,
  form,
  roomAnalysis,
  priceFilter,
  compareMode,
  compareItems,
  onPriceFilterChange,
  onCompareToggle,
  onCompareModeToggle,
  onCityChange,
  onReset,
}: ResultsDisplayProps) {
  const selectedContextualCount = Object.keys(form.contextualAnswers).length

  return (
    <>
      <header className="site-header">
        <div className="logo">Furnish<span>AI</span></div>
        <nav>
          <a href="#" style={{ textDecoration: 'none' }}>Save search</a>
          <a href="#" style={{ textDecoration: 'none' }}>Share results</a>
        </nav>
        <button className="cta-btn" onClick={onReset}>
          Start over
        </button>
      </header>
      <div className="results-wrapper">
        {/* Sidebar */}
        <aside className="results-sidebar">
          <div className="sidebar-title">Refine results</div>
          <div className="sidebar-sub">{results.length} items · {form.city}</div>

          <div className="sidebar-section">
            <div className="sl">Quick adjustments</div>
            <button className="refine-chip">💸 Too expensive — show cheaper</button>
            <button className="refine-chip">🎨 Not modern enough</button>
            <button className="refine-chip">📦 Show bigger options</button>
            <button className="refine-chip">🚚 In-stock this week only</button>
          </div>

          <div className="sidebar-section">
            <div className="sl">Price range</div>
            <div style={{ fontSize: '24px', fontFamily: "'DM Serif Display',serif", color: 'var(--charcoal)', marginBottom: '8px' }}>
              ₹15k – ₹{(priceFilter / 1000).toFixed(0)}k
            </div>
            <input
              type="range"
              min="5000"
              max="100000"
              value={priceFilter}
              onChange={e => onPriceFilterChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--warm-grey)', marginTop: '6px' }}>
              <span className="inline-count">{results.length} items</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sl">City</div>
            <select
              value={form.city}
              onChange={e => onCityChange(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--sand)' }}
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </aside>

        {/* Main results */}
        <main className="results-main">
          <div className="results-header">
            <div>
              <div className="results-title">Your top matches</div>
              <div className="results-count">{results.length} results · Ranked for your perfect space</div>
            </div>
            <div className="results-controls">
              <button className="ctrl-btn">🔤 Sort by</button>
              <button className="ctrl-btn" onClick={onCompareModeToggle}>⊡ Compare</button>
              <button className="ctrl-btn">♡ Wishlist</button>
            </div>
          </div>

          <div className="results-story-grid">
            <div className="results-story-card primary">
              <div className="results-story-label">What the system understood</div>
              <div className="results-story-title">{meta.archetypeLabel || `${getFurnitureLabel(form.furnitureType)} shortlist`}</div>
              <div className="results-story-body">
                {meta.summary || `These picks reflect your ${form.roomType.toLowerCase()}, ${fmt(form.budget)} budget, and the room constraints gathered earlier.`}
              </div>
            </div>
            <div className="results-story-card">
              <div className="results-story-label">Signals used in ranking</div>
              <div className="results-story-tags">
                <span className="results-story-tag">{form.roomType}</span>
                <span className="results-story-tag">{fmt(form.budget)}</span>
                {roomAnalysis?.spatialConstraints?.[0] && <span className="results-story-tag">{roomAnalysis.spatialConstraints[0]}</span>}
                {selectedContextualCount > 0 && <span className="results-story-tag">{selectedContextualCount} answer signals</span>}
              </div>
            </div>
            {meta.contextInsights.length > 0 && (
              <div className="results-story-card insights">
                <div className="results-story-label">Why the ranking shifted</div>
                <ul className="results-story-list">
                  {meta.contextInsights.slice(0, 2).map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="results-grid">
            {results.slice(0, 3).map((item, idx) => {
              const isCompared = compareItems.includes(item.id)
              return (
                <div key={item.id} className={`result-card ${idx === 0 ? 'rank-1' : ''}`}>
                  <div className="rank-badge">
                    {idx === 0 ? '✦ Best Match' : `✦ #${idx + 1}`}
                  </div>
                  <div className="compare-check" title="Add to compare" onClick={() => onCompareToggle(item.id)} style={{ cursor: 'pointer' }}>
                    {isCompared ? '☑' : '☐'}
                  </div>
                  <div className="card-img">🛋️</div>
                  <div className="card-body">
                    <div className="card-brand">{item.brand}</div>
                    <div className="card-name">{item.name}</div>
                    <div className="card-rating">★ {item.rating} <span>({item.reviewCount} reviews)</span></div>
                    <div className="card-why">
                      <div className="why-label">Why it fits you</div>
                      {item.whyItFits}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(92,107,74,.1)', color: 'var(--moss)', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>✓ Sofa-bed</span>
                      <span style={{ fontSize: '11px', background: 'rgba(92,107,74,.1)', color: 'var(--moss)', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>30-day return</span>
                      <span style={{ fontSize: '11px', background: 'rgba(92,107,74,.1)', color: 'var(--moss)', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>Assembly incl.</span>
                    </div>
                    <div className="card-footer">
                      <div>
                        <div className="card-price">{fmt(item.price)}</div>
                        <div className="card-delivery">🚚 Delivery in 5–7 days · {form.city}</div>
                      </div>
                      <button className="card-cta" onClick={() => window.open(item.productUrl, '_blank')}>View →</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feedback row */}
          <div style={{ marginTop: '36px', padding: '24px', background: 'var(--warm-white)', borderRadius: '14px', border: '1.5px solid var(--sand)', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--charcoal)', marginBottom: '6px' }}>None of these feel right?</div>
            <div style={{ fontSize: '13px', color: 'var(--warm-grey)', marginBottom: '18px' }}>Tell us what's off and we'll re-rank instantly</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button className="refine-chip" style={{ width: 'auto' }}>💸 Too expensive</button>
              <button className="refine-chip" style={{ width: 'auto' }}>🎨 Not my style</button>
              <button className="refine-chip" style={{ width: 'auto' }}>📏 Wrong size</button>
              <button className="refine-chip" style={{ width: 'auto' }}>📦 Show different brands</button>
              <button className="refine-chip" style={{ width: 'auto' }} onClick={onReset}>🔄 Start over</button>
            </div>
          </div>
        </main>
      </div>

      {/* Compare sticky bar */}
      {compareMode && compareItems.length > 0 && (
        <div className="compare-bar">
          <span>Compare mode — {compareItems.length}/2 selected</span>
          <button>Compare now →</button>
        </div>
      )}
    </>
  )
}
