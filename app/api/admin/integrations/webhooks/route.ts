import { NextRequest, NextResponse } from 'next/server'
import { listWebhookEvents } from '@/lib/admin/integrations'

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    return NextResponse.json(await listWebhookEvents({ integrationId: p.get('integrationId') ?? undefined, page: Number(p.get('page') ?? 1), pageSize: Number(p.get('pageSize') ?? 20) }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Unable to load webhook events.' }, { status: 500 })
  }
}
