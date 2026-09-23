import { NextRequest, NextResponse } from 'next/server'
import { changeOnboardingStatus } from '@/lib/admin/onboarding'

export async function POST(request: NextRequest, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const { vendorId } = await context.params
    const body = await request.json() as { action?: 'approve' | 'reject' | 'request_documents'; comment?: string }
    return NextResponse.json(await changeOnboardingStatus(vendorId, body.action ?? 'request_documents', body.comment))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ONBOARDING_REASON_REQUIRED') return NextResponse.json({ error: 'A reason is required to reject onboarding.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to change onboarding status.' }, { status: 500 })
  }
}
