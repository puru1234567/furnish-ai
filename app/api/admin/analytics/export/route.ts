import { NextRequest, NextResponse } from 'next/server'
import { exportAnalytics } from '@/lib/admin/analytics'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    const dataset = p.get('dataset') === 'products' ? 'products' : p.get('dataset') === 'operations' ? 'operations' : 'vendors'
    const csv = await exportAnalytics(dataset, { dateFrom: p.get('dateFrom') ?? undefined, dateTo: p.get('dateTo') ?? undefined, vendorId: p.get('vendorId') ?? undefined, category: p.get('category') ?? undefined })
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="admin-analytics-${dataset}.csv"` } })
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Unable to export analytics.' }, { status: 500 })
  }
}
