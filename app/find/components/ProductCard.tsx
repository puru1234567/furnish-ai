'use client'

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { RecommendedItem } from '@/lib/types'
import { fmt } from '../find-page-utils'
import { AIReasoningBadges } from '@/app/components/recommendations/explainability/AIReasoningBadges'
import { ConfidenceIndicator } from '@/app/components/recommendations/explainability/ConfidenceIndicator'

export interface ProductCardProps {
  item: RecommendedItem
  index: number
  variant: 'primary' | 'stretch'
  userBudget: number
  userCity: string
  isCompared: boolean
  isWishlisted: boolean
  whyCopy: string
  attributePills: string[]
  compactStretch?: boolean
  gridSpan?: number
  onSave: (item: RecommendedItem) => void
  onReject: (item: RecommendedItem, reason: string) => void
  onShare: (item: RecommendedItem) => void
  onCompareToggle: (itemId: string) => void
  onProductClick: (item: RecommendedItem, index: number, positionLabel: string) => void
}

/**
 * ProductCard Component
 * 
 * Renders individual furniture recommendations with:
 * - High-resolution lazy-loaded photography and smooth fallback
 * - Clear pricing, delivery estimates, and budget delta indicators
 * - AI reasoning badges and match confidence metrics
 * - Full user engagement controls (compare, wishlist, reject, outbound view)
 */
