import { NextRequest, NextResponse } from 'next/server'
import { changeVendorStatus } from '@/lib/admin/vendors'

export async function POST(request: NextRequest, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const { vendorId } = await context.params
    const body = await request.json() as { status?: string; reason?: string }
    return NextResponse.json(await changeVendorStatus(vendorId, body.status ?? '', body.reason))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'INVALID_VENDOR_STATUS') return NextResponse.json({ error: 'Unsupported vendor status.' }, { status: 400 })
    if (error instanceof Error && error.message === 'REASON_REQUIRED') return NextResponse.json({ error: 'A reason is required to suspend or reject a vendor.' }, { status: 400 })
    if (error instanceof Error && error.message === 'VENDOR_NOT_FOUND') return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    if (error instanceof Error && error.message === 'NOT_A_VENDOR') return NextResponse.json({ error: 'This account is not a vendor.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to change vendor status.' }, { status: 500 })
  }
}
