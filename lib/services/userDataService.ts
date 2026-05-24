import { createClient } from '@/lib/supabase/client'
import type { SavedResult, UserPreferences } from '@/lib/types'

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
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('search_sessions')
      .update({ result_count: count })
      .eq('id', sessionId)

    if (error) {
      console.error('[userDataService] updateSessionResultCount failed:', error)
    }
  } catch (error) {
    console.error('[userDataService] updateSessionResultCount failed:', error)
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
  sessionId: string,
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

// ── REJECTIONS ────────────────────────────────────
export async function rejectItem(
  userId: string,
  sessionId: string,
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
          reason,
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
  sessionId: string,
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
