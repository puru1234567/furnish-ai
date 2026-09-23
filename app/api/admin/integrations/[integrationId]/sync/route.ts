import { NextRequest, NextResponse } from 'next/server'
import { triggerSync } from '@/lib/admin/integrations'
import type { SyncDomain } from '@/lib/vendor/integrations'
import { rateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest, context: { params: Promise<{ integrationId: string }> }) {
  const limited = rateLimit(request, 'admin-integration-sync', 10, 60_000)
  if (limited) return NextResponse.json({ error: 'Too many synchronization requests. Try again later.' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } })
  try {
    const { integrationId } = await context.params
    const body = await request.json() as { domains?: SyncDomain[] }
    return NextResponse.json(await triggerSync(integrationId, body.domains?.length ? body.domains : ['products', 'inventory', 'pricing']))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'INTEGRATION_NOT_FOUND') return NextResponse.json({ error: 'Integration not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'INTEGRATION_DISABLED') return NextResponse.json({ error: 'This integration is disabled by an administrator.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to trigger synchronization.' }, { status: 500 })
  }
}
