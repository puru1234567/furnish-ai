'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { FormData } from '../find-page-model'
import type { RecommendedItem, RecommendationResponse, RoomAnalysis } from '@/lib/types'
import type { SortOption } from '@/lib/utils/sort-items'
import { SORT_OPTIONS, sortRecommendations } from '@/lib/utils/sort-items'
import { fmt } from '../find-page-utils'
import { ComparisonView } from './ComparisonView'
import { CITIES } from '../find-page-constants'
import {
  saveResult,
  unsaveResult,
  getSavedResults,
  upsertPreferences,
  trackProductClick,
} from '@/lib/services/userDataService'

interface ResultsDisplayProps {
  results: RecommendedItem[]
  meta: Pick<RecommendationResponse, 'summary' | 'archetypeLabel' | 'contextInsights' | 'flaggedIssues' | 'exclusionSummary' | 'pipelineDebug'>
  form: FormData
  roomAnalysis: RoomAnalysis | null
  userId: string | null
  sessionId: string | null
  priceFilter: number
  compareMode: boolean
  compareItems: string[]
  sortBy: SortOption
  onPriceFilterChange: (price: number) => void
  onCompareToggle: (itemId: string) => void
  onCompareModeToggle: () => void
  onCityChange: (city: string) => void
  onSortChange: (sort: SortOption) => void
  onApplyPriceCap?: (price: number) => Promise<void> | void
}

type QuickAdjustmentId = 'cheaper' | 'modern' | 'bigger' | 'instock'

interface QuickAdjustmentOption {
  id: QuickAdjustmentId
  label: string
}

