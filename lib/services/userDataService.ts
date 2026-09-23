import { createClient } from '@/lib/supabase/client'
import type { SavedResult, SavedSearch, UserPreferences } from '@/lib/types'

// ── SESSION ──────────────────────────────────────
export async function createSearchSession(
  userId: string,
  context: {
    furniture_category: string
    room_type: string
    budget_min: number
    budget_max: number
    budget_flexibility: string
    city: string
    must_have_features: string[]
    avoided_materials: string[]
    style_preference: string
    who_uses: string[]
    additional_notes?: string
  }
): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('search_sessions')
      .insert({
        user_id: userId,
        ...context,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[userDataService] createSearchSession failed:', error)
      return null
    }

    return data?.id ?? null
  } catch (error) {
    console.error('[userDataService] createSearchSession failed:', error)
    return null
  }
}

export async function updateSessionResultCount(
  sessionId: string,
  count: number
): Promise<void> {
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidLike.test(sessionId)) {
    console.warn('[userDataService] updateSessionResultCount skipped: invalid sessionId', { sessionId })
    return
  }

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      // Non-critical analytics update; skip quietly if auth context is unavailable.
      return
    }

    const { error } = await supabase
      .from('search_sessions')
      .update({ result_count: count })
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) {
      // Keep this non-fatal to avoid noisy red console overlays in dev.
      console.warn('[userDataService] updateSessionResultCount skipped:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        sessionId,
        count,
      })
    }
  } catch (error) {
    // Non-critical: avoid surfacing as a blocking runtime error in the UI.
    console.warn('[userDataService] updateSessionResultCount skipped:', error)
  }
}

// ── ROOM ANALYSIS ─────────────────────────────────
export async function saveRoomAnalysis(
  userId: string,
  sessionId: string,
  analysis: {
    wall_color?: string
    floor_type?: string
    room_style?: string
    room_density?: string
    natural_light?: string
    layout_type?: string
    width_cm?: number
    depth_cm?: number
    raw_analysis: Record<string, unknown>
  }
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('room_analyses')
      .insert({
        user_id: userId,
        session_id: sessionId,
        ...analysis,
      })

    if (error) {
      console.error('[userDataService] saveRoomAnalysis failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] saveRoomAnalysis failed:', error)
  }
}

// ── SAVED RESULTS ─────────────────────────────────
export async function saveResult(
  userId: string,
  sessionId: string | null,
  item: {
    product_id: string
    product_name: string
    product_price: number
    product_brand: string
    why_it_fits: string
    product_url?: string
  }
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('saved_results')
      .upsert(
        {
          user_id: userId,
          session_id: sessionId,
          ...item,
        },
        { onConflict: 'user_id,product_id' }
      )

    if (error) {
      console.error('[userDataService] saveResult failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] saveResult failed:', error)
  }
}

export async function unsaveResult(
  userId: string,
  productId: string
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('saved_results')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)

    if (error) {
      console.error('[userDataService] unsaveResult failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] unsaveResult failed:', error)
  }
}

export async function getSavedResults(
  userId: string
): Promise<SavedResult[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('saved_results')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('[userDataService] getSavedResults failed:', error)
      return []
    }

    return (data ?? []) as SavedResult[]
  } catch (error) {
    console.error('[userDataService] getSavedResults failed:', error)
    return []
  }
}

export async function isSaved(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('saved_results')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle()

    if (error) {
      console.error('[userDataService] isSaved failed:', error)
      return false
    }

    return Boolean(data)
  } catch (error) {
    console.error('[userDataService] isSaved failed:', error)
    return false
  }
}

