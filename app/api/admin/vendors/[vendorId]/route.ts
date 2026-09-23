import { NextResponse } from 'next/server'
import { getAdminVendor } from '@/lib/admin/vendors'

export async function GET(_request: Request, context: { params: Promise<{ vendorId: string }> }) {
  try {
    const { vendorId } = await context.params
    return NextResponse.json(await getAdminVendor(vendorId))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'VENDOR_NOT_FOUND') return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to load vendor.' }, { status: 500 })
  }
}
