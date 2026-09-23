import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import type { VendorNotification } from '@/lib/vendor/notifications'

export async function GET() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('vendor_notifications').select('id, vendor_id, type, title, body, action_label, action_href, created_at, read_at').eq('vendor_id', auth.user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 })
  const notifications: VendorNotification[] = (data ?? []).map((row) => ({ id: row.id, vendorId: row.vendor_id, type: row.type, title: row.title, body: row.body, createdAt: row.created_at, readAt: row.read_at, actionLabel: row.action_label, actionHref: row.action_href }))
  return NextResponse.json(notifications)
}
