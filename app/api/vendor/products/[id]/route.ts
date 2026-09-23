import { NextRequest, NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import type { ProductInput } from '@/lib/vendor/catalog'
import { fetchProduct, replaceImagesAndVariants } from '../shared'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const product = await fetchProduct(auth.supabase, auth.user.id, id)
  return NextResponse.json(product)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const input = (await request.json()) as ProductInput
  const { data: existing, error: lookupError } = await auth.supabase.from('vendor_products').select('id, status').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Unable to load product.' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
  if (['under_review', 'submitted', 'resubmitted'].includes(existing.status)) return NextResponse.json({ error: 'This product is locked while it is in review.' }, { status: 409 })

  const wasApproved = existing.status === 'approved'
  const wasRejected = existing.status === 'rejected' || existing.status === 'vendor_fix_required'
  const update: Record<string, unknown> = {
    name: input.name, sku: input.sku, category: input.category, description: input.description, price: input.price, stock: input.stock,
    updated_at: new Date().toISOString(),
  }
  if (wasApproved) { update.status = 'submitted'; update.is_active = false; update.lifecycle_status = 'inactive' }
  else if (wasRejected) { update.status = 'draft'; update.rejection_reason = null }

  const service = vendorServiceClient()
  const { error } = await service.from('vendor_products').update(update).eq('id', id).eq('vendor_id', auth.user.id)
  if (error) return NextResponse.json({ error: 'Unable to update product.' }, { status: 500 })
  await replaceImagesAndVariants(service, id, input)
  const product = await fetchProduct(auth.supabase, auth.user.id, id)
  if (!product) return NextResponse.json({ error: 'Product updated but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(product)
}
