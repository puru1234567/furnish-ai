import { NextRequest, NextResponse } from 'next/server'
import { exportAuditEvents, type AuditSeverity } from '@/lib/admin/audit'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    const csv = await exportAuditEvents({
      actorId: p.get('actorId') ?? undefined,
      vendorId: p.get('vendorId') ?? undefined,
      action: p.get('action') ?? undefined,
      entityType: p.get('entityType') ?? undefined,
      dateFrom: p.get('dateFrom') ?? undefined,
      dateTo: p.get('dateTo') ?? undefined,
      severity: (p.get('severity') as AuditSeverity | null) ?? undefined,
    })
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="admin-audit-log.csv"' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'INVALID_VENDOR_ID') return NextResponse.json({ error: 'Vendor ID must be a valid UUID.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to export audit log.' }, { status: 500 })
  }
}
