// app/api/track/route.ts
// Analytics ingestion endpoint for session events.
// Always returns 200 — tracking must never surface errors to the client.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ANALYTICS_EVENT_NAMES } from '@/lib/analytics/events'

const OK = () => NextResponse.json({ ok: true }, { status: 200 })

function toErrorPreview(raw: string): string {
  const compact = raw.replace(/\s+/g, ' ').trim()
  return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact
}

function createTrackingClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (url && serviceRoleKey) {
    return createSupabaseClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return null
}

type RawEvent = {
  eventName?: unknown
  payload?: unknown
  sessionId?: unknown
  timestamp?: unknown
  pagePath?: unknown
  userId?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRawEvents(body: unknown): RawEvent[] {
  if (!isObject(body)) return []

  const maybeEvents = body.events
  if (Array.isArray(maybeEvents)) {
    return maybeEvents.filter(isObject)
  }

  // Backward compatibility with old shape: { sessionId, eventType, payload }
  if (
    typeof body.sessionId === 'string' &&
    typeof body.eventType === 'string'
  ) {
    return [{
      sessionId: body.sessionId,
      eventName: body.eventType,
      payload: body.payload,
      timestamp: new Date().toISOString(),
      pagePath: typeof body.pagePath === 'string' ? body.pagePath : null,
      userId: typeof body.userId === 'string' ? body.userId : null,
    }]
  }

  return []
}

function sanitizeEvent(event: RawEvent) {
  const sessionId = typeof event.sessionId === 'string' ? event.sessionId.trim() : ''
  const eventName = typeof event.eventName === 'string' ? event.eventName.trim() : ''

  if (!sessionId || !eventName) return null

  if (!ANALYTICS_EVENT_NAMES.has(eventName)) {
    return null
  }

  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString()
  const pagePath = typeof event.pagePath === 'string' ? event.pagePath : null
  const userId = typeof event.userId === 'string' ? event.userId : null
  const payload = isObject(event.payload) ? event.payload : {}

  return {
    session_id: sessionId,
    event_type: eventName,
    payload: {
      ...payload,
      meta: {
        timestamp,
        pagePath,
        userId,
      },
    },
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const rawEvents = normalizeRawEvents(body)
    const events = rawEvents
      .map(sanitizeEvent)
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (events.length === 0) {
      return OK()
    }

    const adminSupabase = createTrackingClient()
    const supabase = adminSupabase ?? await createClient()

    const { error } = await supabase.from('session_events').insert(events)

    if (error) {
      // Tracking is best-effort; avoid noisy logs for expected RLS misses.
      if (error.code !== '42501') {
        console.error('[track] insert error:', toErrorPreview(error.message))
      }
    }
  } catch (err) {
    console.error('[track] unexpected error:', err)
  }

  // Always 200
  return OK()
}
