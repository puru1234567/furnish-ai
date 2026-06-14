import { NextRequest } from "next/server"
import type { AnalyticsEventName, AnalyticsEventPayloadMap } from "./events"

interface ServerTrackArgs<TName extends AnalyticsEventName> {
  request: NextRequest
  eventName: TName
  payload: AnalyticsEventPayloadMap[TName]
}

export async function trackServerEvent<TName extends AnalyticsEventName>({
  request,
  eventName,
  payload,
}: ServerTrackArgs<TName>): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
    await fetch(`${baseUrl}/api/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analytics-source": "server",
      },
      body: JSON.stringify({
        events: [
          {
            eventName,
            payload,
            sessionId: request.headers.get("x-session-id") ?? "server-session",
            timestamp: new Date().toISOString(),
            pagePath: request.nextUrl.pathname,
            userId: request.headers.get("x-user-id"),
          },
        ],
      }),
      cache: "no-store",
    })
  } catch {
    // Best effort only.
  }
}
