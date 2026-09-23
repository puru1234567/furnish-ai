import { NextResponse } from 'next/server'
import { errorReport } from '@/lib/admin/imports'

export async function GET(_request: Request, context: { params: Promise<{ importId: string }> }) { try { const { importId } = await context.params; const report = await errorReport(importId); return new NextResponse(report, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="import-${importId}-errors.csv"` } }) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ error: 'Unable to download error report.' }, { status: 500 }) } }
