'use client'

import React from 'react'
import { fmt } from '../find-page-utils'
import { CITIES } from '../find-page-constants'

export type QuickAdjustmentId = 'cheaper' | 'modern' | 'bigger' | 'instock'

export interface QuickAdjustmentOption {
  id: QuickAdjustmentId
  label: string
}

export interface ResultsFilterSidebarProps {
  isMobile: boolean
  mobileSidebarOpen: boolean
  onCloseMobileControls: () => void
  activeResultsCount: number
  quickAdjustments: QuickAdjustmentOption[]
  activeAdjustments: QuickAdjustmentId[]
  draftAdjustments: QuickAdjustmentId[]
  onToggleQuickAdjustment: (id: QuickAdjustmentId) => void
  selectedBudget: number
  suggestedPriceCap: number
  draftPriceCap: number
  appliedPriceCap: number
  sliderMin: number
  sliderMax: number
  sliderProgress: number
  isPriceSliding: boolean
  onDraftPriceCapChange: (val: number) => void
  onPriceSlidingChange: (sliding: boolean) => void
  onApplyPrice: () => Promise<void>
  hasPendingPriceChange: boolean
  isApplyingPrice: boolean
  currentCity: string
  draftCity: string
  onCityChange: (city: string) => void
  onDraftCityChange: (city: string) => void
  onApplyMobileControls: () => Promise<void>
  hasPendingMobileChanges: boolean
  selectedContextualCount: number
}

/**
 * ResultsFilterSidebar
 * 
 * Modular sidebar controls for shortlist tuning:
 * - Quick contextual nudges (cheaper, modern, bigger, instock)
 * - Interactive price range slider with dynamic feedback bubble
 * - City / fulfillment region selector
 * - Mobile responsive drawer mode
 */
export function ResultsFilterSidebar({
  isMobile,
  mobileSidebarOpen,
  onCloseMobileControls,
  activeResultsCount,
  quickAdjustments,
  activeAdjustments,
  draftAdjustments,
  onToggleQuickAdjustment,
  selectedBudget,
  suggestedPriceCap,
  draftPriceCap,
  appliedPriceCap,
  sliderMin,
  sliderMax,
  sliderProgress,
  isPriceSliding,
  onDraftPriceCapChange,
  onPriceSlidingChange,
  onApplyPrice,
  hasPendingPriceChange,
  isApplyingPrice,
  currentCity,
  draftCity,
  onCityChange,
  onDraftCityChange,
  onApplyMobileControls,
  hasPendingMobileChanges,
  selectedContextualCount,
}: ResultsFilterSidebarProps) {
  const currentAdjustments = isMobile && mobileSidebarOpen ? draftAdjustments : activeAdjustments

  return (
    <aside
      id="shortlist-controls-popup"
      role={isMobile ? 'dialog' : undefined}
      aria-modal={isMobile ? true : undefined}
      aria-label="Shortlist controls"
      className={`results-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}
    >
      <div className="sidebar-shell">
        <div className="sidebar-kicker">Shortlist controls</div>
        <div className="sidebar-title">Tune the room, not just the filters</div>
        <div className="sidebar-sub">
          {activeResultsCount} options ranked around your room read, budget, city, and preference signals.
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sl">Quick adjustments</div>
        <div className="sidebar-section-note">
          Small nudges to reshape ranking without resetting your room context.
        </div>
        <div className="refine-chip-stack">
          {quickAdjustments.map(option => (
            <button
              key={option.id}
              type="button"
              className={`refine-chip ${currentAdjustments.includes(option.id) ? 'active' : ''}`}
              onClick={() => onToggleQuickAdjustment(option.id)}
              aria-pressed={currentAdjustments.includes(option.id)}
            >
              {option.label}
            </button>
          ))}
          {quickAdjustments.length === 0 && (
            <div className="sidebar-footnote-copy">
              No additional quick refinements are available for this shortlist.
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sl">Price range</div>
        <div className="sidebar-section-note">Adjust range, then apply to refresh this shortlist.</div>
        <div className="sidebar-range-value">
          ₹{(selectedBudget / 1000).toFixed(0)}k selected · ₹{(suggestedPriceCap / 1000).toFixed(0)}k suggested (+20%)
        </div>
        <div className="sidebar-range-wrap">
          {isPriceSliding && (
            <div
              className="sidebar-range-bubble"
              style={{ left: `${sliderProgress}%` }}
            >
              {fmt(draftPriceCap)}
            </div>
          )}
          <input
            className="sidebar-range"
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1000}
            value={draftPriceCap}
            style={{
              background: `linear-gradient(to right, var(--terracotta) 0%, var(--terracotta) ${sliderProgress}%, #e8e1d8 ${sliderProgress}%, #e8e1d8 100%)`,
            }}
            onInput={e => onDraftPriceCapChange(Number((e.target as HTMLInputElement).value))}
            onChange={e => onDraftPriceCapChange(Number(e.target.value))}
            onPointerDown={() => onPriceSlidingChange(true)}
            onPointerUp={() => onPriceSlidingChange(false)}
            onPointerCancel={() => onPriceSlidingChange(false)}
            onBlur={() => onPriceSlidingChange(false)}
          />
        </div>
        <div className="sidebar-range-live">
          <span>Set at <strong>{fmt(draftPriceCap)}</strong></span>
          <span>Applied <strong>{fmt(appliedPriceCap)}</strong></span>
        </div>
        <div className="sidebar-range-meta">
          <span className="inline-count">{activeResultsCount} items</span>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => { void onApplyPrice() }}
            disabled={!hasPendingPriceChange || isApplyingPrice}
            style={{ padding: '6px 10px', minHeight: 0 }}
          >
            {isApplyingPrice ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sl">City</div>
        <div className="sidebar-section-note">Availability and delivery are scoped to this city.</div>
        <select
          className="sidebar-select"
          value={isMobile && mobileSidebarOpen ? draftCity : currentCity}
          onChange={e => {
            if (isMobile && mobileSidebarOpen) {
              onDraftCityChange(e.target.value)
            } else {
              onCityChange(e.target.value)
            }
          }}
        >
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isMobile ? (
        <div className="sidebar-section sidebar-actions-mobile">
          <button
            type="button"
            className="ctrl-btn"
            onClick={onCloseMobileControls}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ctrl-btn active"
            onClick={() => { void onApplyMobileControls() }}
            disabled={!hasPendingMobileChanges || isApplyingPrice}
          >
            {isApplyingPrice ? 'Applying...' : 'Apply'}
          </button>
        </div>
      ) : null}

      <div className="sidebar-section sidebar-footnote">
        <div className="sl">Captured signals</div>
        <div className="sidebar-footnote-copy">
          {selectedContextualCount > 0
            ? `${selectedContextualCount} preference signals are already shaping the shortlist.`
            : 'Room, budget, and city are already shaping the shortlist.'}
        </div>
      </div>
    </aside>
  )
}
