import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_ROLES, type AdminRole } from '@/lib/admin/authorization'
import { assignAdminRole, assignVendorRole, removeAdminRole, VENDOR_USER_ROLES, type VendorUserRole } from '@/lib/admin/user-management'

export async function POST(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params
    const body = await request.json() as { type?: 'admin' | 'vendor'; role?: string; action?: 'assign' | 'remove' }
    if (body.type === 'vendor') {
      if (!body.role || !VENDOR_USER_ROLES.includes(body.role as VendorUserRole)) return NextResponse.json({ error: 'Unknown vendor role.' }, { status: 400 })
      return NextResponse.json(await assignVendorRole(userId, body.role as VendorUserRole))
    }
    if (!body.role || !ADMIN_ROLES.includes(body.role as AdminRole)) return NextResponse.json({ error: 'Unknown admin role.' }, { status: 400 })
    if (body.action === 'remove') return NextResponse.json(await removeAdminRole(userId, body.role as AdminRole))
    return NextResponse.json(await assignAdminRole(userId, body.role as AdminRole))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'SUPER_ADMIN_REQUIRED') return NextResponse.json({ error: 'Super Admin permission is required for Admin role changes.' }, { status: 403 })
    return NextResponse.json({ error: 'Unable to change user role.' }, { status: 500 })
  }
}
