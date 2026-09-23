import { NextRequest, NextResponse } from 'next/server'
import { getOperationalAnalytics } from '@/lib/admin/analytics'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await getOperationalAnalytics({ dateFrom: p.get('dateFrom') ?? undefined, dateTo: p.get('dateTo') ?? undefined }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load operational analytics.' }, { status: 500 })
  }
}
