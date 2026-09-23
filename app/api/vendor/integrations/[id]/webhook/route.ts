import { NextResponse } from 'next/server'

export async function POST() { return NextResponse.json({ error: 'Webhook verification contract is not configured. No payload was accepted.', code: 'WEBHOOK_CONTRACT_NOT_CONFIGURED', retriable: false }, { status: 501 }) }