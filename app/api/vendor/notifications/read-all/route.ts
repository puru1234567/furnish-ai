import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'

export async function POST() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { error } = await auth.supabase.from('vendor_notifications').update({ read_at: new Date().toISOString() }).eq('vendor_id', auth.user.id).is('read_at', null)
  if (error) return NextResponse.json({ error: 'Unable to mark notifications as read.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
