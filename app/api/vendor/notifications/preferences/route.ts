import { NextRequest, NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import type { NotificationPreferences } from '@/lib/vendor/notifications'

const DEFAULTS: NotificationPreferences = { productUpdates: true, importUpdates: true, listingUpdates: true, announcements: true, inventoryAlerts: true, documentAlerts: true }

function toPreferences(row: Record<string, unknown> | null): NotificationPreferences {
  if (!row) return DEFAULTS
  return { productUpdates: Boolean(row.product_updates), importUpdates: Boolean(row.import_updates), listingUpdates: Boolean(row.listing_updates), announcements: Boolean(row.announcements), inventoryAlerts: Boolean(row.inventory_alerts), documentAlerts: Boolean(row.document_alerts) }
}

export async function GET() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('vendor_notification_preferences').select('*').eq('vendor_id', auth.user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load notification preferences.' }, { status: 500 })
  return NextResponse.json(toPreferences(data))
}

export async function PUT(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const preferences = (await request.json()) as NotificationPreferences
  const { error } = await auth.supabase.from('vendor_notification_preferences').upsert({
    vendor_id: auth.user.id, product_updates: preferences.productUpdates, import_updates: preferences.importUpdates,
    listing_updates: preferences.listingUpdates, announcements: preferences.announcements, inventory_alerts: preferences.inventoryAlerts,
    document_alerts: preferences.documentAlerts, updated_at: new Date().toISOString(),
  }, { onConflict: 'vendor_id' })
  if (error) return NextResponse.json({ error: 'Unable to save notification preferences.' }, { status: 500 })
  return NextResponse.json(preferences)
}
