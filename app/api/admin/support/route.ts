import { NextRequest, NextResponse } from 'next/server'
import { listTickets } from '@/lib/admin/communications'

export async function GET(request: NextRequest) { try { const p = request.nextUrl.searchParams; return NextResponse.json(await listTickets({ vendorId: p.get('vendorId') ?? undefined, status: (p.get('status') as never) ?? undefined, priority: (p.get('priority') as never) ?? undefined, page: Number(p.get('page') ?? 1), pageSize: Number(p.get('pageSize') ?? 20) })) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ error: 'Unable to load support tickets.' }, { status: 500 }) } }
