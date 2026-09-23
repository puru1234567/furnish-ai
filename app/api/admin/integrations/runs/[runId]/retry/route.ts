import { NextResponse } from 'next/server'
import { retrySync } from '@/lib/admin/integrations'

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params
    return NextResponse.json(await retrySync(runId))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'RUN_NOT_FOUND') return NextResponse.json({ error: 'Sync run not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'RUN_NOT_RETRYABLE') return NextResponse.json({ error: 'Only failed or partially failed runs can be retried.' }, { status: 400 })
    if (error instanceof Error && error.message === 'INTEGRATION_DISABLED') return NextResponse.json({ error: 'This integration is disabled by an administrator.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to retry synchronization.' }, { status: 500 })
  }
}
