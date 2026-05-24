// lib/analytics/trackEvent.ts
// Fire-and-forget analytics event sender.
// Never throws — tracking must never break the app.

export async function trackEvent(
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, eventType, payload }),
    })
    if (!res.ok) {
      console.warn('[trackEvent] failed silently:', res.status)
    }
  } catch {
    // Never throw — tracking must never break the app
  }
}
