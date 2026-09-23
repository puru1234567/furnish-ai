import { NextRequest, NextResponse } from 'next/server'
import { listIntegrations } from '@/lib/admin/integrations'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await listIntegrations({ vendorId: p.get('vendorId') ?? undefined, providerKey: p.get('providerKey') ?? undefined, status: p.get('status') ?? undefined, page: Number(p.get('page') ?? 1), pageSize: Number(p.get('pageSize') ?? 20) }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load integrations.' }, { status: 500 })
  }
}
