import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApprovalHistoryEntry, ListingActivityRecord, ListingLifecycleAction, ListingLifecycleStatus, ProductApprovalState, ProductInput, ProductStatus, VendorProduct } from '@/lib/vendor/catalog'

const PRODUCT_SELECT = '*, vendor_product_images(*), vendor_product_variants(*)'

interface ProductRow {
  id: string; vendor_id: string; name: string; sku: string; category: string; description: string
  price: number | string; stock: number; status: ProductStatus; rejection_reason: string | null
  is_active: boolean; lifecycle_status: ListingLifecycleStatus; archived_at: string | null
  created_at: string; updated_at: string
  vendor_product_images?: Array<{ id: string; storage_path: string; original_name: string; alt_text: string }> | null
  vendor_product_variants?: Array<{ id: string; name: string; option_value: string; sku: string; price: number | string; stock: number }> | null
}

export function mapProduct(row: ProductRow): VendorProduct {
  return {
    id: row.id, vendorId: row.vendor_id, name: row.name, sku: row.sku, category: row.category, description: row.description,
    price: Number(row.price), stock: row.stock, status: row.status, rejectionReason: row.rejection_reason,
    images: (row.vendor_product_images ?? []).map((image) => ({ id: image.id, name: image.original_name, previewUrl: image.storage_path, altText: image.alt_text })),
    variants: (row.vendor_product_variants ?? []).map((variant) => ({ id: variant.id, name: variant.name, sku: variant.sku, price: Number(variant.price), stock: variant.stock, option: variant.option_value })),
    isActive: row.is_active, lifecycleStatus: row.lifecycle_status, archivedAt: row.archived_at, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export async function fetchProduct(supabase: SupabaseClient, vendorId: string, productId: string): Promise<VendorProduct | null> {
  const { data, error } = await supabase.from('vendor_products').select(PRODUCT_SELECT).eq('vendor_id', vendorId).eq('id', productId).maybeSingle()
  if (error) throw error
  return data ? mapProduct(data as ProductRow) : null
}

export async function replaceImagesAndVariants(supabase: SupabaseClient, productId: string, input: ProductInput) {
  await Promise.all([
    supabase.from('vendor_product_images').delete().eq('product_id', productId),
    supabase.from('vendor_product_variants').delete().eq('product_id', productId),
  ])
  if (input.images.length) {
    const { error } = await supabase.from('vendor_product_images').insert(input.images.map((image) => ({ product_id: productId, storage_path: image.previewUrl, original_name: image.name, alt_text: image.altText })))
    if (error) throw error
  }
  if (input.variants.length) {
    const { error } = await supabase.from('vendor_product_variants').insert(input.variants.map((variant) => ({ product_id: productId, name: variant.name, option_value: variant.option, sku: variant.sku, price: variant.price, stock: variant.stock })))
    if (error) throw error
  }
}

export function mapApprovalState(productId: string, rows: Array<{ id: string; status: ProductStatus; comment: string | null; requested_changes: string[] | null; changed_at: string; changed_by: string | null }>): ProductApprovalState {
  const history: ApprovalHistoryEntry[] = rows.map((row) => ({ id: row.id, status: row.status, comment: row.comment, requestedChanges: row.requested_changes ?? [], changedAt: row.changed_at, changedBy: row.changed_by ?? 'Marketplace review team' }))
  const adminComments = history.filter((entry) => entry.comment).map((entry) => entry.comment as string)
  const requestedChanges = history[0]?.requestedChanges ?? []
  return { productId, history, adminComments, requestedChanges }
}

export function mapActivity(rows: Array<{ id: string; product_id: string; action: ListingLifecycleAction; from_status: ListingLifecycleStatus; to_status: ListingLifecycleStatus; note: string | null; created_at: string; created_by: string | null }>): ListingActivityRecord[] {
  return rows.map((row) => ({ id: row.id, productId: row.product_id, action: row.action, fromStatus: row.from_status, toStatus: row.to_status, note: row.note, createdAt: row.created_at, createdBy: row.created_by ?? 'Vendor' }))
}
