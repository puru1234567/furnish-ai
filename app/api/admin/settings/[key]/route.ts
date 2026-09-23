import { NextRequest, NextResponse } from 'next/server'
import { updateSetting } from '@/lib/admin/settings'

export async function PATCH(request: NextRequest, context: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await context.params
    const body = await request.json() as { value?: unknown; reason?: string }
    return NextResponse.json(await updateSetting(key, body.value, body.reason))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'UNKNOWN_SETTING_KEY') return NextResponse.json({ error: 'Unknown setting key.' }, { status: 400 })
    if (error instanceof Error && error.message === 'INVALID_SETTING_VALUE') return NextResponse.json({ error: 'Value does not match the expected type for this setting.' }, { status: 400 })
    if (error instanceof Error && error.message === 'SETTING_NOT_FOUND') return NextResponse.json({ error: 'Setting not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to update setting.' }, { status: 500 })
  }
}
