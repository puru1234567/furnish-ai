import { NextRequest, NextResponse } from 'next/server'
import { listAuditEvents, type AuditSeverity } from '@/lib/admin/audit'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await listAuditEvents({
      actorId: p.get('actorId') ?? undefined,
      vendorId: p.get('vendorId') ?? undefined,
      action: p.get('action') ?? undefined,
      entityType: p.get('entityType') ?? undefined,
      dateFrom: p.get('dateFrom') ?? undefined,
      dateTo: p.get('dateTo') ?? undefined,
      severity: (p.get('severity') as AuditSeverity | null) ?? undefined,
      page: Number(p.get('page') ?? 1),
      pageSize: Number(p.get('pageSize') ?? 25),
    }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'INVALID_VENDOR_ID') return NextResponse.json({ error: 'Vendor ID must be a valid UUID.' }, { status: 400 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load audit events.' }, { status: 500 })
  }
}
