import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const { error } = await auth.supabase.from('vendor_notifications').update({ read_at: new Date().toISOString() }).eq('vendor_id', auth.user.id).eq('id', id)
  if (error) return NextResponse.json({ error: 'Unable to mark notification as read.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
