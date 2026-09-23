import { NextRequest, NextResponse } from 'next/server'
import { listConfiguration } from '@/lib/admin/catalog-configuration'

export async function GET() { try { return NextResponse.json(await listConfiguration()) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ error: 'Unable to load catalog configuration.' }, { status: 500 }) } }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { entity?: 'category' | 'attribute' | 'requirement'; data?: Record<string, unknown> }
    const { createCategory, createAttribute, createRequirement } = await import('@/lib/admin/catalog-configuration')
    if (!body.data) throw new Error('INVALID_CONFIGURATION')
    if (body.entity === 'category') return NextResponse.json(await createCategory(body.data as never), { status: 201 })
    if (body.entity === 'attribute') return NextResponse.json(await createAttribute(body.data as never), { status: 201 })
    if (body.entity === 'requirement') return NextResponse.json(await createRequirement(body.data as never), { status: 201 })
    throw new Error('INVALID_CONFIGURATION')
  } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); if (error instanceof Error && error.message.startsWith('INVALID_')) return NextResponse.json({ error: 'Required configuration fields are missing.' }, { status: 400 }); return NextResponse.json({ error: 'Unable to create configuration.' }, { status: 500 })
  }
}
