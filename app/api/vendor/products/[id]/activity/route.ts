import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import { mapActivity } from '../../shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const { data: product } = await auth.supabase.from('vendor_products').select('id').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
  const { data, error } = await auth.supabase.from('vendor_product_activity').select('id, product_id, action, from_status, to_status, note, created_at, created_by').eq('product_id', id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load listing activity.' }, { status: 500 })
  return NextResponse.json(mapActivity(data ?? []))
}
