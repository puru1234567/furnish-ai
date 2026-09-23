import { NextRequest, NextResponse } from 'next/server'
import { listSyncRuns } from '@/lib/admin/integrations'

export async function GET(request: NextRequest, context: { params: Promise<{ integrationId: string }> }) {
  try {
    const { integrationId } = await context.params
    const p = request.nextUrl.searchParams
    return NextResponse.json(await listSyncRuns(integrationId, Number(p.get('page') ?? 1), Number(p.get('pageSize') ?? 20)))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Unable to load sync runs.' }, { status: 500 })
  }
}
