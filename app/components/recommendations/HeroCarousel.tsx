"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { RecommendationSkeleton } from "./RecommendationSkeleton"
import type { AIRecommendation } from "./types"

interface HeroCarouselProps {
  items: AIRecommendation[]
  isLoading: boolean
}

function modulo(index: number, length: number) {
  if (length === 0) return 0
  return (index + length) % length
}

export function HeroCarousel({ items, isLoading }: HeroCarouselProps) {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [hasManualInteraction, setHasManualInteraction] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  const total = items.length
  const hasItems = total > 0
  const normalizedIndex = hasItems ? modulo(activeIndex, total) : 0

  useEffect(() => {
    if (typeof window === "undefined") return

    const media = window.matchMedia("(max-width: 768px)")
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener("change", update)

    return () => media.removeEventListener("change", update)
  }, [])

  const autoplayEnabled = total > 1 && !isMobile && !reduceMotion && !hasManualInteraction

  useEffect(() => {
    if (!autoplayEnabled || isPaused) return

    const timer = window.setInterval(() => {
      setActiveIndex((previous) => modulo(previous + 1, total))
    }, 10000)

    return () => window.clearInterval(timer)
  }, [autoplayEnabled, isPaused, total])

  function goTo(index: number, manual = true) {
    if (!hasItems) return

    if (manual) {
      setHasManualInteraction(true)
    }

    setActiveIndex(modulo(index, total))
  }

  function next(manual = true) {
    goTo(normalizedIndex + 1, manual)
  }

  function previous(manual = true) {
    goTo(normalizedIndex - 1, manual)
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current == null || total < 2) return

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null

    if (Math.abs(delta) < 36) return

    if (delta < 0) {
      next(true)
    } else {
      previous(true)
    }
  }

  function handleBlurCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (!hostRef.current) return

    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && hostRef.current.contains(nextTarget)) return

    setIsPaused(false)
  }

  const visibleCards = useMemo(() => {
    if (!hasItems) return []

    return items.map((item, index) => {
      const delta = modulo(index - normalizedIndex, total)

      if (delta === 0) return { item, state: "active" as const }
      if (delta === 1) return { item, state: "next" as const }
      if (delta === total - 1) return { item, state: "prev" as const }
      return { item, state: "hidden" as const }
    })
  }, [hasItems, items, normalizedIndex, total])

  if (isLoading) {
    return (
      <div className="hero-carousel-shell" aria-live="polite" aria-label="Loading recommendations">
        <RecommendationSkeleton tone="dark" />
      </div>
    )
  }

  if (!hasItems) {
    return (
      <div className="hero-carousel-empty" aria-live="polite">
        No recommendations yet. Describe your room to see ranked matches.
      </div>
    )
  }

  return (
    <div
      ref={hostRef}
      className="hero-carousel-shell"
      aria-label="Recommendation carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlurCapture}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <p className="hero-carousel-status" aria-live="polite">
        Showing {normalizedIndex + 1} of {total}
      </p>

      <div className="hero-carousel-stack">
        {visibleCards.map(({ item, state }) => {
          const expanded = expandedId === item.id

          return (
            <article
              key={item.id}
              className={`hero-carousel-card hero-carousel-card--${state}`}
              aria-hidden={state === "hidden"}
            >
              <div className="hero-carousel-head">
                <div>
                  <p className="hero-carousel-brand">{item.brand}</p>
                  <h3 className="hero-carousel-name">{item.name}</h3>
                </div>
                <span className="hero-carousel-score">{item.compatibilityScore}%</span>
              </div>

              <p className="hero-carousel-price">{item.priceLabel}</p>

              <div className="hero-carousel-tags" role="list" aria-label="Recommendation metadata">
                <span role="listitem" className="hero-carousel-tag">{item.budgetDeltaLabel}</span>
                <span role="listitem" className="hero-carousel-tag">Room fit: {item.roomFitNote}</span>
              </div>

              <ul className="hero-carousel-reasons" aria-label="Why this matches">
                {item.whyThisMatches.slice(0, 2).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              <button
                type="button"
                className="hero-carousel-details-btn"
                onClick={() => setExpandedId((previous) => (previous === item.id ? null : item.id))}
                aria-expanded={expanded}
              >
                {expanded ? "Hide AI details" : "View AI details"}
              </button>

              {expanded ? (
                <div className="hero-carousel-details">
                  <p className="hero-carousel-details-copy">{item.explainability.styleAnalysis}</p>
                  <div className="hero-carousel-badges" role="list" aria-label="AI reasoning badges">
                    {item.explainability.reasoningBadges.slice(0, 3).map((badge) => (
                      <span key={badge} role="listitem" className="hero-carousel-badge">{badge}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="hero-carousel-controls">
        <button
          type="button"
          className="hero-carousel-arrow hero-carousel-arrow--left"
          onClick={() => previous(true)}
          disabled={total < 2}
          aria-label="Previous recommendation"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="hero-carousel-dots" role="tablist" aria-label="Recommendation slides">
          {items.map((item, index) => {
            const isActive = index === normalizedIndex

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-label={`Go to recommendation ${index + 1}`}
                aria-selected={isActive}
                className={`hero-carousel-dot${isActive ? " is-active" : ""}`}
                onClick={() => goTo(index, true)}
              />
            )
          })}
        </div>

        <button
          type="button"
          className="hero-carousel-arrow hero-carousel-arrow--right"
          onClick={() => next(true)}
          disabled={total < 2}
          aria-label="Next recommendation"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 2.5L9.5 7L5 11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
