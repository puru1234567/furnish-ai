import { NextRequest, NextResponse } from 'next/server'
import { addOnboardingComment } from '@/lib/admin/onboarding'

export async function POST(request: NextRequest, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const { vendorId } = await context.params
    const body = await request.json() as { comment?: string }
    return NextResponse.json(await addOnboardingComment(vendorId, body.comment ?? ''))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'COMMENT_REQUIRED') return NextResponse.json({ error: 'Comment is required.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to save comment.' }, { status: 500 })
  }
}
