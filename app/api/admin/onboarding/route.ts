import { NextRequest, NextResponse } from 'next/server'
import { listPendingOnboarding } from '@/lib/admin/onboarding'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    return NextResponse.json(await listPendingOnboarding({ search: params.get('search') ?? undefined, status: params.get('status') ?? undefined, page: Number(params.get('page') ?? 1), pageSize: Number(params.get('pageSize') ?? 20) }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load onboarding records.' }, { status: 500 })
  }
}