export function ResultsDisplay({
  results,
  meta,
  form,
  roomAnalysis,
  userId,
  sessionId,
  priceFilter,
  compareMode,
  compareItems,
  sortBy,
  onPriceFilterChange,
  onCompareToggle,
  onCompareModeToggle,
  onCityChange,
  onSortChange,
  onApplyPriceCap,
}: ResultsDisplayProps) {
  const [showCompareView, setShowCompareView] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [usefulnessRating, setUsefulnessRating] = useState<'yes' | 'partial' | 'no' | null>(null)
  const [feedbackReason, setFeedbackReason] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)
  const [activeAdjustments, setActiveAdjustments] = useState<QuickAdjustmentId[]>([])
  const [draftAdjustments, setDraftAdjustments] = useState<QuickAdjustmentId[]>([])
  const [draftCity, setDraftCity] = useState(form.city)
  const [draftPriceCap, setDraftPriceCap] = useState(priceFilter)
  const [isPriceSliding, setIsPriceSliding] = useState(false)
  const [hasAppliedPriceCap, setHasAppliedPriceCap] = useState(false)
  const [isApplyingPrice, setIsApplyingPrice] = useState(false)
  const [expandedWhyById, setExpandedWhyById] = useState<Record<string, boolean>>({})

  // Load saved results from Supabase
  useEffect(() => {
    if (!userId) {
      try {
        const raw = localStorage.getItem('furnish_ai_local_saved_ids')
        if (!raw) {
          setSavedIds([])
          return
        }
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setSavedIds(parsed.filter((id): id is string => typeof id === 'string'))
          return
        }
        setSavedIds([])
      } catch {
        setSavedIds([])
      }
      return
    }

    getSavedResults(userId).then(results => {
      setSavedIds(results.map(r => r.product_id))
    })
  }, [userId])

  const handleSave = useCallback((item: RecommendedItem) => {
    const alreadySaved = savedIds.includes(item.id)
    const nextSavedIds = alreadySaved
      ? savedIds.filter(id => id !== item.id)
      : [...savedIds, item.id]

    setSavedIds(nextSavedIds)

    if (!userId) {
      try {
        localStorage.setItem('furnish_ai_local_saved_ids', JSON.stringify(nextSavedIds))
      } catch {
        // Ignore storage failures and keep in-memory toggle.
      }
      return
    }

    if (alreadySaved) {
      void unsaveResult(userId, item.id)
      return
    }

    void saveResult(userId, sessionId ?? '', {
      product_id: item.id,
      product_name: item.name,
      product_price: item.price,
      product_brand: item.brand,
      why_it_fits: item.whyItFits ?? '',
      product_url: item.productUrl ?? '',
    })

    void upsertPreferences(userId, {
      preferred_city: form.city,
      typical_budget_max: form.budget,
      preferred_categories: form.furnitureType ? [form.furnitureType] : undefined,
    })
  }, [userId, savedIds, sessionId, form.city, form.budget, form.furnitureType])

  const selectedContextualCount = Object.keys(form.contextualAnswers).length

  const baseResults = results

  // Slider should start around user-selected budget with +20% suggested cap
  const selectedBudget = Math.max(1000, form.budget || 1000)
  const suggestedCapRaw = Math.round((selectedBudget * 1.2) / 1000) * 1000

  const { sliderMin, sliderMax } = useMemo(() => {
    const minBound = 0
    const maxBound = Math.max(1000, Math.round((selectedBudget * 2) / 1000) * 1000)
    return { sliderMin: minBound, sliderMax: maxBound }
  }, [selectedBudget])

  const clampPrice = useCallback((value: number) => {
    return Math.min(Math.max(value, sliderMin), sliderMax)
  }, [sliderMin, sliderMax])

  const suggestedPriceCap = clampPrice(suggestedCapRaw)
  const appliedPriceCap = hasAppliedPriceCap
    ? clampPrice(priceFilter)
    : suggestedPriceCap

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isMobile || !mobileSidebarOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobile, mobileSidebarOpen])

  useEffect(() => {
    setDraftCity(form.city)
  }, [form.city])

  useEffect(() => {
    if (!mobileSidebarOpen) {
      setDraftAdjustments(activeAdjustments)
      setDraftCity(form.city)
    }
  }, [mobileSidebarOpen, activeAdjustments, form.city])

  useEffect(() => {
    const nextDraft = clampPrice(draftPriceCap || suggestedPriceCap)
    if (nextDraft !== draftPriceCap) {
      setDraftPriceCap(nextDraft)
    }
  }, [draftPriceCap, suggestedPriceCap, clampPrice])

  useEffect(() => {
    if (!hasAppliedPriceCap) return
    const nextApplied = clampPrice(priceFilter)
    if (nextApplied !== priceFilter) {
      onPriceFilterChange(nextApplied)
    }
  }, [hasAppliedPriceCap, priceFilter, clampPrice, onPriceFilterChange])

  const hasPendingPriceChange = draftPriceCap !== appliedPriceCap
  const sameAdjustments = draftAdjustments.length === activeAdjustments.length
    && draftAdjustments.every(id => activeAdjustments.includes(id))
  const hasPendingMobileChanges = hasPendingPriceChange || draftCity !== form.city || !sameAdjustments
  const sliderProgress = sliderMax === sliderMin
    ? 0
    : ((draftPriceCap - sliderMin) / (sliderMax - sliderMin)) * 100

  const priceScopedResults = useMemo(
    () => baseResults.filter(item => item.price <= appliedPriceCap),
    [baseResults, appliedPriceCap]
  )

  const quickAdjustments = useMemo<QuickAdjustmentOption[]>(() => {
    const hasAboveBudget = priceScopedResults.some(item => item.price > form.budget)
    const hasModernCandidates = priceScopedResults.some(item => item.style.includes('modern'))
    const hasNonModernCandidates = priceScopedResults.some(item => !item.style.includes('modern'))
    const hasOutOfStock = priceScopedResults.some(item => !item.inStock)

    const widths = priceScopedResults.map(item => item.dimensions.width).sort((a, b) => a - b)
    const medianWidth = widths.length > 0 ? widths[Math.floor(widths.length / 2)] : 0
    const hasBiggerCandidates = priceScopedResults.some(item => item.dimensions.width > medianWidth)

    return [
      ...(hasAboveBudget ? [{ id: 'cheaper' as const, label: 'Too expensive - show cheaper' }] : []),
      ...(hasModernCandidates && hasNonModernCandidates ? [{ id: 'modern' as const, label: 'Not modern enough' }] : []),
      ...(hasBiggerCandidates ? [{ id: 'bigger' as const, label: 'Show bigger options' }] : []),
      ...(hasOutOfStock ? [{ id: 'instock' as const, label: 'In-stock this week only' }] : []),
    ]
  }, [priceScopedResults, form.budget])

  const quickAdjustmentSet = useMemo(
    () => new Set(quickAdjustments.map(option => option.id)),
    [quickAdjustments]
  )

  useEffect(() => {
    setActiveAdjustments(current => {
      const next = current.filter(id => quickAdjustmentSet.has(id))
      if (next.length === current.length) return current
      return next
    })
  }, [quickAdjustmentSet])

  const adjustedResults = useMemo(() => {
    let scoped = [...priceScopedResults]

    if (activeAdjustments.includes('cheaper')) {
      scoped = scoped.filter(item => item.price <= Math.min(form.budget, appliedPriceCap))
    }

    if (activeAdjustments.includes('modern')) {
      scoped = scoped.filter(item => item.style.includes('modern'))
    }

    if (activeAdjustments.includes('instock')) {
      scoped = scoped.filter(item => item.inStock)
    }

    if (activeAdjustments.includes('bigger') && scoped.length > 1) {
      const widths = scoped.map(item => item.dimensions.width).sort((a, b) => a - b)
      const medianWidth = widths[Math.floor(widths.length / 2)]
      scoped = scoped.filter(item => item.dimensions.width >= medianWidth)
    }

    return sortRecommendations(scoped, sortBy)
  }, [priceScopedResults, activeAdjustments, form.budget, appliedPriceCap, sortBy])

  const activeResults = adjustedResults
  const primaryResults = activeResults.filter(item => item.tier !== 'stretch')
  const fallbackPrimaryPool = primaryResults.length > 0 ? primaryResults : activeResults
  const visiblePrimaryResults = fallbackPrimaryPool
  const visibleStretchResults = activeResults
    .filter(item => item.tier === 'stretch' && !visiblePrimaryResults.some(primary => primary.id === item.id))
  const gridColumnCount = 3
  const occupiedSlotsInLastRow = visiblePrimaryResults.length % gridColumnCount
  const remainingSlotsInLastRow = occupiedSlotsInLastRow === 0 ? 0 : gridColumnCount - occupiedSlotsInLastRow
  const stretchPromotedToGrid = visibleStretchResults.slice(0, remainingSlotsInLastRow)
  const remainingStretchResults = visibleStretchResults.slice(stretchPromotedToGrid.length)
  const promotedStretchGridSpan = stretchPromotedToGrid.length === 1 ? Math.max(1, remainingSlotsInLastRow) : 1
  const hasStretchResults = activeResults.some(item => item.tier === 'stretch')
  const compareItemObjects = results.filter(r => compareItems.includes(r.id))
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Best Match'
  const wishlistCount = savedIds.length
  const leadingInsight = meta.contextInsights[0] ?? meta.flaggedIssues[0] ?? null

  const cleanSignal = useCallback((value: string) => {
    const normalized = value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }, [])

  const humanizeDeterministicBreakdown = useCallback((raw: string) => {
    const entries = raw
      .split('|')
      .map((part) => part.trim())
      .map((part) => {
        const match = part.match(/^([a-z_]+):\s*(-?\d+)$/i)
        if (!match) return null
        return { key: match[1].toLowerCase(), score: Number(match[2]) }
      })
      .filter((entry): entry is { key: string; score: number } => entry !== null)

    if (entries.length < 4) {
      return raw
    }

    const labelMap: Record<string, string> = {
      pain_point: 'solving your pain-point concerns',
      room_compact: 'compact-room compatibility',
      room_needs: 'alignment with your room needs',
      contextual: 'your stated preferences',
      existing_fit: 'blending with existing furniture',
      style_match: 'style compatibility',
      size_fit: 'size fit for your space',
      price_tier: 'budget alignment',
      use_case: 'everyday use suitability',
      social_proof: 'review and rating confidence',
    }

    const positive = entries
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => labelMap[entry.key] ?? cleanSignal(entry.key))

    if (positive.length === 0) {
      return 'Balanced fit across room, style, and budget signals.'
    }

    if (positive.length === 1) {
      return `Strong on ${positive[0]}.`
    }

    if (positive.length === 2) {
      return `Strong on ${positive[0]} and ${positive[1]}.`
    }

    return `Strong on ${positive[0]}, ${positive[1]}, and ${positive[2]}.`
  }, [cleanSignal])

  const buildWhyCopy = useCallback((item: RecommendedItem, variant: 'primary' | 'stretch') => {
    const baseMaterial = item.material.split('(')[0].trim()
    const durabilitySentence = `Durability score: ${item.durabilityScore}/10.`
    const rawReason = (item.whyItFits ?? '').trim()
    const isTechnicalBreakdown = /^([a-z_]+:\s*-?\d+)(\s*\|\s*[a-z_]+:\s*-?\d+)+$/i.test(rawReason)
    const modelReason = isTechnicalBreakdown
      ? humanizeDeterministicBreakdown(rawReason)
      : rawReason

    if (variant === 'stretch') {
      const premiumSentence = item.durabilityScore >= 8
        ? 'Higher build quality than core picks.'
        : `Upgraded ${baseMaterial.toLowerCase()} construction.`
      return modelReason.length > 0
        ? `${modelReason} ${premiumSentence} ${item.warrantyYears}-year warranty. ${durabilitySentence}`
        : `${premiumSentence} Material: ${baseMaterial}. ${item.warrantyYears}-year warranty. ${durabilitySentence}`
    }

    return modelReason.length > 0
      ? `${modelReason} ${item.warrantyYears}-year warranty. ${durabilitySentence}`
      : `Material: ${baseMaterial}. ${item.warrantyYears}-year warranty. ${durabilitySentence}`
  }, [humanizeDeterministicBreakdown])

  const truncatePill = useCallback((value: string) => {
    return value.length > 18 ? `${value.slice(0, 17).trimEnd()}…` : value
  }, [])

  const buildPills = useCallback((item: RecommendedItem) => {
    const baseMaterial = item.material
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/fabric/gi, '')
      .replace(/wood/gi, 'Wood')
      .replace(/metal/gi, 'Metal')
      .replace(/\s+/g, ' ')
      .trim()
    const materialLabel = baseMaterial ? `✓ ${baseMaterial}` : '✓ Material'
    return [
      truncatePill(materialLabel),
      truncatePill(`${item.warrantyYears}yr warranty`),
      truncatePill(`${item.durabilityScore}/10 durability`),
    ].slice(0, 3)
  }, [truncatePill])

  const handleCompareRemove = useCallback((id: string) => {
    onCompareToggle(id)
    if (compareItems.length <= 1) setShowCompareView(false)
  }, [onCompareToggle, compareItems.length])

  const handleClearAllCompare = useCallback(() => {
    compareItems.forEach(id => onCompareToggle(id))
    setShowCompareView(false)
  }, [compareItems, onCompareToggle])

  const handleSaveResults = useCallback(() => {
    const data = { results: activeResults, meta, form, roomAnalysis, savedAt: new Date() }
    localStorage.setItem('furnish_ai_saved_results', JSON.stringify(data))
    alert('Results saved! You can access them from your account.')
  }, [activeResults, meta, form, roomAnalysis])

  const handleShareResults = useCallback(() => {
    const shareText = `Check out these ${activeResults.length} furniture recommendations from FurnishAI! Perfect for ${form.roomType.toLowerCase()}.`
    if (navigator.share) {
      navigator.share({ title: 'FurnishAI Results', text: shareText })
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
      alert('Link copied to clipboard!')
    }
  }, [activeResults.length, form])

  const toggleQuickAdjustment = useCallback((id: QuickAdjustmentId) => {
    if (isMobile && mobileSidebarOpen) {
      setDraftAdjustments(current =>
        current.includes(id)
          ? current.filter(activeId => activeId !== id)
          : [...current, id]
      )
      return
    }

    setActiveAdjustments(current =>
      current.includes(id)
        ? current.filter(activeId => activeId !== id)
        : [...current, id]
    )
  }, [isMobile, mobileSidebarOpen])

  const openMobileControls = useCallback(() => {
    setDraftAdjustments(activeAdjustments)
    setDraftCity(form.city)
    setMobileSidebarOpen(true)
  }, [activeAdjustments, form.city])

  const closeMobileControls = useCallback(() => {
    setDraftAdjustments(activeAdjustments)
    setDraftCity(form.city)
    setMobileSidebarOpen(false)
  }, [activeAdjustments, form.city])

  const handleApplyPrice = useCallback(async () => {
    const nextPrice = clampPrice(draftPriceCap)
    setHasAppliedPriceCap(true)
    onPriceFilterChange(nextPrice)

    if (!onApplyPriceCap) return
    setIsApplyingPrice(true)
    try {
      await onApplyPriceCap(nextPrice)
    } finally {
      setIsApplyingPrice(false)
    }
  }, [clampPrice, draftPriceCap, onApplyPriceCap, onPriceFilterChange])

  const applyMobileControls = useCallback(async () => {
    setActiveAdjustments(draftAdjustments)

    if (draftCity !== form.city) {
      await Promise.resolve(onCityChange(draftCity))
    }

    if (hasPendingPriceChange) {
      await handleApplyPrice()
    }

    setMobileSidebarOpen(false)
  }, [draftAdjustments, draftCity, form.city, hasPendingPriceChange, handleApplyPrice, onCityChange])

  const handleUsefulnessFeedback = useCallback((rating: 'yes' | 'partial' | 'no') => {
    setUsefulnessRating(rating)
    if (rating !== 'no') {
      console.log({
        feedback: rating === 'yes' ? 'yes' : 'partial',
        reason: null,
        timestamp: new Date().toISOString(),
        category: form.furnitureType,
        budget: form.budget,
      })
      setFeedbackReason(null)
    }
  }, [form])

  const handleFeedbackReason = useCallback((reason: string) => {
    setFeedbackReason(reason)
    console.log({
      feedback: 'no',
      reason,
      timestamp: new Date().toISOString(),
      category: form.furnitureType,
      budget: form.budget,
    })
  }, [form])

  const handleShareProduct = useCallback(async (item: RecommendedItem) => {
    const shareText = `Check out ${item.name} on FurnishAI`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.name,
          text: shareText,
          url: item.productUrl,
        })
        return
      }
      await navigator.clipboard.writeText(`${shareText}\n${item.productUrl}`)
    } catch {
      // Swallow share/copy failures to avoid interrupting product exploration flow.
    }
  }, [])

  const toggleWhyExpanded = useCallback((itemId: string) => {
    setExpandedWhyById((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }))
  }, [])

  const renderWhyCopy = useCallback((item: RecommendedItem, variant: 'primary' | 'stretch', whyCopy: string, compact = false) => {
    const expanded = Boolean(expandedWhyById[item.id])
    const threshold = compact ? 100 : 120
    const shouldCollapse = whyCopy.length > threshold
    const visibleCopy = shouldCollapse && !expanded
      ? `${whyCopy.slice(0, threshold).trimEnd()}...`
      : whyCopy

    return (
      <>
        <div className={`why-label ${variant === 'stretch' ? 'stretch-callout-label' : ''}`}>
          {variant === 'stretch' ? "Why it's worth it" : 'Why it fits you'}
        </div>
        <p className="card-why-copy">{visibleCopy}</p>
        {shouldCollapse && (
          <button
            type="button"
            className="card-why-toggle"
            onClick={() => toggleWhyExpanded(item.id)}
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </>
    )
  }, [expandedWhyById, toggleWhyExpanded])

  const renderResultCard = (
    item: RecommendedItem,
    index: number,
    variant: 'primary' | 'stretch',
    options?: { compactStretch?: boolean; gridSpan?: number }
  ) => {
    const isCompared = compareItems.includes(item.id)
    const isWishlisted = savedIds.includes(item.id)
    const priceDelta = item.price - form.budget
    const whyCopy = buildWhyCopy(item, variant)
    const attributePills = buildPills(item)
    const compactStretch = options?.compactStretch ?? true
    const gridSpan = options?.gridSpan ?? 1

    if (variant === 'stretch') {
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
            style={{
              ...(gridSpan > 1 ? { gridColumn: `span ${gridSpan}` } : {}),
            }}
          >
            <div className="rank-badge stretch-badge">↑ Stretch Pick</div>
            <div className="card-media">
              <div className="card-img" aria-hidden="true" />
              <button
                type="button"
                className={`card-bookmark-btn ${isWishlisted ? 'saved' : ''}`}
                onClick={() => { void handleSave(item) }}
                title={isWishlisted ? 'Remove from saved' : 'Save item'}
                aria-pressed={isWishlisted}
              >
                <svg
                  className="card-bookmark-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v16.7a.25.25 0 0 1-.4.2L12 16.5l-6.85 5.4a.25.25 0 0 1-.4-.2V5A1.25 1.25 0 0 1 6 3.75Z" />
                </svg>
              </button>
            </div>
            <div className="card-body">
              <div className="card-head-row">
                <div className="card-brand">{item.brand}</div>
                <div className="card-score-pill">Fit {item.durabilityScore}/10</div>
              </div>
              <div className="card-name">{item.name}</div>
              <div className="card-price-row stretch-price-row">
                <div className="stretch-price-stack">
                  <div className="card-price">{fmt(item.price)}</div>
                  <div className="card-location-line">{form.city} · {item.inStock ? 'In stock' : 'Ships soon'}</div>
                </div>
                <div className="card-rating-inline">★ {item.rating} <span>({item.reviewCount})</span></div>
              </div>
              <div className="stretch-overage">+{fmt(priceDelta)} over your budget</div>
              <div className="card-divider" />
              <motion.div className="card-why stretch-callout" layout>
                {renderWhyCopy(item, variant, whyCopy)}
              </motion.div>
              <div className="card-chip-row">
                {attributePills.map(pill => (
                  <span key={`${item.id}-${pill}`} className="card-chip">{pill}</span>
                ))}
              </div>
              <div className="card-actions-row">
                <button
                  type="button"
                  className="card-action-btn"
                  onClick={() => { void handleShareProduct(item) }}
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
                  onClick={() => {
                    if (userId) {
                      void trackProductClick(userId, sessionId ?? '', {
                        product_id: item.id,
                        product_name: item.name,
                        rank_position: index + 1,
                        price: item.price,
                      })
                    }
                    console.log({
                      event: 'product_click',
                      item_id: item.id,
                      item_name: item.name,
                      rank_position: 'stretch-grid',
                      price: item.price,
                      timestamp: new Date().toISOString(),
                    })
                    window.open(item.productUrl, '_blank')
                  }}
                >
                  View piece →
                </button>
              </div>
              <div className="card-delivery">Delivery in 5-7 days · {form.city}</div>
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
            <div className="card-img stretch-card-media" aria-hidden="true" />
            <button
              type="button"
              className={`card-bookmark-btn ${isWishlisted ? 'saved' : ''}`}
              onClick={() => { void handleSave(item) }}
              title={isWishlisted ? 'Remove from saved' : 'Save item'}
              aria-pressed={isWishlisted}
            >
              <svg
                className="card-bookmark-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v16.7a.25.25 0 0 1-.4.2L12 16.5l-6.85 5.4a.25.25 0 0 1-.4-.2V5A1.25 1.25 0 0 1 6 3.75Z" />
              </svg>
            </button>
          </div>
          <div className="card-body stretch-card-body">
            <div className="card-head-row">
              <div className="card-brand">{item.brand}</div>
              <div className="card-score-pill">Fit {item.durabilityScore}/10</div>
            </div>
            <div className="card-name">{item.name}</div>
            <div className="card-price-row stretch-price-row">
              <div className="stretch-price-stack">
                <div className="card-price">{fmt(item.price)}</div>
                <div className="card-location-line">{form.city} · {item.inStock ? 'In stock' : 'Ships soon'}</div>
              </div>
              <div className="card-rating-inline">★ {item.rating} <span>({item.reviewCount})</span></div>
            </div>
            <div className="stretch-overage">+{fmt(priceDelta)} over your budget</div>
            <div className="card-divider" />
            <motion.div className="card-why stretch-callout compact" layout>
              {renderWhyCopy(item, variant, whyCopy, true)}
            </motion.div>
            <div className="stretch-card-meta">
              {attributePills.map(pill => (
                <span key={`${item.id}-${pill}`} className="stretch-mini-tag">{pill}</span>
              ))}
            </div>
            <div className="card-actions-row compact">
              <button
                type="button"
                className="card-action-btn"
                onClick={() => { void handleShareProduct(item) }}
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
                onClick={() => {
                  if (userId) {
                    void trackProductClick(userId, sessionId ?? '', {
                      product_id: item.id,
                      product_name: item.name,
                      rank_position: index + 1,
                      price: item.price,
                    })
                  }
                  console.log({
                    event: 'product_click',
                    item_id: item.id,
                    item_name: item.name,
                    rank_position: 'stretch',
                    price: item.price,
                    timestamp: new Date().toISOString(),
                  })
                  window.open(item.productUrl, '_blank')
                }}
              >
                View piece →
              </button>
            </div>
            <div className="card-delivery">Delivery in 5-7 days · {form.city}</div>
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
          <div className="card-img" aria-hidden="true" />
          <button
            type="button"
            className={`card-bookmark-btn ${isWishlisted ? 'saved' : ''}`}
            onClick={() => { void handleSave(item) }}
            title={isWishlisted ? 'Remove from saved' : 'Save item'}
            aria-pressed={isWishlisted}
          >
            <svg
              className="card-bookmark-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 3.75h12A1.25 1.25 0 0 1 19.25 5v16.7a.25.25 0 0 1-.4.2L12 16.5l-6.85 5.4a.25.25 0 0 1-.4-.2V5A1.25 1.25 0 0 1 6 3.75Z" />
            </svg>
          </button>
        </div>
        <div className="card-body">
          <div className="card-head-row">
            <div className="card-brand">{item.brand}</div>
            <div className="card-score-pill">Fit {item.durabilityScore}/10</div>
          </div>
          <div className="card-name">{item.name}</div>
          <div className="card-price-row">
            <div className="card-price-block">
              <div className="card-price">{fmt(item.price)}</div>
              <div className="card-location-line">{form.city} · {item.inStock ? 'In stock' : 'Ships soon'}</div>
            </div>
            <div className="card-rating-inline">★ {item.rating} <span>({item.reviewCount})</span></div>
          </div>
          <div className="card-divider" />
          <motion.div className="card-why" layout>
            {renderWhyCopy(item, variant, whyCopy)}
          </motion.div>
          <div className="card-chip-row">
            {attributePills.map(pill => (
              <span key={`${item.id}-${pill}`} className="card-chip">{pill}</span>
            ))}
          </div>
          <div className="card-actions-row">
            <button
              type="button"
              className="card-action-btn"
              onClick={() => { void handleShareProduct(item) }}
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
              onClick={() => {
                if (userId) {
                  void trackProductClick(userId, sessionId ?? '', {
                    product_id: item.id,
                    product_name: item.name,
                    rank_position: index + 1,
                    price: item.price,
                  })
                }
                console.log({
                  event: 'product_click',
                  item_id: item.id,
                  item_name: item.name,
                  rank_position: index + 1,
                  price: item.price,
                  timestamp: new Date().toISOString(),
                })
                window.open(item.productUrl, '_blank')
              }}
            >
              View piece →
            </button>
          </div>
          <div className="card-delivery">Delivery in 5-7 days</div>
        </div>
      </motion.article>
    )
  }

  return (
    <>
      <style>{`
        .debug-panel {
          margin: 0 0 16px;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 8px;
          background: rgba(0,0,0,0.02);
          overflow: hidden;
        }
        .debug-panel-toggle {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          gap: 8px;
        }
        .debug-panel-count {
          font-size: 12px;
          color: #888;
          font-weight: 500;
        }
        .debug-panel-chevron {
          font-size: 10px;
          color: #aaa;
          flex-shrink: 0;
        }
        .debug-panel-list {
          list-style: none;
          margin: 0;
          padding: 0 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .debug-panel-list li {
          font-size: 12px;
          color: #999;
          padding: 2px 0;
        }
        .refine-chip.active {
          border-color: #b85e36;
          background: #fff5ef;
          color: #111;
          font-weight: 600;
        }
        .sidebar-range-wrap {
          position: relative;
          padding-top: 20px;
        }
        .sidebar-range-bubble {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
          background: #111;
          color: #fff;
          font-size: 11px;
          line-height: 1;
          padding: 6px 8px;
          border-radius: 999px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
        }
        .sidebar-range-live {
          margin-top: 8px;
          font-size: 12px;
          color: #666;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sidebar-range-live strong {
          color: #111;
          font-weight: 600;
        }
        .sidebar-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          outline: none;
          background: #e8e1d8;
        }
        .sidebar-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid var(--terracotta);
          background: #fff;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        }
        .sidebar-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid var(--terracotta);
          background: #fff;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        }
        .sidebar-range::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: #e8e1d8;
        }
      `}</style>
      <div className="results-wrapper results-shell">
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
            <div className="sidebar-sub">{activeResults.length} options ranked around your room read, budget, city, and preference signals.</div>
          </div>

          <div className="sidebar-section">
            <div className="sl">Quick adjustments</div>
            <div className="sidebar-section-note">Small nudges to reshape ranking without resetting your room context.</div>
            <div className="refine-chip-stack">
              {quickAdjustments.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`refine-chip ${(isMobile && mobileSidebarOpen ? draftAdjustments : activeAdjustments).includes(option.id) ? 'active' : ''}`}
                  onClick={() => toggleQuickAdjustment(option.id)}
                  aria-pressed={(isMobile && mobileSidebarOpen ? draftAdjustments : activeAdjustments).includes(option.id)}
                >
                  {option.label}
                </button>
              ))}
              {quickAdjustments.length === 0 && (
                <div className="sidebar-footnote-copy">No additional quick refinements are available for this shortlist.</div>
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
                onInput={e => setDraftPriceCap(clampPrice(Number((e.target as HTMLInputElement).value)))}
                onChange={e => setDraftPriceCap(clampPrice(Number(e.target.value)))}
                onPointerDown={() => setIsPriceSliding(true)}
                onPointerUp={() => setIsPriceSliding(false)}
                onPointerCancel={() => setIsPriceSliding(false)}
                onBlur={() => setIsPriceSliding(false)}
              />
            </div>
            <div className="sidebar-range-live">
              <span>Set at <strong>{fmt(draftPriceCap)}</strong></span>
              <span>Applied <strong>{fmt(appliedPriceCap)}</strong></span>
            </div>
            <div className="sidebar-range-meta">
              <span className="inline-count">{activeResults.length} items</span>
              <button
                type="button"
                className="ctrl-btn"
                onClick={() => { void handleApplyPrice() }}
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
              value={isMobile && mobileSidebarOpen ? draftCity : form.city}
              onChange={e => {
                if (isMobile && mobileSidebarOpen) {
                  setDraftCity(e.target.value)
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
                onClick={closeMobileControls}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ctrl-btn active"
                onClick={() => { void applyMobileControls() }}
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

        <main className="results-main">
          <div className="results-header-shell">
            <div className="results-header">
              <div className="results-header-meta">
                <div className="results-context-line">
                  {activeResults.length} matches · {form.roomType} · {form.city} · {hasStretchResults
                    ? `${fmt(form.budget)} budget + stretch to ${fmt(form.budgetMax)}`
                    : `under ${fmt(form.budget)}`}
                </div>
                <div className="results-context-note">{leadingInsight ?? meta.summary}</div>
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
          {/* Pipeline debug panel — dev/troubleshooting tool */}
          {meta.pipelineDebug && (
            <div className="debug-panel" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="debug-panel-toggle"
                onClick={() => setDebugOpen(o => !o)}
                aria-expanded={debugOpen}
              >
                <span className="debug-panel-count" style={{ fontFamily: 'monospace' }}>
                  🔬 Pipeline: {meta.pipelineDebug.afterHardFilters} eligible → {meta.pipelineDebug.primary}P + {meta.pipelineDebug.stretch}S / {meta.pipelineDebug.discarded} discarded
                </span>
                <span className="debug-panel-chevron">{debugOpen ? '▴' : '▾'}</span>
              </button>
              {debugOpen && (
                <ul className="debug-panel-list" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  <li>📦 Repository total: {meta.pipelineDebug.totalInRepository}</li>
                  <li>🗑️ Rejected (pruned before score): {meta.pipelineDebug.rejectedPruned} → {meta.pipelineDebug.afterRejectionPrune} remaining</li>
                  <li>✅ After hard filters: {meta.pipelineDebug.afterHardFilters}</li>
                  <li>📊 Scored: {meta.pipelineDebug.scored}</li>
                  <li>🟢 Primary tier (score≥50, price≤budget): {meta.pipelineDebug.primary}</li>
                  <li>🟡 Stretch tier (score≥64, budget&lt;price≤stretchCap): {meta.pipelineDebug.stretch}</li>
                  <li>⚫ Discarded: {meta.pipelineDebug.discarded}</li>
                  <li>💰 Budget: ₹{meta.pipelineDebug.budget.toLocaleString('en-IN')} · budgetMax: ₹{meta.pipelineDebug.budgetMax.toLocaleString('en-IN')} · stretchCap: ₹{meta.pipelineDebug.stretchCap.toLocaleString('en-IN')}</li>
                  {meta.pipelineDebug.relaxedFlags.length > 0 && (
                    <li>⚠️ Relaxed: {meta.pipelineDebug.relaxedFlags.join(' | ')}</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="results-grid">
            {visiblePrimaryResults.map((item, idx) => renderResultCard(item, idx, 'primary'))}
            {stretchPromotedToGrid.map((item, idx) =>
              renderResultCard(item, idx, 'stretch', {
                compactStretch: false,
                gridSpan: stretchPromotedToGrid.length === 1 ? promotedStretchGridSpan : 1,
              })
            )}
          </div>

          {activeResults.length === 0 && (
            <div className="results-feedback-panel" style={{ marginTop: 20 }}>
              <div className="results-feedback-title">No items match the current refinements</div>
              <div className="results-feedback-copy">Try increasing the price cap or turning off one quick adjustment.</div>
            </div>
          )}

          {remainingStretchResults.length > 0 && (
            <section className="stretch-section compact-rail">
              <div className="stretch-section-header compact">
                <div>
                  <div className="stretch-section-label">Worth the extra?</div>
                  <div className="stretch-section-title">Optional upgrades if you can stretch a little</div>
                </div>
                <div className="stretch-section-copy">
                  Higher-ranked for fit or quality, outside your stated budget.
                </div>
              </div>
              <div className="stretch-grid compact">
                {remainingStretchResults.map((item, idx) =>
                  renderResultCard(item, idx, 'stretch', { compactStretch: true })
                )}
              </div>
            </section>
          )}

          <div className="results-usefulness-panel">
            <div className="results-usefulness-title">Was this shortlist useful for your room?</div>
            <div className="results-usefulness-actions">
              <button
                type="button"
                className={`usefulness-btn ${usefulnessRating === 'yes' ? 'selected' : ''}`}
                onClick={() => handleUsefulnessFeedback('yes')}
              >
                Yes, it fits
              </button>
              <button
                type="button"
                className={`usefulness-btn ${usefulnessRating === 'partial' ? 'selected' : ''}`}
                onClick={() => handleUsefulnessFeedback('partial')}
              >
                Partially
              </button>
              <button
                type="button"
                className={`usefulness-btn ${usefulnessRating === 'no' ? 'selected' : ''}`}
                onClick={() => handleUsefulnessFeedback('no')}
              >
                Not really
              </button>
            </div>
            {usefulnessRating === 'no' && feedbackReason === null && (
              <div className="results-usefulness-reasons">
                <div className="reasons-label">What was the issue?</div>
                <div className="reasons-chips">
                  <button
                    type="button"
                    className="reason-chip"
                    onClick={() => handleFeedbackReason('Too expensive')}
                  >
                    Too expensive
                  </button>
                  <button
                    type="button"
                    className="reason-chip"
                    onClick={() => handleFeedbackReason('Wrong style')}
                  >
                    Wrong style
                  </button>
                  <button
                    type="button"
                    className="reason-chip"
                    onClick={() => handleFeedbackReason("Doesn't match my room")}
                  >
                    Doesn&apos;t match my room
                  </button>
                  <button
                    type="button"
                    className="reason-chip"
                    onClick={() => handleFeedbackReason('Too few options')}
                  >
                    Too few options
                  </button>
                </div>
              </div>
            )}
          </div>

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

      {compareItems.length > 0 && (
        <div className="compare-fab">
          {compareItems.length === 1 ? (
            <div className="compare-fab-message">
              ⊡ Select one more to start comparing
            </div>
          ) : (
            <div className="compare-fab-with-clear">
              <button
                type="button"
                className="compare-fab-btn compare-fab-active"
                onClick={() => setShowCompareView(true)}
              >
                ⊡ Compare ({compareItems.length} selected) →
              </button>
              <button
                type="button"
                className="compare-fab-clear"
                onClick={handleClearAllCompare}
                title="Clear all selections"
                aria-label="Clear selected items"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={closeMobileControls}
        />
      )}

      <button
        type="button"
        className={`refine-results-button ${mobileSidebarOpen ? 'is-open' : ''}`}
        aria-expanded={mobileSidebarOpen}
        aria-controls="shortlist-controls-popup"
        onClick={() => {
          if (mobileSidebarOpen) {
            closeMobileControls()
            return
          }
          openMobileControls()
        }}
      >
        {mobileSidebarOpen ? 'Close controls' : 'Shortlist controls'}
      </button>

      {showCompareView && compareItemObjects.length > 0 && (
        <ComparisonView
          compareItems={compareItemObjects}
          onClose={() => setShowCompareView(false)}
          onRemoveItem={handleCompareRemove}
          getWhyCopy={item => buildWhyCopy(item, item.tier === 'stretch' ? 'stretch' : 'primary')}
        />
      )}
    </>
  )
}
