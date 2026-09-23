import { NextResponse } from 'next/server'
import { getOnboardingDetail } from '@/lib/admin/onboarding'

export async function GET(_request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const { vendorId } = await context.params
    return NextResponse.json(await getOnboardingDetail(vendorId))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ONBOARDING_NOT_FOUND') return NextResponse.json({ error: 'Onboarding record not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to load onboarding record.' }, { status: 500 })
  }
}
