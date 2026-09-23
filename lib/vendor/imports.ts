import * as XLSX from 'xlsx'
import { PRODUCT_CATEGORIES, type ProductInput, type ProductVariant, vendorCatalogService } from './catalog'

export type ImportStatus = 'uploaded' | 'validating' | 'validation_failed' | 'ready_for_import' | 'importing' | 'completed' | 'completed_with_errors' | 'failed'
export interface ImportRow { rowNumber: number; name: string; sku: string; category: string; description: string; price: string; stock: string; imageUrl: string; variants: string }
export interface ImportValidationError { rowNumber: number; column: string; code: string; message: string; value: string }
export interface ImportRecord { id: string; vendorId: string; fileName: string; uploadedAt: string; uploadedBy: string; totalRecords: number; successfulRecords: number; failedRecords: number; status: ImportStatus; errors: ImportValidationError[]; validRows: ImportRow[]; createdProductIds: string[] }
export interface ImportPreview { importId: string; fileName: string; totalRecords: number; validRecords: number; invalidRecords: number; errors: ImportValidationError[]; validRows: ImportRow[]; status: ImportStatus }

export interface VendorImportService {
  createPreview(vendorId: string, uploadedBy: string, fileName: string, file: File): Promise<ImportPreview>
  submit(vendorId: string, importId: string): Promise<ImportRecord>
  listHistory(vendorId: string): Promise<ImportRecord[]>
  downloadErrorReport(record: ImportRecord): void
}

const templateHeaders = ['name', 'sku', 'category', 'description', 'price', 'stock', 'imageUrl', 'variants']

export function downloadProductTemplate() {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders, ['Example sofa', 'SOFA-001', PRODUCT_CATEGORIES[0], 'Product description', 49999, 10, 'https://example.com/image.jpg', 'Color=Natural|SKU=SOFA-001-NATURAL|Price=49999|Stock=5']])
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
  XLSX.writeFile(workbook, 'furnishai-product-upload-template.xlsx')
}

function normalizeRow(row: Record<string, unknown>, rowNumber: number): ImportRow { const value = (key: string) => String(row[key] ?? '').trim(); return { rowNumber, name: value('name'), sku: value('sku'), category: value('category'), description: value('description'), price: value('price'), stock: value('stock'), imageUrl: value('imageUrl'), variants: value('variants') } }

async function parseFile(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('The file does not contain a worksheet.')
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return records.map((row, index) => normalizeRow(row, index + 2))
}

function parseVariants(value: string, rowNumber: number): { variants: ProductVariant[]; error?: ImportValidationError } {
  if (!value) return { variants: [] }
  const variants = value.split(';').map((entry, index) => { const fields = Object.fromEntries(entry.split('|').map((field) => field.split('=').map((part) => part.trim()))); return { id: `${rowNumber}-${index}`, name: fields.Color ?? fields.Name ?? `Variant ${index + 1}`, option: fields.Color ?? fields.Option ?? '', sku: fields.SKU ?? '', price: Number(fields.Price), stock: Number(fields.Stock) } })
  const invalid = variants.find((variant) => !variant.sku || !Number.isFinite(variant.price) || variant.price <= 0 || !Number.isInteger(variant.stock) || variant.stock < 0)
  return invalid ? { variants: [], error: { rowNumber, column: 'variants', code: 'invalid_variant_information', message: 'Variant information must include SKU, positive price, and non-negative stock.', value } } : { variants }
}

