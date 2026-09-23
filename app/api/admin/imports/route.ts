import { NextRequest, NextResponse } from 'next/server'
import { listImports } from '@/lib/admin/imports'

export async function GET(request: NextRequest) { try { const p = request.nextUrl.searchParams; return NextResponse.json(await listImports(Number(p.get('page') ?? 1), Number(p.get('pageSize') ?? 20))) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ error: 'Unable to load imports.' }, { status: 500 }) } }
