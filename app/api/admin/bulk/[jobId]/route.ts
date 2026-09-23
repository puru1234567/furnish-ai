import { NextResponse } from 'next/server'
import { getBulkJob } from '@/lib/admin/bulk-operations'

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) { try { const { jobId } = await context.params; return NextResponse.json(await getBulkJob(jobId)) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); if (error instanceof Error && error.message === 'JOB_NOT_FOUND') return NextResponse.json({ error: 'Bulk job not found.' }, { status: 404 }); return NextResponse.json({ error: 'Unable to load bulk job.' }, { status: 500 }) } }
