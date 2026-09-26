"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"

export interface ParsedIntent {
  style: string | null
  space: string | null
  budget: string | null
  product: string | null
}

interface UseConversationalSearchParams {
  query: string
  setQuery: (value: string) => void
  examples: string[]
  recentStorageKey?: string
  maxRecent?: number
}

interface UseConversationalSearchResult {
  placeholder: string
  recentSearches: string[]
  clearRecentSearches: () => void
  dropdownOpen: boolean
  filteredSuggestions: string[]
  activeIndex: number
  setActiveIndex: (index: number) => void
  openDropdown: () => void
  closeDropdown: () => void
  handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  applySuggestion: (value: string, options?: { shouldStore?: boolean }) => void
  storeRecentSearch: (value: string) => void
  parsedIntent: ParsedIntent
}

const STYLE_KEYWORDS = [
  "cozy",
  "minimal",
  "japandi",
  "scandinavian",
  "modern",
  "vintage",
  "warm",
]

const SPACE_KEYWORDS = [
  "compact",
  "small",
  "studio",
  "apartment",
  "large",
  "spacious",
]

const PRODUCT_KEYWORDS = [
  "sofa",
  "desk",
  "dining table",
  "chair",
  "bed",
  "tv unit",
  "coffee table",
  "wardrobe",
]

function parseBudget(query: string): string | null {
  const normalized = query.toLowerCase()

  const inrMatch = normalized.match(/(?:inr|₹|rs\.?|rupees?)\s*(\d+[\d,]*)(?:\s*(k|lakh|lakhs))?/i)
  if (inrMatch) {
    const base = inrMatch[1] ?? ""
    const suffix = inrMatch[2]?.toLowerCase()
    if (suffix === "k") return `₹${base}k`
    if (suffix === "lakh" || suffix === "lakhs") return `₹${base} lakh`
    return `₹${base}`
  }

  const underMatch = normalized.match(/under\s*(\d+[\d,]*)(\s*k)?/i)
  if (underMatch) {
    const value = underMatch[1] ?? ""
    const hasK = Boolean(underMatch[2])
    return hasK ? `₹${value}k` : `₹${value}`
  }

  return null
}

function parseIntent(query: string): ParsedIntent {
  const normalized = query.toLowerCase()

  const style = STYLE_KEYWORDS.find((keyword) => normalized.includes(keyword)) ?? null
  const space = SPACE_KEYWORDS.find((keyword) => normalized.includes(keyword)) ?? null
  const product = PRODUCT_KEYWORDS.find((keyword) => normalized.includes(keyword)) ?? null
  const budget = parseBudget(query)

  return {
    style: style ? style[0].toUpperCase() + style.slice(1) : null,
    space: space ? space[0].toUpperCase() + space.slice(1) : null,
    budget,
    product: product ? product[0].toUpperCase() + product.slice(1) : null,
  }
}

export function useConversationalSearch({
  query,
  setQuery,
  examples,
  recentStorageKey = "furnish-ai:recent-searches",
  maxRecent = 5,
}: UseConversationalSearchParams): UseConversationalSearchResult {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % Math.max(1, examples.length))
    }, 3000)

    return () => window.clearInterval(timer)
  }, [examples.length])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(recentStorageKey)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((value) => typeof value === "string"))
        }
      } catch {
        setRecentSearches([])
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [recentStorageKey])

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const source = [...examples, ...recentSearches]
    const unique = Array.from(new Set(source))

    if (!normalizedQuery) {
      return unique.slice(0, 6)
    }

    const startsWith = unique.filter((item) => item.toLowerCase().startsWith(normalizedQuery))
    const includes = unique.filter(
      (item) => item.toLowerCase().includes(normalizedQuery) && !startsWith.includes(item),
    )

    return [...startsWith, ...includes].slice(0, 6)
  }, [examples, query, recentSearches])

  const boundedActiveIndex = Math.min(activeIndex, Math.max(0, filteredSuggestions.length - 1))

  function openDropdown() {
    setDropdownOpen(true)
  }

  function closeDropdown() {
    setDropdownOpen(false)
  }

  function storeRecentSearch(value: string) {
    const normalized = value.trim()
    if (!normalized) return

    setRecentSearches((prev) => {
      const next = [normalized, ...prev.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase())].slice(0, maxRecent)
      window.localStorage.setItem(recentStorageKey, JSON.stringify(next))
      return next
    })
  }

  function clearRecentSearches() {
    setRecentSearches([])
    window.localStorage.removeItem(recentStorageKey)
  }

  function applySuggestion(value: string, options?: { shouldStore?: boolean }) {
    setQuery(value)
    setDropdownOpen(false)
    if (options?.shouldStore ?? true) {
      storeRecentSearch(value)
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setDropdownOpen(true)
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!filteredSuggestions.length) return
      setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (!filteredSuggestions.length) return
      setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
      return
    }

    if (event.key === "Enter" && dropdownOpen && filteredSuggestions[activeIndex]) {
      event.preventDefault()
      applySuggestion(filteredSuggestions[activeIndex])
      return
    }

    if (event.key === "Tab" && dropdownOpen && filteredSuggestions[activeIndex]) {
      // Smart autocomplete: allow keyboard-first completion using Tab.
      event.preventDefault()
      applySuggestion(filteredSuggestions[activeIndex], { shouldStore: false })
      return
    }

    if (event.key === "Escape") {
      closeDropdown()
    }
  }

  return {
    placeholder: examples[placeholderIndex] ?? "Describe your ideal furniture in one sentence",
    recentSearches,
    clearRecentSearches,
    dropdownOpen,
    filteredSuggestions,
    activeIndex: boundedActiveIndex,
    setActiveIndex,
    openDropdown,
    closeDropdown,
    handleInputKeyDown,
    applySuggestion,
    storeRecentSearch,
    parsedIntent: parseIntent(query),
  }
}
