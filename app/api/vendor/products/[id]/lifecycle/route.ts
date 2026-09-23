import { NextRequest, NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import type { ListingLifecycleAction, ListingLifecycleStatus } from '@/lib/vendor/catalog'
import { fetchProduct } from '../../shared'

const NEXT_STATUS: Record<ListingLifecycleAction, ListingLifecycleStatus> = {
  activate: 'active', deactivate: 'inactive', discontinue: 'discontinued', archive: 'archived', request_removal: 'removal_requested', restore: 'inactive',
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const { action } = (await request.json()) as { action: ListingLifecycleAction }
  const { data: existing, error: lookupError } = await auth.supabase.from('vendor_products').select('status, lifecycle_status').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Unable to load product.' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
  if (existing.status !== 'approved' && action !== 'restore') return NextResponse.json({ error: 'Only approved listings can be changed through the lifecycle workflow.' }, { status: 409 })
  if (action === 'restore' && existing.lifecycle_status !== 'archived') return NextResponse.json({ error: 'Only archived listings can be restored.' }, { status: 409 })

  const lifecycleStatus = NEXT_STATUS[action]
  const service = vendorServiceClient()
  const { error } = await service.from('vendor_products').update({
    lifecycle_status: lifecycleStatus, is_active: lifecycleStatus === 'active', archived_at: lifecycleStatus === 'archived' ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
  }).eq('id', id).eq('vendor_id', auth.user.id)
  if (error) return NextResponse.json({ error: 'Unable to update listing lifecycle.' }, { status: 500 })
  const { error: activityError } = await service.from('vendor_product_activity').insert({ product_id: id, action, from_status: existing.lifecycle_status, to_status: lifecycleStatus, created_by: auth.user.id })
  if (activityError) return NextResponse.json({ error: 'Listing changed but its activity history could not be saved.' }, { status: 500 })

  const product = await fetchProduct(auth.supabase, auth.user.id, id)
  if (!product) return NextResponse.json({ error: 'Product updated but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(product)
}
