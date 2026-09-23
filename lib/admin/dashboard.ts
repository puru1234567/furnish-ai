import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, getAdminPermissions, type AdminRole } from './authorization'

export interface DashboardMetric {
  value: number | null
  available: boolean
}

export interface AdminDashboardData {
  role: AdminRole
  permissions: string[]
  configured: boolean
  message: string | null
  metrics: {
    vendors: Record<string, DashboardMetric>
    products: Record<string, DashboardMetric>
    catalog: Record<string, DashboardMetric>
    operations: Record<string, DashboardMetric>
  }
  recentVendors: Array<{ id: string; name: string; status: string; updatedAt: string }>
  recentProducts: Array<{ id: string; name: string; vendorId: string; status: string; updatedAt: string }>
  awaitingApproval: Array<{ id: string; name: string; vendorId: string; status: string; updatedAt: string }>
  recentImports: Array<{ id: string; vendorId: string; fileName: string; status: string; uploadedAt: string }>
  recentActivity: Array<{ id: string; type: string; label: string; detail: string; occurredAt: string }>
  alerts: Array<{ id: string; label: string; count: number | null; available: boolean; href: string }>
}

type AdminClient = SupabaseClient<Record<string, never>>

function metric(value: number | null): DashboardMetric {
  return { value, available: value !== null }
}

function unavailableMetrics(keys: string[]): Record<string, DashboardMetric> {
  return Object.fromEntries(keys.map((key) => [key, metric(null)]))
}

async function countRows(client: AdminClient, table: string, filters: Array<[string, string, string | string[]]> = []): Promise<number | null> {
  let query = client.from(table).select('*', { count: 'exact', head: true })
  for (const [operator, column, value] of filters) {
    if (operator === 'eq') query = query.eq(column, value as string)
    if (operator === 'in') query = query.in(column, value as string[])
    if (operator === 'neq') query = query.neq(column, value)
  }
  const { count, error } = await query
  return error ? null : count ?? 0
}

