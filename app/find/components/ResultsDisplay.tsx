'use client'

import { useState, useCallback } from 'react'
import type { FormData } from '../find-page-model'
import type { RecommendedItem, RecommendationResponse, RoomAnalysis } from '@/lib/types'
import type { SortOption } from '@/lib/utils/sort-items'
import { SORT_OPTIONS } from '@/lib/utils/sort-items'
import { fmt } from '../find-page-utils'
import { ComparisonView } from './ComparisonView'
import { CITIES } from '../find-page-constants'

interface ResultsDisplayProps {
  results: RecommendedItem[]
  meta: Pick<RecommendationResponse, 'summary' | 'archetypeLabel' | 'contextInsights' | 'flaggedIssues'>
  form: FormData
  roomAnalysis: RoomAnalysis | null
  priceFilter: number
  compareMode: boolean
  compareItems: string[]
  sortBy: SortOption
  onPriceFilterChange: (price: number) => void
  onCompareToggle: (itemId: string) => void
  onCompareModeToggle: () => void
  onCityChange: (city: string) => void
  onSortChange: (sort: SortOption) => void
}

export function ResultsDisplay({
  results,
  meta,
  form,
  roomAnalysis,
  priceFilter,
  compareMode,
  compareItems,
  sortBy,
  onPriceFilterChange,
  onCompareToggle,
  onCompareModeToggle,
  onCityChange,
  onSortChange,
}: ResultsDisplayProps) {
  const [showCompareView, setShowCompareView] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [wishlistItems, setWishlistItems] = useState<string[]>([])
  const quickAdjustments = [
    'Too expensive - show cheaper',
    'Not modern enough',
    'Show bigger options',
    'In-stock this week only',
  ]

  const selectedContextualCount = Object.keys(form.contextualAnswers).length
  const primaryResults = results.filter(item => item.tier !== 'stretch')
  const fallbackPrimaryPool = primaryResults.length > 0 ? primaryResults : results
  const visiblePrimaryResults = fallbackPrimaryPool.slice(0, 3)
  const visibleStretchResults = results
    .filter(item => item.tier === 'stretch' && !visiblePrimaryResults.some(primary => primary.id === item.id))
    .slice(0, 2)
  const compareItemObjects = results.filter(r => compareItems.includes(r.id))
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Best Match'
  const wishlistCount = wishlistItems.length
  const storySignals = [
    form.roomType,
    fmt(form.budget),
    roomAnalysis?.spatialConstraints?.[0],
    selectedContextualCount > 0 ? `${selectedContextualCount} answer signals` : undefined,
  ].filter(Boolean) as string[]
  const leadingInsight = meta.contextInsights[0] ?? meta.flaggedIssues[0] ?? null

  const handleCompareRemove = useCallback((id: string) => {
    onCompareToggle(id)
    if (compareItems.length <= 1) setShowCompareView(false)
  }, [onCompareToggle, compareItems.length])

  const toggleWishlist = useCallback((id: string) => {
    setWishlistItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const handleSaveResults = useCallback(() => {
    const data = { results, meta, form, roomAnalysis, savedAt: new Date() }
    localStorage.setItem('furnish_ai_saved_results', JSON.stringify(data))
    alert('Results saved! You can access them from your account.')
  }, [results, meta, form, roomAnalysis])

  const handleShareResults = useCallback(() => {
    const shareText = `Check out these ${results.length} furniture recommendations from FurnishAI! Perfect for ${form.roomType.toLowerCase()}.`
    if (navigator.share) {
      navigator.share({ title: 'FurnishAI Results', text: shareText })
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
      alert('Link copied to clipboard!')
    }
  }, [results, form])

  const renderResultCard = (item: RecommendedItem, index: number, variant: 'primary' | 'stretch') => {
    const isCompared = compareItems.includes(item.id)
    const isWishlisted = wishlistItems.includes(item.id)
    const priceDelta = item.price - form.budget

    if (variant === 'stretch') {
      return (
        <article key={item.id} className={`result-card stretch-card stretch-card-compact ${isCompared ? 'in-compare' : ''} ${isWishlisted ? 'in-wishlist' : ''}`}>
          <div className="rank-badge">↗ Stretch Pick</div>
          <div className="card-actions">
            <button
              type="button"
              className={`compare-check ${isCompared ? 'checked' : ''}`}
              title={isCompared ? 'Remove from compare' : 'Add to compare'}
              onClick={() => onCompareToggle(item.id)}
            >
              {isCompared ? '☑' : '☐'}
            </button>
            <button
              type="button"
              className="card-wishlist-btn"
              onClick={() => toggleWishlist(item.id)}
              title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              {isWishlisted ? '❤️' : '🤍'}
            </button>
          </div>
          <div className="card-img stretch-card-media">🛋️</div>
          <div className="card-body stretch-card-body">
            <div className="stretch-card-topline">
              <div>
                <div className="card-brand">{item.brand}</div>
                <div className="card-name">{item.name}</div>
              </div>
              <div className="stretch-card-price-wrap">
                <div className="card-price">{fmt(item.price)}</div>
                <div className="stretch-callout-price">+{fmt(priceDelta)}</div>
              </div>
            </div>
            {item.stretchJustification && (
              <div className="stretch-callout compact">
                <div className="stretch-callout-label">Worth the extra because</div>
                <div>{item.stretchJustification}</div>
              </div>
            )}
            <div className="stretch-card-meta">
              <span className="stretch-mini-tag">{item.material}</span>
              <span className="stretch-mini-tag">{item.warrantyYears} yr warranty</span>
              <span className="stretch-mini-tag">{item.durabilityScore}/10 durability</span>
            </div>
            <div className="card-footer compact">
              <div className="card-delivery">Delivery in 5-7 days · {form.city}</div>
              <button type="button" className="card-cta" onClick={() => window.open(item.productUrl, '_blank')}>View piece →</button>
            </div>
          </div>
        </article>
      )
    }

    return (
      <article key={item.id} className={`result-card ${index === 0 ? 'rank-1' : ''} ${isCompared ? 'in-compare' : ''} ${isWishlisted ? 'in-wishlist' : ''}`}>
        <div className="rank-badge">
          {index === 0 ? '✦ Best Match' : `✦ #${index + 1}`}
        </div>
        <div className="card-actions">
          <button
            type="button"
            className={`compare-check ${isCompared ? 'checked' : ''}`}
            title={isCompared ? 'Remove from compare' : 'Add to compare'}
            onClick={() => onCompareToggle(item.id)}
          >
            {isCompared ? '☑' : '☐'}
          </button>
          <button
            type="button"
            className="card-wishlist-btn"
            onClick={() => toggleWishlist(item.id)}
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? '❤️' : '🤍'}
          </button>
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
          <div className="card-chip-row">
            <span className="card-chip">✓ {item.material}</span>
            <span className="card-chip">{item.warrantyYears} yr warranty</span>
            <span className="card-chip">{item.durabilityScore}/10 durability</span>
          </div>
          <div className="card-footer">
            <div>
              <div className="card-price">{fmt(item.price)}</div>
              <div className="card-delivery">Delivery in 5-7 days · {form.city}</div>
            </div>
            <button type="button" className="card-cta" onClick={() => window.open(item.productUrl, '_blank')}>View piece →</button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <>
      <div className="results-wrapper results-shell">
        <aside className={`results-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-shell">
            <div className="sidebar-kicker">Shortlist controls</div>
            <div className="sidebar-title">Tune the room, not just the filters</div>
            <div className="sidebar-sub">{results.length} options ranked around your room read, budget, city, and preference signals.</div>
          </div>

          <div className="sidebar-story-card">
            <div className="sidebar-story-label">AI read</div>
            <div className="sidebar-story-copy">{leadingInsight ?? meta.summary}</div>
            <div className="sidebar-story-tags">
              {storySignals.slice(0, 4).map(signal => (
                <span key={signal} className="sidebar-story-tag">{signal}</span>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sl">Quick adjustments</div>
            <div className="refine-chip-stack">
              {quickAdjustments.map(label => (
                <button key={label} type="button" className="refine-chip">{label}</button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sl">Price range</div>
            <div className="sidebar-range-value">
              ₹15k – ₹{(priceFilter / 1000).toFixed(0)}k
            </div>
            <input
              className="sidebar-range"
              type="range"
              min="5000"
              max="100000"
              value={priceFilter}
              onChange={e => onPriceFilterChange(Number(e.target.value))}
            />
            <div className="sidebar-range-meta">
              <span className="inline-count">{results.length} items</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sl">City</div>
            <select
              className="sidebar-select"
              value={form.city}
              onChange={e => onCityChange(e.target.value)}
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sidebar-section sidebar-footnote">
            <div className="sl">Captured signals</div>
            <div className="sidebar-footnote-copy">
              {selectedContextualCount > 0
                ? `${selectedContextualCount} preference signals are already shaping the shortlist.`
                : 'Room, budget, and city are already shaping the shortlist.'}
            </div>
          </div>
        </aside>

        <main className="results-main">
          <div className="results-header-shell">
            <div className="results-hero-panel">
              <div className="results-hero-copy">
                <div className="results-kicker">Curated by FurnishAI</div>
                <div className="results-title">The shortlist your room can hold</div>
                <div className="results-count">{results.length} results ranked for your room, budget, and taste signals.</div>
                <div className="results-summary">{meta.summary}</div>
                <div className="results-signal-row">
                  {storySignals.map(signal => (
                    <span key={signal} className="results-signal-pill">{signal}</span>
                  ))}
                </div>
              </div>
              <div className="results-hero-aside">
                <div className="results-stat-card highlight">
                  <span className="results-stat-label">Lead shortlist</span>
                  <strong>{visiblePrimaryResults.length}</strong>
                  <span>Focused first picks before any stretch or compromise.</span>
                </div>
                <div className="results-stat-card">
                  <span className="results-stat-label">Saved contenders</span>
                  <strong>{wishlistCount}</strong>
                  <span>Keep promising pieces in play while you compare.</span>
                </div>
              </div>
            </div>

            <div className="results-header">
              <div className="results-header-meta">
                <div className="results-section-title">Compare, save, or reshape the shortlist</div>
                <div className="results-section-copy">Keep the decision surface tight while adjusting what the room can support.</div>
              </div>
              <div className="results-controls">
                <div className="sort-dropdown-wrap">
                  <button
                    type="button"
                    className="ctrl-btn"
                    onClick={() => setSortOpen(o => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                  >
                    Sort: {activeSortLabel} ▾
                  </button>
                  {sortOpen && (
                    <ul className="sort-dropdown" role="listbox">
                      {SORT_OPTIONS.map(opt => (
                        <li
                          key={opt.value}
                          role="option"
                          aria-selected={sortBy === opt.value}
                          className={`sort-option ${sortBy === opt.value ? 'selected' : ''}`}
                          onClick={() => { onSortChange(opt.value); setSortOpen(false) }}
                        >
                          {sortBy === opt.value && <span className="sort-check">✓ </span>}
                          {opt.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button type="button" className={`ctrl-btn ${compareMode ? 'active' : ''}`} onClick={onCompareModeToggle} title="Toggle compare mode">Compare mode</button>
                <div className="ctrl-pill" title="Wishlist items">Wishlist {wishlistCount}</div>
                <button type="button" className="ctrl-btn" onClick={handleSaveResults} title="Save these results">Save</button>
                <button type="button" className="ctrl-btn" onClick={handleShareResults} title="Share results">Share</button>
              </div>
            </div>
          </div>

          {compareMode && (
            <div className="compare-mode-banner">
              <span>⊡ Compare mode on — tick items below ({compareItems.length} selected)</span>
              <button type="button" className="compare-mode-exit" onClick={onCompareModeToggle}>Exit</button>
            </div>
          )}

          <div className="results-grid">
            {visiblePrimaryResults.map((item, idx) => renderResultCard(item, idx, 'primary'))}
          </div>

          {visibleStretchResults.length > 0 && (
            <section className="stretch-section compact-rail">
              <div className="stretch-section-header compact">
                <div>
                  <div className="stretch-section-label">Worth the extra?</div>
                  <div className="stretch-section-title">Optional upgrades if you can stretch a little</div>
                </div>
                <div className="stretch-section-copy">
                  Higher-ranked for a specific quality or fit reason, but still kept secondary to your main shortlist.
                </div>
              </div>
              <div className="stretch-grid compact">
                {visibleStretchResults.map((item, idx) => renderResultCard(item, idx, 'stretch'))}
              </div>
            </section>
          )}

          <div className="results-feedback-panel">
            <div className="results-feedback-title">None of these feel right?</div>
            <div className="results-feedback-copy">Tell us what is off and we will re-rank while keeping your room context and saved preferences.</div>
            <div className="results-feedback-actions">
              <button type="button" className="refine-chip feedback">Too expensive</button>
              <button type="button" className="refine-chip feedback">Not my style</button>
              <button type="button" className="refine-chip feedback">Wrong size</button>
              <button type="button" className="refine-chip feedback">Show different brands</button>
            </div>
          </div>
        </main>
      </div>

      <div className="compare-fab">
        {compareItems.length > 0 ? (
          <button
            type="button"
            className="compare-fab-btn compare-fab-active"
            onClick={() => setShowCompareView(true)}
          >
            ⊡ Compare ({compareItems.length} selected) →
          </button>
        ) : (
          <button
            type="button"
            className="compare-fab-btn"
            onClick={onCompareModeToggle}
            title="Turn on compare mode"
          >
            {compareMode ? 'Select pieces to compare' : 'Turn on compare mode'}
          </button>
        )}
      </div>

      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <button
        type="button"
        className="refine-results-button"
        onClick={() => setMobileSidebarOpen(s => !s)}
      >
        {mobileSidebarOpen ? 'Close filters' : 'Refine results'}
      </button>

      {showCompareView && compareItemObjects.length > 0 && (
        <ComparisonView
          compareItems={compareItemObjects}
          onClose={() => setShowCompareView(false)}
          onRemoveItem={handleCompareRemove}
        />
      )}
    </>
  )
}
