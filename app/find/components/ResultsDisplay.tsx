'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { FormData } from '../find-page-model'
import type { RecommendedItem, RecommendationResponse, RoomAnalysis } from '@/lib/types'
import type { SortOption } from '@/lib/utils/sort-items'
import { SORT_OPTIONS, sortRecommendations } from '@/lib/utils/sort-items'
import { fmt } from '../find-page-utils'
import { ComparisonView } from './ComparisonView'
import { ProductCard } from './ProductCard'
import {
  ResultsFilterSidebar,
  type QuickAdjustmentId,
  type QuickAdjustmentOption,
} from './ResultsFilterSidebar'
import {
  saveResult,
  saveSearch,
  unsaveResult,
  getSavedResults,
  getRejectedIds,
  rejectItem,
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

export function ResultsDisplay({
  results,
  meta,
  form,
  roomAnalysis: _roomAnalysis,
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
  const [rejectedIds, setRejectedIds] = useState<string[]>([])
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
  const [popup, setPopup] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showPopup = useCallback((tone: 'success' | 'error' | 'info', message: string) => {
    setPopup({ tone, message })
  }, [])

  useEffect(() => {
    if (!popup) return
    const timeout = window.setTimeout(() => setPopup(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [popup])

  // Load saved results from Supabase
  useEffect(() => {
    if (!userId) {
      setSavedIds([])
      setRejectedIds([])
      return
    }

    getSavedResults(userId).then(results => {
      setSavedIds(results.map(r => r.product_id))
    })

    getRejectedIds(userId).then(ids => {
      setRejectedIds(ids)
    })
  }, [userId])

  const handleSave = useCallback((item: RecommendedItem) => {
    if (!userId) {
      showPopup('info', 'Log in to save items to your account.')
      return
    }

    const alreadySaved = savedIds.includes(item.id)
    const nextSavedIds = alreadySaved
      ? savedIds.filter(id => id !== item.id)
      : [...savedIds, item.id]

    setSavedIds(nextSavedIds)

    if (alreadySaved) {
      void unsaveResult(userId, item.id)
      showPopup('info', 'Item removed from saved items.')
      return
    }

    void saveResult(userId, sessionId, {
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
    showPopup('success', 'Item saved to your account.')
  }, [userId, savedIds, sessionId, form.city, form.budget, form.furnitureType, showPopup])

  const selectedContextualCount = Object.keys(form.contextualAnswers).length

  const baseResults = useMemo(
    () => results.filter(item => !rejectedIds.includes(item.id)),
    [results, rejectedIds]
  )

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

  const handleSaveResults = useCallback(async () => {
    if (!userId) {
      showPopup('info', 'Log in to save searches to your account.')
      return
    }

    const saveOutcome = await saveSearch(userId, {
      session_id: sessionId,
      furniture_type: form.furnitureType,
      room_type: form.roomType,
      city: form.city,
      budget: form.budget,
      budget_max: form.budgetMax,
      result_count: activeResults.length,
      summary: meta.summary,
      context_insights: meta.contextInsights,
      form_snapshot: form as unknown as Record<string, unknown>,
      results_snapshot: activeResults as unknown as Array<Record<string, unknown>>,
    })

    if (!saveOutcome.id) {
      if (saveOutcome.reason === 'not_authenticated') {
        showPopup('info', 'Your session expired. Please log in again to save searches.')
        return
      }

      if (saveOutcome.reason === 'table_missing') {
        showPopup('error', 'Saved searches table is not set up yet. Run the latest schema SQL.')
        return
      }

      if (saveOutcome.reason === 'forbidden') {
        showPopup('error', 'You do not have permission to save searches for this account.')
        return
      }

      showPopup('error', saveOutcome.code
        ? `Could not save this search (${saveOutcome.code}). Please try again.`
        : 'Could not save this search. Please try again.')
      return
    }

    showPopup('success', 'Search saved to your account.')
  }, [userId, sessionId, form, activeResults, meta.summary, meta.contextInsights, showPopup])

  const handleShareResults = useCallback(() => {
    const shareText = `Check out these ${activeResults.length} furniture recommendations from FurnishAI! Perfect for ${form.roomType.toLowerCase()}.`
    if (navigator.share) {
      navigator.share({ title: 'FurnishAI Results', text: shareText })
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
      showPopup('success', 'Link copied to clipboard.')
    }
  }, [activeResults.length, form, showPopup])

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

  const handleReject = useCallback((item: RecommendedItem, reason: string = 'Not interested') => {
    if (rejectedIds.includes(item.id)) return

    setRejectedIds(current => current.includes(item.id) ? current : [...current, item.id])

    if (!userId) return
    void rejectItem(userId, sessionId, item.id, reason)
  }, [rejectedIds, userId, sessionId])

  const handleProductClick = useCallback((item: RecommendedItem, index: number, positionLabel: string) => {
    if (userId) {
      void trackProductClick(userId, sessionId, {
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
      rank_position: positionLabel,
      price: item.price,
      timestamp: new Date().toISOString(),
    })
    window.open(item.productUrl, '_blank')
  }, [userId, sessionId])

  const renderResultCard = (
    item: RecommendedItem,
    index: number,
    variant: 'primary' | 'stretch',
    options?: { compactStretch?: boolean; gridSpan?: number }
  ) => {
    const isCompared = compareItems.includes(item.id)
    const isWishlisted = savedIds.includes(item.id)
    const whyCopy = buildWhyCopy(item, variant)
    const attributePills = buildPills(item)

    return (
      <ProductCard
        key={item.id}
        item={item}
        index={index}
        variant={variant}
        userBudget={form.budget}
        userCity={form.city}
        isCompared={isCompared}
        isWishlisted={isWishlisted}
        whyCopy={whyCopy}
        attributePills={attributePills}
        compactStretch={options?.compactStretch}
        gridSpan={options?.gridSpan}
        onSave={handleSave}
        onReject={handleReject}
        onShare={(it) => { void handleShareProduct(it) }}
        onCompareToggle={onCompareToggle}
        onProductClick={handleProductClick}
      />
    )
  }

  return (
    <>
      <style>{`
        .results-popup {
          position: fixed;
          right: 20px;
          top: 88px;
          z-index: 80;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
          border: 1px solid transparent;
          max-width: min(90vw, 340px);
        }
        .results-popup.success {
          background: #edf8f0;
          color: #1f5f35;
          border-color: #b6e0c3;
        }
        .results-popup.error {
          background: #fff2f2;
          color: #8a2121;
          border-color: #f2bcbc;
        }
        .results-popup.info {
          background: #f4f5f8;
          color: #354156;
          border-color: #d6dbe5;
        }
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
      {popup ? (
        <div className={`results-popup ${popup.tone}`} role="status" aria-live="polite">
          {popup.message}
        </div>
      ) : null}
      <div className="results-wrapper results-shell">
        <ResultsFilterSidebar
          isMobile={isMobile}
          mobileSidebarOpen={mobileSidebarOpen}
          onCloseMobileControls={closeMobileControls}
          activeResultsCount={activeResults.length}
          quickAdjustments={quickAdjustments}
          activeAdjustments={activeAdjustments}
          draftAdjustments={draftAdjustments}
          onToggleQuickAdjustment={toggleQuickAdjustment}
          selectedBudget={selectedBudget}
          suggestedPriceCap={suggestedPriceCap}
          draftPriceCap={draftPriceCap}
          appliedPriceCap={appliedPriceCap}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          sliderProgress={sliderProgress}
          isPriceSliding={isPriceSliding}
          onDraftPriceCapChange={(val) => setDraftPriceCap(clampPrice(val))}
          onPriceSlidingChange={setIsPriceSliding}
          onApplyPrice={handleApplyPrice}
          hasPendingPriceChange={hasPendingPriceChange}
          isApplyingPrice={isApplyingPrice}
          currentCity={form.city}
          draftCity={draftCity}
          onCityChange={onCityChange}
          onDraftCityChange={setDraftCity}
          onApplyMobileControls={applyMobileControls}
          hasPendingMobileChanges={hasPendingMobileChanges}
          selectedContextualCount={selectedContextualCount}
        />

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
