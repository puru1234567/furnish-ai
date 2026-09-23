import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCatalogConfiguration } from '@/lib/admin/catalog-configuration'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await getCatalogConfiguration()) }
  catch { return NextResponse.json({ error: 'Catalog configuration is unavailable.' }, { status: 503 }) }
}