async function validateRows(vendorId: string, rows: ImportRow[]): Promise<{ validRows: ImportRow[]; errors: ImportValidationError[] }> {
  const existing = await vendorCatalogService.list(vendorId, { status: 'all', page: 1, pageSize: 10000 })
  const existingSkus = new Set(existing.items.map((product) => product.sku.toLowerCase()))
  const seenSkus = new Set<string>(); const errors: ImportValidationError[] = []; const validRows: ImportRow[] = []
  rows.forEach((row) => {
    const rowErrors: ImportValidationError[] = []; const required: Array<[keyof ImportRow, string, string]> = [['name', 'missing_product_name', 'Missing product name.'], ['sku', 'missing_sku', 'Missing SKU.'], ['category', 'invalid_category', 'Category is required.'], ['price', 'invalid_price', 'Price must be greater than zero.'], ['stock', 'invalid_stock', 'Stock must be zero or greater.']]
    required.forEach(([field, code, message]) => { if (!row[field]) rowErrors.push({ rowNumber: row.rowNumber, column: field, code, message, value: String(row[field] ?? '') }) })
    if (row.category && !PRODUCT_CATEGORIES.includes(row.category)) rowErrors.push({ rowNumber: row.rowNumber, column: 'category', code: 'invalid_category', message: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}.`, value: row.category })
    if (row.price && (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0)) rowErrors.push({ rowNumber: row.rowNumber, column: 'price', code: 'invalid_price', message: 'Price must be a positive number.', value: row.price })
    if (row.stock && (!Number.isInteger(Number(row.stock)) || Number(row.stock) < 0)) rowErrors.push({ rowNumber: row.rowNumber, column: 'stock', code: 'invalid_stock', message: 'Stock must be a whole number of zero or greater.', value: row.stock })
    if (row.imageUrl && !/^https?:\/\/[^\s]+$/i.test(row.imageUrl)) rowErrors.push({ rowNumber: row.rowNumber, column: 'imageUrl', code: 'invalid_image_url', message: 'Image URL must be a valid HTTP or HTTPS URL.', value: row.imageUrl })
    const skuKey = row.sku.toLowerCase(); if (row.sku && (seenSkus.has(skuKey) || existingSkus.has(skuKey))) rowErrors.push({ rowNumber: row.rowNumber, column: 'sku', code: 'duplicate_sku', message: 'SKU already exists in this file or catalog.', value: row.sku }); if (row.sku) seenSkus.add(skuKey)
    const parsedVariants = parseVariants(row.variants, row.rowNumber); if (parsedVariants.error) rowErrors.push(parsedVariants.error)
    if (rowErrors.length) errors.push(...rowErrors); else validRows.push(row)
  })
  return { validRows, errors }
}

function rowToProduct(row: ImportRow): ProductInput { const parsed = parseVariants(row.variants, row.rowNumber).variants; return { name: row.name, sku: row.sku, category: row.category, description: row.description, price: Number(row.price), stock: Number(row.stock), images: row.imageUrl ? [{ id: `${row.rowNumber}-image`, name: row.imageUrl, previewUrl: row.imageUrl, altText: row.name }] : [], variants: parsed } }

export const vendorImportService: VendorImportService = {
  async createPreview(vendorId, uploadedBy, fileName, file) { const rows = await parseFile(file); const validation = await validateRows(vendorId, rows); const response = await fetch('/api/vendor/imports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName, uploadedBy, totalRecords: rows.length, successfulRecords: validation.validRows.length, failedRecords: rows.length - validation.validRows.length, status: validation.errors.length ? 'validation_failed' : 'ready_for_import', errors: validation.errors, validRows: validation.validRows }) }); if (!response.ok) throw new Error('Unable to save import preview.'); return response.json() as Promise<ImportPreview> },
  async submit(_vendorId, importId) { const response = await fetch(`/api/vendor/imports/${importId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) }); if (!response.ok) throw new Error('Unable to complete import.'); return response.json() as Promise<ImportRecord> },
  async listHistory(_vendorId) { const response = await fetch('/api/vendor/imports'); if (!response.ok) throw new Error('Unable to load import history.'); return response.json() as Promise<ImportRecord[]> },
  downloadErrorReport(record) { const rows = [['row', 'column', 'code', 'message', 'value'], ...record.errors.map((error) => [error.rowNumber, error.column, error.code, error.message, error.value])]; const blob = new Blob([rows.map((row) => row.map((value) => JSON.stringify(value)).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${record.fileName.replace(/\.[^.]+$/, '')}-errors.csv`; link.click(); URL.revokeObjectURL(url) },
}

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = { uploaded: 'Uploaded', validating: 'Validating', validation_failed: 'Validation failed', ready_for_import: 'Ready for import', importing: 'Importing', completed: 'Completed', completed_with_errors: 'Completed with errors', failed: 'Failed' }