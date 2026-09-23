import { NextRequest, NextResponse } from 'next/server'
import { requireVendor, vendorServiceClient } from '@/lib/api/vendor-auth'
import type { ImportRow, ImportStatus, ImportValidationError } from '@/lib/vendor/imports'
import { mapImport } from './shared'

const IMPORT_SELECT = '*, vendor_catalog_import_errors(*)'

export async function GET() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('vendor_catalog_imports').select(IMPORT_SELECT).eq('vendor_id', auth.user.id).order('uploaded_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load import history.' }, { status: 500 })
  return NextResponse.json((data ?? []).map((row) => mapImport(row)))
}

export async function POST(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const body = (await request.json()) as { fileName: string; totalRecords: number; successfulRecords: number; failedRecords: number; status: ImportStatus; errors: ImportValidationError[]; validRows: ImportRow[] }

  const service = vendorServiceClient()
  const { data: record, error } = await service.from('vendor_catalog_imports').insert({
    vendor_id: auth.user.id, file_name: body.fileName, uploaded_by: auth.user.id, status: body.status,
    total_records: body.totalRecords, successful_records: body.successfulRecords, failed_records: body.failedRecords, valid_rows: body.validRows,
  }).select('id').single()
  if (error || !record) return NextResponse.json({ error: 'Unable to create import record.' }, { status: 500 })

  if (body.errors.length) await service.from('vendor_catalog_import_errors').insert(body.errors.map((item) => ({ import_id: record.id, row_number: item.rowNumber, column_name: item.column, error_code: item.code, message: item.message, value: item.value })))

  const created = await auth.supabase.from('vendor_catalog_imports').select(IMPORT_SELECT).eq('id', record.id).single()
  if (created.error || !created.data) return NextResponse.json({ error: 'Import created but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(mapImport(created.data, body.validRows))
}
