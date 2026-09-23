import { NextRequest, NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import type { ImportStatus } from '@/lib/vendor/imports'
import { mapImport } from '../shared'

const IMPORT_SELECT = '*, vendor_catalog_import_errors(*)'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const body = (await request.json()) as { status: ImportStatus; successfulRecords?: number; failedRecords?: number }

  const service = vendorServiceClient()
  const { data: existing } = await service.from('vendor_catalog_imports').select('id, valid_rows, status').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Import not found.' }, { status: 404 })

  if (existing.status === 'completed' || existing.status === 'completed_with_errors') return NextResponse.json({ error: 'This import has already been completed.' }, { status: 409 })

  let successfulRecords = 0
  for (const row of (existing.valid_rows ?? [])) {
    const { error: productError } = await service.from('vendor_products').insert({
      vendor_id: auth.user.id, name: row.name, sku: row.sku, category: row.category,
      description: row.description, price: Number(row.price), stock: Number(row.stock),
      status: 'draft', is_active: false, lifecycle_status: 'inactive',
    })
    if (!productError) successfulRecords += 1
  }

  const { error } = await service.from('vendor_catalog_imports').update({
    status: successfulRecords === (existing.valid_rows ?? []).length ? 'completed' : 'completed_with_errors',
    successful_records: successfulRecords, failed_records: (existing.valid_rows ?? []).length - successfulRecords,
    completed_at: new Date().toISOString(),
  }).eq('id', id).eq('vendor_id', auth.user.id)
  if (error) return NextResponse.json({ error: 'Unable to update import record.' }, { status: 500 })

  const updated = await service.from('vendor_catalog_imports').select(IMPORT_SELECT).eq('id', id).single()
  if (updated.error || !updated.data) return NextResponse.json({ error: 'Import updated but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(mapImport(updated.data))
}
