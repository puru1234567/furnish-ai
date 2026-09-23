import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'

export async function GET() {
	const auth = await requireVendor(); if ('response' in auth) return auth.response
	const { data, error } = await auth.supabase.from('vendor_integrations').select('*').eq('vendor_id', auth.user.id).order('updated_at', { ascending: false })
	if (error) return NextResponse.json({ error: 'Unable to load integrations.' }, { status: 500 })
	return NextResponse.json({ integrations: (data ?? []).map(mapIntegration) })
}

function mapIntegration(row: Record<string, unknown>) { return { id: row.id, vendorId: row.vendor_id, displayName: row.display_name, providerKey: row.provider_key, status: row.status, direction: row.direction, domains: row.domains ?? [], lastSyncAt: row.last_sync_at, nextSyncAt: row.next_sync_at, lastError: row.last_error, createdAt: row.created_at, updatedAt: row.updated_at } }

export async function POST() { return NextResponse.json({ error: 'No vendor authentication or provider payload contract is configured yet.', code: 'INTEGRATION_CONTRACT_NOT_CONFIGURED', retriable: false }, { status: 501 }) }