function emptyDashboard(role: AdminRole, configured: boolean, message: string | null): AdminDashboardData {
  return {
    role,
    permissions: getAdminPermissions(role),
    configured,
    message,
    metrics: {
      vendors: unavailableMetrics(['total', 'active', 'pendingOnboarding', 'suspended', 'inactive', 'requiringAction']),
      products: unavailableMetrics(['total', 'pendingApproval', 'approved', 'rejected', 'draft', 'activeListings', 'inactiveListings', 'archived']),
      catalog: unavailableMetrics(['recentImports', 'failedImports', 'requiringAttention', 'missingInformation']),
      operations: unavailableMetrics(['pendingSupportTickets', 'pendingDocuments', 'recentAdministrativeActions', 'recentVendorActivity']),
    },
    recentVendors: [], recentProducts: [], awaitingApproval: [], recentImports: [], recentActivity: [],
    alerts: [
      { id: 'vendors-action', label: 'Vendors requiring action', count: null, available: false, href: '/admin/vendors' },
      { id: 'products-attention', label: 'Products requiring attention', count: null, available: false, href: '/admin/products' },
      { id: 'imports-failed', label: 'Failed catalog imports', count: null, available: false, href: '/admin/imports' },
    ],
  }
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const { role } = await requireAdmin('view_dashboard')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return emptyDashboard(role, false, 'Admin data access is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server to enable platform-wide metrics.')
  }

  const client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const dashboard = emptyDashboard(role, true, null)

  const [totalVendors, activeVendors, pendingOnboarding, suspendedVendors, inactiveVendors, actionVendors,
    totalProducts, pendingApproval, approved, rejected, draft, activeListings, inactiveListings, archived,
    recentImports, failedImports, productsAttention, missingInformation, pendingTickets, pendingDocuments,
    recentAdminActions, recentVendorActivity] = await Promise.all([
    countRows(client, 'vendor_onboarding'), countRows(client, 'vendor_onboarding', [['eq', 'status', 'approved']]),
    countRows(client, 'vendor_onboarding', [['in', 'status', ['not_started', 'in_progress', 'submitted']]]),
    countRows(client, 'vendor_onboarding', [['eq', 'status', 'action_required']]), countRows(client, 'vendor_onboarding', [['eq', 'status', 'not_started']]),
    countRows(client, 'vendor_onboarding', [['eq', 'status', 'action_required']]), countRows(client, 'vendor_products'),
    countRows(client, 'vendor_products', [['in', 'status', ['submitted', 'under_review', 'resubmitted']]]), countRows(client, 'vendor_products', [['eq', 'status', 'approved']]),
    countRows(client, 'vendor_products', [['eq', 'status', 'rejected']]), countRows(client, 'vendor_products', [['eq', 'status', 'draft']]),
    countRows(client, 'vendor_products', [['eq', 'lifecycle_status', 'active']]), countRows(client, 'vendor_products', [['eq', 'lifecycle_status', 'inactive']]),
    countRows(client, 'vendor_products', [['eq', 'status', 'archived']]), countRows(client, 'vendor_catalog_imports'),
    countRows(client, 'vendor_catalog_imports', [['in', 'status', ['failed', 'validation_failed', 'completed_with_errors']]]),
    countRows(client, 'vendor_products', [['in', 'status', ['rejected', 'vendor_fix_required']]]), countRows(client, 'vendor_products', [['eq', 'description', '']]),
    countRows(client, 'vendor_support_tickets', [['in', 'status', ['open', 'in_progress', 'waiting_on_vendor']]]),
    countRows(client, 'vendor_documents', [['in', 'status', ['pending', 'action_required']]]), Promise.resolve(null),
    countRows(client, 'vendor_product_activity'),
  ])

  dashboard.metrics.vendors = { total: metric(totalVendors), active: metric(activeVendors), pendingOnboarding: metric(pendingOnboarding), suspended: metric(suspendedVendors), inactive: metric(inactiveVendors), requiringAction: metric(actionVendors) }
  dashboard.metrics.products = { total: metric(totalProducts), pendingApproval: metric(pendingApproval), approved: metric(approved), rejected: metric(rejected), draft: metric(draft), activeListings: metric(activeListings), inactiveListings: metric(inactiveListings), archived: metric(archived) }
  dashboard.metrics.catalog = { recentImports: metric(recentImports), failedImports: metric(failedImports), requiringAttention: metric(productsAttention), missingInformation: metric(missingInformation) }
  dashboard.metrics.operations = { pendingSupportTickets: metric(pendingTickets), pendingDocuments: metric(pendingDocuments), recentAdministrativeActions: metric(recentAdminActions), recentVendorActivity: metric(recentVendorActivity) }

  const [vendors, products, approvalProducts, imports] = await Promise.all([
    client.from('vendor_onboarding').select('vendor_id, company_name, status, updated_at').order('updated_at', { ascending: false }).limit(6),
    client.from('vendor_products').select('id, name, vendor_id, status, updated_at').order('updated_at', { ascending: false }).limit(6),
    client.from('vendor_products').select('id, name, vendor_id, status, updated_at').in('status', ['submitted', 'under_review', 'resubmitted']).order('updated_at', { ascending: false }).limit(6),
    client.from('vendor_catalog_imports').select('id, vendor_id, file_name, status, uploaded_at').order('uploaded_at', { ascending: false }).limit(6),
  ])

  dashboard.recentVendors = (vendors.data ?? []).map((item) => ({ id: item.vendor_id, name: item.company_name || 'Unnamed vendor', status: item.status, updatedAt: item.updated_at }))
  dashboard.recentProducts = (products.data ?? []).map((item) => ({ id: item.id, name: item.name, vendorId: item.vendor_id, status: item.status, updatedAt: item.updated_at }))
  dashboard.awaitingApproval = (approvalProducts.data ?? []).map((item) => ({ id: item.id, name: item.name, vendorId: item.vendor_id, status: item.status, updatedAt: item.updated_at }))
  dashboard.recentImports = (imports.data ?? []).map((item) => ({ id: item.id, vendorId: item.vendor_id, fileName: item.file_name, status: item.status, uploadedAt: item.uploaded_at }))
  dashboard.alerts = [
    { id: 'vendors-action', label: 'Vendors requiring action', count: actionVendors, available: actionVendors !== null, href: '/admin/vendors' },
    { id: 'products-attention', label: 'Products requiring attention', count: productsAttention, available: productsAttention !== null, href: '/admin/products' },
    { id: 'imports-failed', label: 'Failed catalog imports', count: failedImports, available: failedImports !== null, href: '/admin/imports' },
  ]
  dashboard.recentActivity = [
    ...(approvalProducts.data ?? []).map((item) => ({ id: `approval-${item.id}`, type: 'product', label: 'Product entered review', detail: item.name, occurredAt: item.updated_at })),
    ...(imports.data ?? []).map((item) => ({ id: `import-${item.id}`, type: 'import', label: 'Catalog import updated', detail: item.file_name, occurredAt: item.uploaded_at })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8)
  return dashboard
}
