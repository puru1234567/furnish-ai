import type { FurnitureCategory, StyleTag } from "@/lib/types"
import { SIGNAL_WEIGHTS } from "./weights"
import type { PersonalizationSignalEvent, PreferenceSignalStrength, RoomPreference, TasteProfile } from "./types"

function bucketBudget(price: number): "value" | "balanced" | "premium" {
  if (price < 15000) return "value"
  if (price <= 40000) return "balanced"
  return "premium"
}

function bucketRoom(roomSizeSqft: number): RoomPreference {
  if (roomSizeSqft < 120) return "compact"
  if (roomSizeSqft <= 240) return "mid"
  return "spacious"
}

function upsertSignal(
  table: Record<string, PreferenceSignalStrength>,
  key: string,
  delta: number,
): void {
  const current = table[key] ?? { value: 0, confidence: 0 }
  const nextValue = current.value + delta
  table[key] = {
    value: nextValue,
    confidence: Math.min(1, current.confidence + delta * 0.04),
  }
}

export function createEmptyTasteProfile(userId: string): TasteProfile {
  return {
    userId,
    profileVersion: 1,
    updatedAt: new Date().toISOString(),
    behavioralVolume: 0,
    stylePreference: {},
    budgetPreference: {
      preferredBand: "balanced",
      minBudget: 12000,
      maxBudget: 45000,
      confidence: 0,
    },
    roomPreference: {
      dominant: "mid",
      confidence: 0,
    },
    colorAffinity: {},
    categoryAffinity: {},
    searchHistory: {
      recentQueries: [],
      refinementRate: 0,
    },
    dwellSignals: {
      medianDwellMs: 0,
      longDwellThresholdMs: 9000,
    },
  }
}

export function applySignalToTasteProfile(
  profile: TasteProfile,
  signal: PersonalizationSignalEvent,
): TasteProfile {
  const next: TasteProfile = {
    ...profile,
    stylePreference: { ...profile.stylePreference },
    colorAffinity: { ...profile.colorAffinity },
    categoryAffinity: { ...profile.categoryAffinity },
    searchHistory: { ...profile.searchHistory, recentQueries: [...profile.searchHistory.recentQueries] },
    dwellSignals: { ...profile.dwellSignals },
    roomPreference: { ...profile.roomPreference },
    budgetPreference: { ...profile.budgetPreference },
  }

  const delta = SIGNAL_WEIGHTS[signal.type]
  next.behavioralVolume += 1
  next.updatedAt = signal.timestamp

  if (signal.category) {
    upsertSignal(next.categoryAffinity as Record<string, PreferenceSignalStrength>, signal.category, delta)
  }

  if (signal.styleTags?.length) {
    signal.styleTags.forEach((tag) => {
      upsertSignal(next.stylePreference as Record<string, PreferenceSignalStrength>, tag, delta)
    })
  }

  if (signal.colorTags?.length) {
    signal.colorTags.forEach((color) => {
      upsertSignal(next.colorAffinity as Record<string, PreferenceSignalStrength>, color.toLowerCase(), delta)
    })
  }

  if (typeof signal.price === "number") {
    const band = bucketBudget(signal.price)
    next.budgetPreference.preferredBand = band
    next.budgetPreference.confidence = Math.min(1, next.budgetPreference.confidence + delta * 0.03)

    const smoothing = 0.18
    next.budgetPreference.minBudget = Math.round(next.budgetPreference.minBudget * (1 - smoothing) + signal.price * 0.72 * smoothing)
    next.budgetPreference.maxBudget = Math.round(next.budgetPreference.maxBudget * (1 - smoothing) + signal.price * 1.18 * smoothing)
  }

  if (typeof signal.roomSizeSqft === "number") {
    next.roomPreference.dominant = bucketRoom(signal.roomSizeSqft)
    next.roomPreference.confidence = Math.min(1, next.roomPreference.confidence + delta * 0.04)
  }

  if (signal.query) {
    const normalized = signal.query.trim()
    if (normalized) {
      next.searchHistory.recentQueries = [normalized, ...next.searchHistory.recentQueries.filter((value) => value !== normalized)].slice(0, 20)
    }

    if (signal.type === "search_refined") {
      const previousVolume = Math.max(1, next.behavioralVolume)
      next.searchHistory.refinementRate = Math.min(1, (next.searchHistory.refinementRate * (previousVolume - 1) + 1) / previousVolume)
    }
  }

  if (typeof signal.dwellMs === "number") {
    const previousMedian = next.dwellSignals.medianDwellMs
    next.dwellSignals.medianDwellMs = previousMedian === 0
      ? signal.dwellMs
      : Math.round(previousMedian * 0.7 + signal.dwellMs * 0.3)
  }

  return next
}

interface SignalToEventAdapterInput {
  eventName: string
  payload: Record<string, unknown>
  occurredAt: string
}

export function toPersonalizationSignal(input: SignalToEventAdapterInput): PersonalizationSignalEvent | null {
  const { eventName, payload, occurredAt } = input

  if (eventName === "product.clicked") {
    return {
      type: "click",
      timestamp: occurredAt,
      category: (payload.category as FurnitureCategory | undefined) ?? undefined,
      styleTags: Array.isArray(payload.styleTags) ? (payload.styleTags as StyleTag[]) : undefined,
      colorTags: Array.isArray(payload.colorTags) ? (payload.colorTags as string[]) : undefined,
      price: typeof payload.price === "number" ? payload.price : undefined,
      roomSizeSqft: typeof payload.roomSqft === "number" ? payload.roomSqft : undefined,
      dwellMs: typeof payload.dwellMs === "number" ? payload.dwellMs : undefined,
    }
  }

  if (eventName === "product.saved_toggled") {
    return {
      type: "save",
      timestamp: occurredAt,
      category: (payload.category as FurnitureCategory | undefined) ?? undefined,
      styleTags: Array.isArray(payload.styleTags) ? (payload.styleTags as StyleTag[]) : undefined,
      colorTags: Array.isArray(payload.colorTags) ? (payload.colorTags as string[]) : undefined,
      price: typeof payload.price === "number" ? payload.price : undefined,
      roomSizeSqft: typeof payload.roomSqft === "number" ? payload.roomSqft : undefined,
    }
  }

  if (eventName === "product.compared_toggled") {
    return {
      type: "compare",
      timestamp: occurredAt,
      category: (payload.category as FurnitureCategory | undefined) ?? undefined,
      styleTags: Array.isArray(payload.styleTags) ? (payload.styleTags as StyleTag[]) : undefined,
      colorTags: Array.isArray(payload.colorTags) ? (payload.colorTags as string[]) : undefined,
      price: typeof payload.price === "number" ? payload.price : undefined,
      roomSizeSqft: typeof payload.roomSqft === "number" ? payload.roomSqft : undefined,
    }
  }

  if (eventName === "search.query_submitted") {
    return {
      type: "search",
      timestamp: occurredAt,
      query: typeof payload.query === "string" ? payload.query : undefined,
    }
  }

  if (eventName === "search.refined") {
    return {
      type: "search_refined",
      timestamp: occurredAt,
      query: typeof payload.nextQuery === "string" ? payload.nextQuery : undefined,
    }
  }

  if (eventName === "session.duration_reported") {
    return {
      type: "dwell",
      timestamp: occurredAt,
      dwellMs: typeof payload.durationMs === "number" ? payload.durationMs : undefined,
    }
  }

  return null
}
