import { NextRequest, NextResponse } from 'next/server'
import { getIntegration, setIntegrationEnabled } from '@/lib/admin/integrations'

export async function GET(_request: Request, context: { params: Promise<{ integrationId: string }> }) {
  try {
    const { integrationId } = await context.params
    return NextResponse.json(await getIntegration(integrationId))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'INTEGRATION_NOT_FOUND') return NextResponse.json({ error: 'Integration not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to load integration.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ integrationId: string }> }) {
  try {
    const { integrationId } = await context.params
    const body = await request.json() as { enabled?: boolean; reason?: string }
    return NextResponse.json(await setIntegrationEnabled(integrationId, body.enabled !== false, body.reason ?? ''))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'REASON_REQUIRED') return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })
    if (error instanceof Error && error.message === 'INTEGRATION_NOT_FOUND') return NextResponse.json({ error: 'Integration not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to update integration.' }, { status: 500 })
  }
}
