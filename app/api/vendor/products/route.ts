import { NextRequest, NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import type { ProductInput, ProductListResult, ProductListQuery } from '@/lib/vendor/catalog'
import { PRODUCT_PAGE_SIZE } from '@/lib/vendor/catalog'
import { mapProduct, replaceImagesAndVariants } from './shared'

export async function GET(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const params = request.nextUrl.searchParams
  const query: ProductListQuery = {
    search: params.get('search') ?? undefined,
    status: (params.get('status') as ProductListQuery['status']) ?? undefined,
    category: params.get('category') ?? undefined,
    sort: (params.get('sort') as ProductListQuery['sort']) ?? 'updated_desc',
    page: Number(params.get('page') ?? 1),
    pageSize: Number(params.get('pageSize') ?? PRODUCT_PAGE_SIZE),
  }
  const pageSize = query.pageSize ?? PRODUCT_PAGE_SIZE
  const page = Math.max(1, query.page ?? 1)

  let request_ = auth.supabase.from('vendor_products').select('*, vendor_product_images(*), vendor_product_variants(*)', { count: 'exact' }).eq('vendor_id', auth.user.id)
  if (query.status && query.status !== 'all') request_ = request_.eq('status', query.status)
  if (query.category && query.category !== 'all') request_ = request_.eq('category', query.category)
  if (query.search?.trim()) { const search = query.search.trim().replaceAll(',', ''); request_ = request_.or(`name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`) }
  const order = query.sort === 'name_asc' ? ['name', true] as const : query.sort === 'price_asc' ? ['price', true] as const : query.sort === 'price_desc' ? ['price', false] as const : ['updated_at', false] as const
  request_ = request_.order(order[0], { ascending: order[1] }).range((page - 1) * pageSize, page * pageSize - 1)

  const { data, count, error } = await request_
  if (error) return NextResponse.json({ error: 'Unable to load catalog.' }, { status: 500 })
  const total = count ?? 0
  const result: ProductListResult = { items: (data ?? []).map(mapProduct), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const input = (await request.json()) as ProductInput
  const service = vendorServiceClient()
  const { data: product, error } = await service.from('vendor_products').insert({
    vendor_id: auth.user.id, name: input.name, sku: input.sku, category: input.category, description: input.description,
    price: input.price, stock: input.stock, status: 'draft', is_active: false, lifecycle_status: 'inactive',
  }).select('id').single()
  if (error || !product) return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 })
  await replaceImagesAndVariants(service, product.id, input)
  const created = await service.from('vendor_products').select('*, vendor_product_images(*), vendor_product_variants(*)').eq('id', product.id).eq('vendor_id', auth.user.id).single()
  if (created.error || !created.data) return NextResponse.json({ error: 'Product created but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(mapProduct(created.data))
}
