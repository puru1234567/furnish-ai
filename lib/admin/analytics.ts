import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from './authorization'

type AdminClient = SupabaseClient
export interface DateRangeInput { dateFrom?: string; dateTo?: string; vendorId?: string; category?: string }
export interface VendorCatalogRow { vendor_id: string; vendor_name: string; total_products: number; approved_products: number; active_listings: number; new_products: number; last_activity: string | null }
export interface VendorAnalytics { range: { from: string; to: string }; metrics: Record<string, number>; vendors: VendorCatalogRow[] }
export interface ProductAnalytics { range: { from: string; to: string }; metrics: Record<string, number>; byCategory: Array<{ category: string; product_count: number }>; byVendor: VendorCatalogRow[]; growth: Array<{ period: string; product_count: number }> }
export interface OperationalAnalytics { range: { from: string; to: string }; metrics: Record<string, number>; ticketsByStatus: Record<string, number>; documentsByStatus: Record<string, number> }

function db(): AdminClient { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED'); return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
function resolveRange(input: DateRangeInput) { const to = input.dateTo ? new Date(input.dateTo) : new Date(); const from = input.dateFrom ? new Date(input.dateFrom) : new Date(to.getTime() - 30 * 86400000); return { from: from.toISOString(), to: to.toISOString() } }
async function countBy(client: AdminClient, table: string, column: string, values: readonly string[]): Promise<Record<string, number>> { const entries = await Promise.all(values.map(async (value) => { const { count } = await client.from(table).select('*', { count: 'exact', head: true }).eq(column, value); return [value, count ?? 0] as const })); return Object.fromEntries(entries) }

export async function getVendorAnalytics(input: DateRangeInput = {}): Promise<VendorAnalytics> {
  await requireAdmin('analytics.view'); const client = db(); const range = resolveRange(input)
  const [{ data: metrics, error: metricsError }, { data: vendors, error: vendorsError }] = await Promise.all([
    client.rpc('admin_analytics_vendor_metrics', { date_from: range.from, date_to: range.to }),
    client.rpc('admin_analytics_vendor_catalog_sizes', { date_from: range.from, date_to: range.to, result_limit: 25 }),
  ])
  if (metricsError) throw metricsError; if (vendorsError) throw vendorsError
  return { range, metrics: (metrics ?? {}) as Record<string, number>, vendors: (vendors ?? []) as VendorCatalogRow[] }
}

export async function getProductAnalytics(input: DateRangeInput = {}): Promise<ProductAnalytics> {
  await requireAdmin('analytics.view'); const client = db(); const range = resolveRange(input); const vendorFilter = input.vendorId || null; const categoryFilter = input.category || null
  const [{ data: metrics, error: metricsError }, { data: byCategory, error: categoryError }, { data: byVendor, error: vendorError }, { data: growth, error: growthError }] = await Promise.all([
    client.rpc('admin_analytics_product_metrics', { date_from: range.from, date_to: range.to, vendor_filter: vendorFilter, category_filter: categoryFilter }),
    client.rpc('admin_analytics_products_by_category', { vendor_filter: vendorFilter }),
    client.rpc('admin_analytics_vendor_catalog_sizes', { date_from: range.from, date_to: range.to, result_limit: 25 }),
    client.rpc('admin_analytics_catalog_growth', { date_from: range.from, date_to: range.to, vendor_filter: vendorFilter, category_filter: categoryFilter }),
  ])
  if (metricsError) throw metricsError; if (categoryError) throw categoryError; if (vendorError) throw vendorError; if (growthError) throw growthError
  return { range, metrics: (metrics ?? {}) as Record<string, number>, byCategory: (byCategory ?? []) as Array<{ category: string; product_count: number }>, byVendor: (byVendor ?? []) as VendorCatalogRow[], growth: (growth ?? []) as Array<{ period: string; product_count: number }> }
}

export async function getOperationalAnalytics(input: DateRangeInput = {}): Promise<OperationalAnalytics> {
  await requireAdmin('analytics.view'); const client = db(); const range = resolveRange(input)
  const [{ data: metrics, error: metricsError }, ticketsByStatus, documentsByStatus] = await Promise.all([
    client.rpc('admin_analytics_operational_metrics', { date_from: range.from, date_to: range.to }),
    countBy(client, 'vendor_support_tickets', 'status', ['open', 'assigned', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed'] as const),
    countBy(client, 'vendor_onboarding_documents', 'review_status', ['missing', 'uploaded', 'pending', 'under_review', 'verified', 'approved', 'rejected', 'action_required', 'expired'] as const),
  ])
  if (metricsError) throw metricsError
  return { range, metrics: (metrics ?? {}) as Record<string, number>, ticketsByStatus, documentsByStatus }
}

function toCsv(rows: Array<Record<string, unknown>>): string { if (!rows.length) return ''; const headers = Object.keys(rows[0]); const lines = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')); return [headers.join(','), ...lines].join('\n') }

export async function exportAnalytics(dataset: 'vendors' | 'products' | 'operations', input: DateRangeInput = {}): Promise<string> {
  if (dataset === 'vendors') { const data = await getVendorAnalytics(input); return toCsv(data.vendors as unknown as Array<Record<string, unknown>>) }
  if (dataset === 'products') { const data = await getProductAnalytics(input); return toCsv(data.byVendor as unknown as Array<Record<string, unknown>>) }
  const data = await getOperationalAnalytics(input); return toCsv([{ ...data.metrics, ...Object.fromEntries(Object.entries(data.ticketsByStatus).map(([key, value]) => [`tickets_${key}`, value])), ...Object.fromEntries(Object.entries(data.documentsByStatus).map(([key, value]) => [`documents_${key}`, value])) }])
}
