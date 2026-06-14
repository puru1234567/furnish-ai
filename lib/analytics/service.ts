"use client"

import type {
  AnalyticsContext,
  AnalyticsEventEnvelope,
  AnalyticsEventName,
  AnalyticsEventPayloadMap,
} from "./events"

const SESSION_STORAGE_KEY = "furnish-ai:analytics:session-id"
const FLUSH_INTERVAL_MS = 2500
const MAX_BATCH_SIZE = 20

function createSessionId(): string {
  if (typeof window === "undefined") return "server"

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, value)
  return value
}

class AnalyticsService {
  private queue: AnalyticsEventEnvelope[] = []
  private flushTimer: number | null = null
  private context: AnalyticsContext | null = null

  initialize(userId?: string | null): AnalyticsContext {
    if (this.context) {
      if (typeof userId !== "undefined") {
        this.context = { ...this.context, userId }
      }
      return this.context
    }

    this.context = {
      sessionId: createSessionId(),
      userId: userId ?? null,
    }

    if (typeof window !== "undefined") {
      const flushOnExit = () => {
        void this.flush(true)
      }

      window.addEventListener("pagehide", flushOnExit)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          void this.flush(true)
        }
      })
    }

    return this.context
  }

  setUserId(userId: string | null): void {
    const context = this.initialize(userId)
    this.context = { ...context, userId }
  }

  getContext(): AnalyticsContext {
    return this.initialize(this.context?.userId ?? null)
  }

  track<TName extends AnalyticsEventName>(
    eventName: TName,
    payload: AnalyticsEventPayloadMap[TName],
    contextOverride?: Partial<Pick<AnalyticsEventEnvelope, "pagePath" | "userId">>,
  ): void {
    const context = this.getContext()
    const event: AnalyticsEventEnvelope<TName> = {
      eventName,
      payload,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString(),
      pagePath: contextOverride?.pagePath ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
      userId: contextOverride?.userId ?? context.userId ?? null,
    }

    this.queue.push(event)

    if (this.queue.length >= MAX_BATCH_SIZE) {
      void this.flush(false)
      return
    }

    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null || typeof window === "undefined") return

    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null
      void this.flush(false)
    }, FLUSH_INTERVAL_MS)
  }

  async flush(useBeacon: boolean): Promise<void> {
    if (this.queue.length === 0 || typeof window === "undefined") return

    const batch = this.queue.splice(0, MAX_BATCH_SIZE)
    const body = JSON.stringify({ events: batch })

    try {
      if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" })
        navigator.sendBeacon("/api/track", blob)
        return
      }

      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
    } catch {
      // Re-queue on transient failures. Keep max queue bounded to avoid memory growth.
      this.queue = [...batch, ...this.queue].slice(0, MAX_BATCH_SIZE * 3)
    }
  }
}

export const analyticsService = new AnalyticsService()
