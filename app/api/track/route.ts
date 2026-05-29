// app/api/track/route.ts
// Analytics ingestion endpoint for session events.
// Always returns 200 — tracking must never surface errors to the client.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const OK = () => NextResponse.json({ ok: true }, { status: 200 })

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

    const adminSupabase = createTrackingClient()
    const supabase = adminSupabase ?? await createClient()

    const { error } = await supabase.from('session_events').insert({
      session_id: sessionId.trim(),
      event_type: eventType.trim(),
      payload: payload ?? null,
    })

    if (error) {
      // Tracking is best-effort; avoid noisy logs for expected RLS misses.
      if (error.code !== '42501') {
        console.error('[track] insert error:', error.message)
      }
    }
  } catch (err) {
    console.error('[track] unexpected error:', err)
  }

  // Always 200
  return OK()
}