// ── SAVED SEARCHES ───────────────────────────────
export async function saveSearch(
  userId: string,
  payload: {
    session_id: string | null
    furniture_type?: string
    room_type?: string
    city?: string
    budget?: number
    budget_max?: number
    result_count: number
    summary?: string
    context_insights?: string[]
    form_snapshot: Record<string, unknown>
    results_snapshot: Array<Record<string, unknown>>
  }
): Promise<{ id: string | null; reason?: 'table_missing' | 'forbidden' | 'not_authenticated' | 'unknown'; message?: string; code?: string }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return { id: null, reason: 'not_authenticated' }
    }

    if (user.id !== userId) {
      return { id: null, reason: 'forbidden', message: 'User mismatch for save operation.' }
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        ...payload,
      })
      .select('id')
      .single()

    if (error) {
      const code = error.code ?? ''
      const message = (error.message ?? '').toLowerCase()

      // Postgres missing table + PostgREST schema-cache missing table codes/messages.
      if (code === '42P01' || code === 'PGRST205' || message.includes('saved_searches') || message.includes('schema cache')) {
        console.warn('[userDataService] saveSearch skipped: saved_searches table is missing')
        return { id: null, reason: 'table_missing', message: error.message, code }
      }

      // RLS / JWT / permission errors.
      if (code === '42501' || code === 'PGRST301' || message.includes('permission') || message.includes('jwt')) {
        console.warn('[userDataService] saveSearch skipped: permission denied')
        return { id: null, reason: 'forbidden', message: error.message, code }
      }

      console.warn('[userDataService] saveSearch skipped:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return { id: null, reason: 'unknown', message: error.message, code }
    }

    return { id: data?.id ?? null }
  } catch (error) {
    console.warn('[userDataService] saveSearch skipped:', error)
    return { id: null, reason: 'unknown' }
  }
}

export async function getSavedSearches(
  userId: string,
  limit: number = 5
): Promise<SavedSearch[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[userDataService] getSavedSearches failed:', error)
      return []
    }

    return (data ?? []) as SavedSearch[]
  } catch (error) {
    console.error('[userDataService] getSavedSearches failed:', error)
    return []
  }
}

// ── REJECTIONS ────────────────────────────────────
export async function rejectItem(
  userId: string,
  sessionId: string | null,
  productId: string,
  reason?: string
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('rejection_history')
      .upsert(
        {
          user_id: userId,
          session_id: sessionId,
          product_id: productId,
          rejection_reason: reason,
        },
        { onConflict: 'user_id,product_id' }
      )

    if (error) {
      console.error('[userDataService] rejectItem failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] rejectItem failed:', error)
  }
}

export async function getRejectedIds(
  userId: string
): Promise<string[]> {
  try {
    const supabase = createClient()
    const cutoffIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString()
    const { data, error } = await supabase
      .from('rejection_history')
      .select('product_id,rejected_at')
      .eq('user_id', userId)
      .gte('rejected_at', cutoffIso)
      .order('rejected_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[userDataService] getRejectedIds failed:', error)
      return []
    }

    return [...new Set((data ?? []).map(row => row.product_id))]
  } catch (error) {
    console.error('[userDataService] getRejectedIds failed:', error)
    return []
  }
}

// ── PREFERENCES ───────────────────────────────────
export async function upsertPreferences(
  userId: string,
  prefs: {
    preferred_city?: string
    typical_budget_min?: number
    typical_budget_max?: number
    preferred_styles?: string[]
    preferred_categories?: string[]
    avoided_materials?: string[]
  }
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          ...prefs,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[userDataService] upsertPreferences failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] upsertPreferences failed:', error)
  }
}

export async function getPreferences(
  userId: string
): Promise<UserPreferences | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[userDataService] getPreferences failed:', error)
      return null
    }

    return (data as UserPreferences | null) ?? null
  } catch (error) {
    console.error('[userDataService] getPreferences failed:', error)
    return null
  }
}

// ── PASSIVE SIGNALS ───────────────────────────────
export async function savePassiveSignals(
  userId: string,
  sessionId: string,
  signals: {
    device_type: string
    time_of_day: string
    referrer_source: string
    is_return_visitor: boolean
    city_from_timezone: string
  }
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('passive_signals')
      .insert({
        user_id: userId,
        session_id: sessionId,
        ...signals,
      })

    if (error) {
      console.error('[userDataService] savePassiveSignals failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] savePassiveSignals failed:', error)
  }
}

// ── PRODUCT CLICKS ────────────────────────────────
export async function trackProductClick(
  userId: string,
  sessionId: string | null,
  click: {
    product_id: string
    product_name: string
    rank_position: number
    price: number
  }
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('product_clicks')
      .insert({
        user_id: userId,
        session_id: sessionId,
        ...click,
      })

    if (error) {
      console.error('[userDataService] trackProductClick failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] trackProductClick failed:', error)
  }
}
