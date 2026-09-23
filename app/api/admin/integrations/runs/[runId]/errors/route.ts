import { NextResponse } from 'next/server'
import { listSyncErrors } from '@/lib/admin/integrations'

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params
    return NextResponse.json(await listSyncErrors(runId))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Unable to load sync errors.' }, { status: 500 })
  }
}