export function ProductCard({
  item,
  index,
  variant,
  userBudget,
  userCity,
  isCompared,
  isWishlisted,
  whyCopy,
  attributePills,
  compactStretch = true,
  gridSpan = 1,
  onSave,
  onReject,
  onShare,
  onCompareToggle,
  onProductClick,
}: ProductCardProps) {
  const [whyExpanded, setWhyExpanded] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [showConfidence, setShowConfidence] = useState(false)

  const priceDelta = item.price - userBudget
  const isStretch = variant === 'stretch'

  const threshold = isStretch && compactStretch ? 100 : 130
  const shouldCollapseWhy = whyCopy.length > threshold
  const visibleWhyCopy = shouldCollapseWhy && !whyExpanded
    ? `${whyCopy.slice(0, threshold).trimEnd()}...`
    : whyCopy

  // Derive reasoning tags from product attributes
  const reasoningBadges = React.useMemo(() => {
    const badges: string[] = []
    if (item.tags.includes('kid-friendly') || item.tags.includes('pet-friendly')) {
      badges.push('Family & Pet Safe')
    }
    if (item.tags.includes('space-saving') || item.tags.includes('compact')) {
      badges.push('Space-Optimized')
    }
    if (item.warrantyYears >= 5) {
      badges.push(`${item.warrantyYears}y Warranty`)
    }
    if (item.durabilityScore >= 4) {
      badges.push('High Durability')
    }
    // Fill up with item style tag if room allows
    if (badges.length < 3 && item.style.length > 0) {
      badges.push(`${item.style[0].charAt(0).toUpperCase() + item.style[0].slice(1)} Aesthetic`)
    }
    return badges.slice(0, 3)
  }, [item])

  const confidenceScore = Math.min(100, Math.max(50, Math.round(item.score * 10)))
  const confidenceLabel = confidenceScore >= 85 ? 'High Confidence' : confidenceScore >= 70 ? 'Strong Match' : 'Exploratory'

  // Stretch card rendering (promoted or compact)
  if (isStretch) {
    if (!compactStretch) {
      // Promoted stretch — full grid card
      return (
        <motion.article
          key={item.id}
          className={`result-card stretch-card promoted-stretch-card ${isCompared ? 'in-compare' : ''} ${isWishlisted ? 'in-wishlist' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.07, duration: 0.28 }}
          whileHover={{ y: -3 }}
          style={gridSpan > 1 ? { gridColumn: `span ${gridSpan}` } : undefined}
        >
          <div className="rank-badge stretch-badge">↑ Stretch Pick</div>

          {/* Product Media with Real Photography */}
          <div className="card-media">
            <div className="card-img-container">
              {item.imageUrl && !imgError ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className={`card-product-img ${imgLoaded ? 'loaded' : 'loading'}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              ) : null}
              {(!item.imageUrl || imgError || !imgLoaded) && (
                <div className="card-img card-img-placeholder" aria-hidden="true" />
              )}
            </div>

            <button
              type="button"
              className={`card-bookmark-btn ${isWishlisted ? 'saved' : ''}`}
              onClick={() => onSave(item)}
              title={isWishlisted ? 'Remove from saved' : 'Save item'}
              aria-pressed={isWishlisted}
            >
              <svg className="card-bookmark-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v16.7a.25.25 0 0 1-.4.2L12 16.5l-6.85 5.4a.25.25 0 0 1-.4-.2V5A1.25 1.25 0 0 1 6 3.75Z" />
              </svg>
            </button>
          </div>

          <div className="card-body">
            <div className="card-head-row">
              <div className="card-brand">{item.brand}</div>
              <button
                type="button"
                className="card-score-pill card-score-pill--interactive"
                onClick={() => setShowConfidence(prev => !prev)}
                title="Click to view match confidence breakdown"
              >
                Fit {item.durabilityScore}/10 ▾
              </button>
            </div>

            {showConfidence && (
              <ConfidenceIndicator
                score={confidenceScore}
                label={confidenceLabel}
                tone="light"
              />
            )}

            <div className="card-name">{item.name}</div>
            <div className="card-price-row stretch-price-row">
              <div className="stretch-price-stack">
                <div className="card-price">{fmt(item.price)}</div>
                <div className="card-location-line">{userCity} · {item.inStock ? 'In stock' : 'Ships soon'}</div>
              </div>
              <div className="card-rating-inline">★ {item.rating} <span>({item.reviewCount})</span></div>
            </div>
            <div className="stretch-overage">+{fmt(priceDelta)} over your budget</div>
            <div className="card-divider" />

            <motion.div className="card-why stretch-callout" layout>
              <div className="why-label stretch-callout-label">Why it&apos;s worth it</div>
              <p className="card-why-copy">{visibleWhyCopy}</p>
              {shouldCollapseWhy && (
                <button
                  type="button"
                  className="card-why-toggle"
                  onClick={() => setWhyExpanded(prev => !prev)}
                >
                  {whyExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </motion.div>

            {/* AI Reasoning Badges */}
            <AIReasoningBadges badges={reasoningBadges} tone="light" />

            <div className="card-chip-row" style={{ marginTop: '8px' }}>
              {attributePills.map(pill => (
                <span key={`${item.id}-${pill}`} className="card-chip">{pill}</span>
              ))}
            </div>

            <div className="card-actions-row">
              <button
                type="button"
                className="card-action-btn"
                onClick={() => onReject(item, 'Not interested in this stretch option')}
              >
                Not for me
              </button>
              <button
                type="button"
                className="card-action-btn"
                onClick={() => onShare(item)}
              >
                Share
              </button>
              <button
                type="button"
                className={`card-action-btn ${isCompared ? 'active-compare' : ''}`}
                onClick={() => onCompareToggle(item.id)}
              >
                {isCompared ? 'In compare' : 'Compare'}
              </button>
              <button
                type="button"
                className="card-action-btn card-action-btn--cta"
                onClick={() => onProductClick(item, index, 'stretch-grid')}
              >
                View piece →
              </button>
            </div>
            <div className="card-delivery">Delivery in 5-7 days · {userCity}</div>
          </div>
        </motion.article>
      )
    }

    // Compact stretch card
    return (
      <motion.article
        key={item.id}
        className={`result-card stretch-card stretch-card-compact ${isCompared ? 'in-compare' : ''} ${isWishlisted ? 'in-wishlist' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.28 }}
        whileHover={{ y: -3 }}
      >
        <div className="rank-badge stretch-badge">↑ Stretch Pick</div>

        <div className="card-media">
          <div className="card-img-container">
            {item.imageUrl && !imgError ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className={`card-product-img ${imgLoaded ? 'loaded' : 'loading'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            ) : null}
            {(!item.imageUrl || imgError || !imgLoaded) && (
              <div className="card-img stretch-card-media" aria-hidden="true" />
            )}
          </div>

          <button
            type="button"
            className={`card-bookmark-btn ${isWishlisted ? 'saved' : ''}`}
            onClick={() => onSave(item)}
            title={isWishlisted ? 'Remove from saved' : 'Save item'}
            aria-pressed={isWishlisted}
          >
            <svg className="card-bookmark-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v16.7a.25.25 0 0 1-.4.2L12 16.5l-6.85 5.4a.25.25 0 0 1-.4-.2V5A1.25 1.25 0 0 1 6 3.75Z" />
            </svg>
          </button>
        </div>

        <div className="card-body stretch-card-body">
          <div className="card-head-row">
            <div className="card-brand">{item.brand}</div>
            <button
              type="button"
              className="card-score-pill card-score-pill--interactive"
              onClick={() => setShowConfidence(prev => !prev)}
            >
              Fit {item.durabilityScore}/10 ▾
            </button>
          </div>

          {showConfidence && (
            <ConfidenceIndicator
              score={confidenceScore}
              label={confidenceLabel}
              tone="light"
            />
          )}

          <div className="card-name">{item.name}</div>
          <div className="card-price-row stretch-price-row">
            <div className="stretch-price-stack">
              <div className="card-price">{fmt(item.price)}</div>
              <div className="card-location-line">{userCity} · {item.inStock ? 'In stock' : 'Ships soon'}</div>
            </div>
            <div className="card-rating-inline">★ {item.rating} <span>({item.reviewCount})</span></div>
          </div>
          <div className="stretch-overage">+{fmt(priceDelta)} over your budget</div>
          <div className="card-divider" />

          <motion.div className="card-why stretch-callout compact" layout>
            <div className="why-label stretch-callout-label">Why it&apos;s worth it</div>
            <p className="card-why-copy">{visibleWhyCopy}</p>
            {shouldCollapseWhy && (
              <button
                type="button"
                className="card-why-toggle"
                onClick={() => setWhyExpanded(prev => !prev)}
              >
                {whyExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </motion.div>

          <AIReasoningBadges badges={reasoningBadges} tone="light" />

          <div className="stretch-card-meta" style={{ marginTop: '8px' }}>
            {attributePills.map(pill => (
              <span key={`${item.id}-${pill}`} className="stretch-mini-tag">{pill}</span>
            ))}
          </div>

          <div className="card-actions-row compact">
            <button
              type="button"
              className="card-action-btn"
              onClick={() => onReject(item, 'Not interested in this stretch option')}
            >
              Not for me
            </button>
            <button
              type="button"
              className="card-action-btn"
              onClick={() => onShare(item)}
            >
              Share
            </button>
            <button
              type="button"
              className={`card-action-btn ${isCompared ? 'active-compare' : ''}`}
              onClick={() => onCompareToggle(item.id)}
            >
              {isCompared ? 'In compare' : 'Compare'}
            </button>
            <button
              type="button"
              className="card-action-btn card-action-btn--cta"
              onClick={() => onProductClick(item, index, 'stretch')}
            >
              View piece →
            </button>
          </div>
          <div className="card-delivery">Delivery in 5-7 days · {userCity}</div>
        </div>
      </motion.article>
    )
  }

  // Primary card
  return (
    <motion.article
      key={item.id}
      className={`result-card ${index === 0 ? 'rank-1' : ''} ${isCompared ? 'in-compare' : ''} ${isWishlisted ? 'in-wishlist' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.28 }}
      whileHover={{ y: -3 }}
    >
      <div className={`rank-badge ${index === 0 ? 'rank-badge--hero' : 'rank-badge--outlined'}`}>
        {index === 0 ? '✦ Best Match' : `✦ #${index + 1}`}
      </div>

      <div className="card-media">
        <div className="card-img-container">
          {item.imageUrl && !imgError ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className={`card-product-img ${imgLoaded ? 'loaded' : 'loading'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          ) : null}
          {(!item.imageUrl || imgError || !imgLoaded) && (
            <div className="card-img card-img-placeholder" aria-hidden="true" />
          )}
        </div>

        <button
          type="button"
          className={`card-bookmark-btn ${isWishlisted ? 'saved' : ''}`}
          onClick={() => onSave(item)}
          title={isWishlisted ? 'Remove from saved' : 'Save item'}
          aria-pressed={isWishlisted}
        >
          <svg className="card-bookmark-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v16.7a.25.25 0 0 1-.4.2L12 16.5l-6.85 5.4a.25.25 0 0 1-.4-.2V5A1.25 1.25 0 0 1 6 3.75Z" />
          </svg>
        </button>
      </div>

      <div className="card-body">
        <div className="card-head-row">
          <div className="card-brand">{item.brand}</div>
          <button
            type="button"
            className="card-score-pill card-score-pill--interactive"
            onClick={() => setShowConfidence(prev => !prev)}
            title="Click to view match confidence breakdown"
          >
            Fit {item.durabilityScore}/10 ▾
          </button>
        </div>

        {showConfidence && (
          <ConfidenceIndicator
            score={confidenceScore}
            label={confidenceLabel}
            tone="light"
          />
        )}

        <div className="card-name">{item.name}</div>
        <div className="card-price-row">
          <div className="card-price-block">
            <div className="card-price">{fmt(item.price)}</div>
            <div className="card-location-line">{userCity} · {item.inStock ? 'In stock' : 'Ships soon'}</div>
          </div>
          <div className="card-rating-inline">★ {item.rating} <span>({item.reviewCount})</span></div>
        </div>
        <div className="card-divider" />

        <motion.div className="card-why" layout>
          <div className="why-label">Why it fits you</div>
          <p className="card-why-copy">{visibleWhyCopy}</p>
          {shouldCollapseWhy && (
            <button
              type="button"
              className="card-why-toggle"
              onClick={() => setWhyExpanded(prev => !prev)}
            >
              {whyExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </motion.div>

        {/* AI Reasoning Badges */}
        <AIReasoningBadges badges={reasoningBadges} tone="light" />

        <div className="card-chip-row" style={{ marginTop: '8px' }}>
          {attributePills.map(pill => (
            <span key={`${item.id}-${pill}`} className="card-chip">{pill}</span>
          ))}
        </div>

        <div className="card-actions-row">
          <button
            type="button"
            className="card-action-btn"
            onClick={() => onReject(item, 'Not interested in this recommendation')}
          >
            Not for me
          </button>
          <button
            type="button"
            className="card-action-btn"
            onClick={() => onShare(item)}
          >
            Share
          </button>
          <button
            type="button"
            className={`card-action-btn ${isCompared ? 'active-compare' : ''}`}
            onClick={() => onCompareToggle(item.id)}
          >
            {isCompared ? 'In compare' : 'Compare'}
          </button>
          <button
            type="button"
            className="card-action-btn card-action-btn--cta"
            onClick={() => onProductClick(item, index, 'primary')}
          >
            View piece →
          </button>
        </div>
        <div className="card-delivery">Delivery in 5-7 days · {userCity}</div>
      </div>
    </motion.article>
  )
}
