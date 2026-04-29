'use client'

import type { RecommendedItem } from '@/lib/types'
import { fmt } from '../find-page-utils'

interface ComparisonViewProps {
  compareItems: RecommendedItem[]
  onClose: () => void
  onRemoveItem: (id: string) => void
}

const SPEC_ROWS: { label: string; key: keyof RecommendedItem; format?: (v: unknown) => string }[] = [
  { label: 'Price', key: 'price', format: v => fmt(v as number) },
  { label: 'Rating', key: 'rating', format: v => `★ ${v as number}` },
  { label: 'Reviews', key: 'reviewCount', format: v => `${(v as number).toLocaleString('en-IN')} reviews` },
  { label: 'Material', key: 'material' },
  { label: 'Durability', key: 'durability', format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { label: 'Durability Score', key: 'durabilityScore', format: v => `${v as number}/10` },
  { label: 'Warranty', key: 'warrantyYears', format: v => `${v as number} yr${(v as number) === 1 ? '' : 's'}` },
  { label: 'Assembly', key: 'assemblyComplexity', format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { label: 'Maintenance', key: 'maintenanceEase', format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  {
    label: 'Dimensions (W×D×H)',
    key: 'dimensions',
    format: v => {
      const d = v as { width: number; depth: number; height: number }
      return `${d.width}×${d.depth}×${d.height} cm`
    },
  },
]

function getBestValue(items: RecommendedItem[], key: keyof RecommendedItem): string | null {
  // For numeric keys, highlight the best (cheapest price, highest rating etc.)
  const higherIsBetter: (keyof RecommendedItem)[] = ['rating', 'reviewCount', 'durabilityScore', 'warrantyYears', 'score']
  const lowerIsBetter: (keyof RecommendedItem)[] = ['price']

  const values = items.map(i => i[key])
  if (typeof values[0] !== 'number') return null

  if (higherIsBetter.includes(key)) {
    const max = Math.max(...(values as number[]))
    return String(max)
  }
  if (lowerIsBetter.includes(key)) {
    const min = Math.min(...(values as number[]))
    return String(min)
  }
  return null
}

export function ComparisonView({ compareItems, onClose, onRemoveItem }: ComparisonViewProps) {
  if (compareItems.length === 0) return null

  return (
    <div className="comparison-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="comparison-modal">
        {/* Header */}
        <div className="comparison-modal-header">
          <div>
            <div className="comparison-modal-title">Side-by-side comparison</div>
            <div className="comparison-modal-sub">{compareItems.length} item{compareItems.length !== 1 ? 's' : ''} selected · Click outside or press Esc to close</div>
          </div>
          <button className="comparison-close" onClick={onClose} aria-label="Close comparison">✕</button>
        </div>

        {/* Scrollable table */}
        <div className="comparison-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="comparison-th-label"></th>
                {compareItems.map(item => (
                  <th key={item.id} className="comparison-th-product">
                    <div className="comparison-product-head">
                      <div className="comparison-product-img">🛋️</div>
                      <div className="comparison-product-brand">{item.brand}</div>
                      <div className="comparison-product-name">{item.name}</div>
                      {item.tier === 'primary' && (
                        <span className="comparison-badge">✦ Best Match</span>
                      )}
                      <button
                        className="comparison-remove"
                        onClick={() => onRemoveItem(item.id)}
                        title="Remove from comparison"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Why it fits row */}
              <tr className="comparison-section-row">
                <td colSpan={compareItems.length + 1} className="comparison-section-label">AI Insights</td>
              </tr>
              <tr>
                <td className="comparison-row-label">Why it fits you</td>
                {compareItems.map(item => (
                  <td key={item.id} className="comparison-row-value">
                    <div className="comparison-why">{item.whyItFits}</div>
                  </td>
                ))}
              </tr>

              {/* Specs section */}
              <tr className="comparison-section-row">
                <td colSpan={compareItems.length + 1} className="comparison-section-label">Specifications</td>
              </tr>
              {SPEC_ROWS.map(spec => {
                const bestRaw = getBestValue(compareItems, spec.key)
                return (
                  <tr key={spec.key} className="comparison-data-row">
                    <td className="comparison-row-label">{spec.label}</td>
                    {compareItems.map(item => {
                      const rawVal = item[spec.key]
                      const displayVal = spec.format ? spec.format(rawVal) : String(rawVal ?? '—')
                      const isBest = bestRaw !== null && String(rawVal) === bestRaw
                      return (
                        <td key={item.id} className={`comparison-row-value ${isBest ? 'comparison-best' : ''}`}>
                          {isBest && <span className="comparison-best-pill">Best</span>}
                          {displayVal}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Score row */}
              <tr className="comparison-section-row">
                <td colSpan={compareItems.length + 1} className="comparison-section-label">Match Score</td>
              </tr>
              <tr className="comparison-data-row">
                <td className="comparison-row-label">AI Score</td>
                {compareItems.map(item => {
                  const best = Math.max(...compareItems.map(i => i.score))
                  const isBest = item.score === best
                  return (
                    <td key={item.id} className={`comparison-row-value ${isBest ? 'comparison-best' : ''}`}>
                      {isBest && <span className="comparison-best-pill">Best</span>}
                      {item.score.toFixed(1)}
                    </td>
                  )
                })}
              </tr>

              {/* Actions row */}
              <tr>
                <td className="comparison-row-label"></td>
                {compareItems.map(item => (
                  <td key={item.id} className="comparison-row-value">
                    <button
                      className="card-cta"
                      style={{ width: '100%', textAlign: 'center' }}
                      onClick={() => window.open(item.productUrl, '_blank')}
                    >
                      View product →
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
