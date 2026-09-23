import { NextResponse } from 'next/server'
import { getAdminDashboard } from '@/lib/admin/dashboard'

export async function GET() {
  try {
    return NextResponse.json(await getAdminDashboard())
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unable to load the admin dashboard.' }, { status: 500 })
  }
}
