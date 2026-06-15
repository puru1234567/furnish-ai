// Compatibility layer over the typed analytics service.
// Keep this file to avoid breaking older imports.

"use client"

import { analyticsService } from "./service"
import type { AnalyticsEventName, AnalyticsEventPayloadMap } from "./events"

type LegacyPayload = Record<string, unknown>

function isTypedEventName(value: string): value is AnalyticsEventName {
  return value.includes(".")
}

export function trackTypedEvent<TName extends AnalyticsEventName>(
  eventName: TName,
  payload: AnalyticsEventPayloadMap[TName],
): void {
  analyticsService.track(eventName, payload)
}

export async function trackEvent(
  sessionId: string,
  eventType: string,
  payload: LegacyPayload,
): Promise<void> {
  analyticsService.initialize(null)

  if (isTypedEventName(eventType)) {
    analyticsService.track(eventType, payload as unknown as AnalyticsEventPayloadMap[typeof eventType], {
      userId: null,
    })
    return
  }

  analyticsService.track("recommendation.engaged", {
    productId: String(payload.productId ?? "unknown"),
    action: "view_details",
    section: `legacy:${eventType}`,
  })

  void sessionId
}
