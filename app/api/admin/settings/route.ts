import { NextResponse } from 'next/server'
import { listSettings } from '@/lib/admin/settings'

export async function GET() {
  try {
    return NextResponse.json(await listSettings())
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load settings.' }, { status: 500 })
  }
}
