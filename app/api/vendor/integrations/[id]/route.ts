import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'

function mapIntegration(row: Record<string, unknown>) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    displayName: row.display_name,
    providerKey: row.provider_key,
    status: row.status,
    direction: row.direction,
    domains: row.domains ?? [],
    lastSyncAt: row.last_sync_at,
    nextSyncAt: row.next_sync_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const { data, error } = await auth.supabase.from('vendor_integrations').select('*').eq('id', id).eq('vendor_id', auth.user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load integration.' }, { status: 500 })
  if (!data) return NextResponse.json(null)
  return NextResponse.json(mapIntegration(data))
}
