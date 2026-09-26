import { NextRequest, NextResponse } from 'next/server'
import { listAdminProducts } from '@/lib/admin/catalog'

function optionalNumber(value: string | null) {
  if (!value?.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await listAdminProducts({ search: p.get('search') ?? undefined, sku: p.get('sku') ?? undefined, vendorId: p.get('vendorId') ?? undefined, category: p.get('category') ?? undefined, status: p.get('status') ?? undefined, createdFrom: p.get('createdFrom') ?? undefined, createdTo: p.get('createdTo') ?? undefined, minPrice: optionalNumber(p.get('minPrice')), maxPrice: optionalNumber(p.get('maxPrice')), sort: (p.get('sort') as 'updated_desc' | 'created_desc' | 'price_asc' | 'price_desc' | 'name_asc' | null) ?? undefined, page: Number(p.get('page') ?? 1), pageSize: Number(p.get('pageSize') ?? 20) }))
  } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 }); return NextResponse.json({ error: 'Unable to load catalog.' }, { status: 500 }) }
}
