import { NextRequest, NextResponse } from 'next/server'
import { getProductAnalytics } from '@/lib/admin/analytics'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await getProductAnalytics({ dateFrom: p.get('dateFrom') ?? undefined, dateTo: p.get('dateTo') ?? undefined, vendorId: p.get('vendorId') ?? undefined, category: p.get('category') ?? undefined }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load product analytics.' }, { status: 500 })
  }
}
