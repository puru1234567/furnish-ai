// app/api/track/route.ts
// Analytics ingestion endpoint for session events.
// Always returns 200 — tracking must never surface errors to the client.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OK = () => NextResponse.json({ ok: true }, { status: 200 })

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { sessionId, eventType, payload } = body ?? {}

    // Validate: sessionId and eventType must be non-empty strings
    if (
      typeof sessionId !== 'string' || sessionId.trim() === '' ||
      typeof eventType !== 'string' || eventType.trim() === ''
    ) {
      // Return 200 — even invalid requests must not error on the client
      return OK()
    }

    const supabase = await createClient()

    const { error } = await supabase.from('session_events').insert({
      session_id: sessionId.trim(),
      event_type: eventType.trim(),
      payload: payload ?? null,
    })

    if (error) {
      console.error('[track] insert error:', error.message)
    }
  } catch (err) {
    console.error('[track] unexpected error:', err)
  }

  // Always 200
  return OK()
}
