import { NextResponse } from 'next/server'
import { getIntegrationHealth } from '@/lib/admin/integrations'

export async function GET() {
  try {
    return NextResponse.json(await getIntegrationHealth())
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Unable to load integration health.' }, { status: 500 })
  }
}
