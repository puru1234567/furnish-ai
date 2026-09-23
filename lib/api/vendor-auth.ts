import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/roles'

export interface VendorSession { user: User; supabase: SupabaseClient }

/** Derives the acting vendor from the server session; never trust a vendorId passed by the client. */
export async function requireVendor(): Promise<VendorSession | { response: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  const role = getUserRole(user)
  if (role !== 'vendor' && role !== 'admin') return { response: NextResponse.json({ error: 'Vendor access required' }, { status: 403 }) }
  return { user, supabase }
}

/**
 * Service-role client for the small set of vendor writes that only have SELECT
 * RLS policies today (vendor_product_approval_events, vendor_product_activity,
 * vendor_catalog_import_errors, and vendor_catalog_imports updates - see the
 * TODO comments in lib/db/vendor-catalog-schema.sql and vendor-import-schema.sql).
 * Every call site must still filter by the vendorId derived from requireVendor().
 */
export function vendorServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('VENDOR_SERVICE_ROLE_NOT_CONFIGURED')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

