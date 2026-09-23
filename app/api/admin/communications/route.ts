import { NextRequest, NextResponse } from 'next/server'
import { createCommunication } from '@/lib/admin/communications'

export async function POST(request: NextRequest) { try { return NextResponse.json(await createCommunication(await request.json()), { status: 201 }) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); if (error instanceof Error && (error.message === 'COMMUNICATION_REQUIRED' || error.message === 'VENDOR_REQUIRED')) return NextResponse.json({ error: 'Audience, title, and body are required.' }, { status: 400 }); return NextResponse.json({ error: 'Unable to send communication.' }, { status: 500 }) } }
