import { NextRequest, NextResponse } from 'next/server'
import { inviteVendor, listAdminVendors } from '@/lib/admin/vendors'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    return NextResponse.json(await listAdminVendors({ search: params.get('search') ?? undefined, status: params.get('status') ?? undefined, sort: (params.get('sort') as 'updated_desc' | 'name_asc' | 'status_asc' | null) ?? undefined, page: Number(params.get('page') ?? 1), pageSize: Number(params.get('pageSize') ?? 20) }))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'ADMIN_DATA_NOT_CONFIGURED') return NextResponse.json({ error: 'Admin data access is not configured.' }, { status: 503 })
    return NextResponse.json({ error: 'Unable to load vendors.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(await inviteVendor(await request.json()), { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'INVALID_INVITATION') return NextResponse.json({ error: 'Email and company name are required.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to invite vendor.' }, { status: 500 })
  }
}
