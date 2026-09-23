import { NextRequest, NextResponse } from 'next/server'
import { bulkAdjustPrice } from '@/lib/admin/marketplace-controls'

export async function POST(request: NextRequest) { try { const body = await request.json() as { productIds?: string[]; price?: number; reason?: string }; return NextResponse.json(await bulkAdjustPrice(body.productIds ?? [], body.price ?? -1, body.reason ?? '')) } catch (error) { if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); return NextResponse.json({ error: 'Unable to apply bulk price update.' }, { status: 400 }) } }
