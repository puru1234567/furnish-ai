import type { ImportRecord, ImportRow, ImportStatus, ImportValidationError } from '@/lib/vendor/imports'

interface ImportErrorRow { row_number: number; column_name: string; error_code: string; message: string; value: string | null }
interface ImportRow_ {
  id: string; vendor_id: string; file_name: string; uploaded_by: string; status: ImportStatus
  total_records: number; successful_records: number; failed_records: number; uploaded_at: string
  valid_rows?: ImportRow[] | null
  vendor_catalog_import_errors?: ImportErrorRow[] | null
}

function mapError(row: ImportErrorRow): ImportValidationError { return { rowNumber: row.row_number, column: row.column_name, code: row.error_code, message: row.message, value: row.value ?? '' } }

export function mapImport(row: ImportRow_, validRows: ImportRow[] = []): ImportRecord {
  return {
    id: row.id, vendorId: row.vendor_id, fileName: row.file_name, uploadedAt: row.uploaded_at, uploadedBy: row.uploaded_by,
    totalRecords: row.total_records, successfulRecords: row.successful_records, failedRecords: row.failed_records,
    status: row.status, errors: (row.vendor_catalog_import_errors ?? []).map(mapError), validRows: validRows.length ? validRows : (row.valid_rows ?? []), createdProductIds: [],
  }
}
