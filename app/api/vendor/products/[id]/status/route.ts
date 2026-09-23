import { NextRequest, NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import type { ProductStatus } from '@/lib/vendor/catalog'
import { fetchProduct } from '../../shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const { status } = (await request.json()) as { status: ProductStatus }
  if (status !== 'submitted' && status !== 'resubmitted') return NextResponse.json({ error: 'Vendors can only submit products for review.' }, { status: 403 })
  const { data: existing, error: lookupError } = await auth.supabase.from('vendor_products').select('id').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Unable to load product.' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

  const update: Record<string, unknown> = { status, is_active: false, updated_at: new Date().toISOString() }
  const service = vendorServiceClient()
  const { error } = await service.from('vendor_products').update(update).eq('id', id).eq('vendor_id', auth.user.id)
  if (error) return NextResponse.json({ error: 'Unable to update product status.' }, { status: 500 })
  const { error: eventError } = await service.from('vendor_product_approval_events').insert({ product_id: id, status, changed_by: auth.user.id })
  if (eventError) return NextResponse.json({ error: 'Product status changed but its approval history could not be saved.' }, { status: 500 })

  const product = await fetchProduct(auth.supabase, auth.user.id, id)
  if (!product) return NextResponse.json({ error: 'Product updated but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(product)
}
