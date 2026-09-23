export type ProductStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'vendor_fix_required' | 'resubmitted' | 'archived'
export type ListingLifecycleStatus = 'active' | 'inactive' | 'discontinued' | 'archived' | 'removal_requested'
export type ListingLifecycleAction = 'activate' | 'deactivate' | 'discontinue' | 'archive' | 'request_removal' | 'restore'

export interface ProductImage { id: string; name: string; previewUrl: string; altText: string }
export interface ProductVariant { id: string; name: string; sku: string; price: number; stock: number; option: string }

export interface VendorProduct {
  id: string
  vendorId: string
  name: string
  sku: string
  category: string
  description: string
  price: number
  stock: number
  status: ProductStatus
  rejectionReason: string | null
  images: ProductImage[]
  variants: ProductVariant[]
  isActive: boolean
  lifecycleStatus: ListingLifecycleStatus
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListingActivityRecord {
  id: string
  productId: string
  action: ListingLifecycleAction
  fromStatus: ListingLifecycleStatus
  toStatus: ListingLifecycleStatus
  note: string | null
  createdAt: string
  createdBy: string
}

export interface ApprovalHistoryEntry {
  id: string
  status: ProductStatus
  comment: string | null
  requestedChanges: string[]
  changedAt: string
  changedBy: string
}

export interface ProductApprovalState {
  productId: string
  history: ApprovalHistoryEntry[]
  adminComments: string[]
  requestedChanges: string[]
}

export interface ProductInput {
  name: string
  sku: string
  category: string
  description: string
  price: number
  stock: number
  images: ProductImage[]
  variants: ProductVariant[]
}

export interface ProductListQuery { search?: string; status?: ProductStatus | 'all'; category?: string; sort?: 'updated_desc' | 'name_asc' | 'price_asc' | 'price_desc'; page?: number; pageSize?: number }
export interface ProductListResult { items: VendorProduct[]; total: number; page: number; pageSize: number; totalPages: number }

export interface VendorCatalogService {
  list(vendorId: string, query: ProductListQuery): Promise<ProductListResult>
  get(vendorId: string, productId: string): Promise<VendorProduct | null>
  create(vendorId: string, input: ProductInput): Promise<VendorProduct>
  update(vendorId: string, productId: string, input: ProductInput): Promise<VendorProduct>
  changeStatus(vendorId: string, productId: string, status: ProductStatus): Promise<VendorProduct>
  setActive(vendorId: string, productId: string, isActive: boolean): Promise<VendorProduct>
  getApprovalState(vendorId: string, productId: string): Promise<ProductApprovalState>
  submitForApproval(vendorId: string, productId: string): Promise<VendorProduct>
  resubmit(vendorId: string, productId: string): Promise<VendorProduct>
  getListingActivity(vendorId: string, productId: string): Promise<ListingActivityRecord[]>
  performLifecycleAction(vendorId: string, productId: string, action: ListingLifecycleAction): Promise<VendorProduct>
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', rejected: 'Rejected', vendor_fix_required: 'Vendor fix required', resubmitted: 'Resubmitted', archived: 'Archived' }
export const PRODUCT_CATEGORIES = ['Sofas', 'Beds', 'Tables', 'Chairs', 'Storage', 'Lighting', 'Decor']
export const PRODUCT_PAGE_SIZE = 8

export function createEmptyProductInput(): ProductInput { return { name: '', sku: '', category: '', description: '', price: 0, stock: 0, images: [], variants: [] } }

export function validateProduct(input: ProductInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.name.trim()) errors.name = 'Product name is required.'
  if (!input.sku.trim()) errors.sku = 'SKU is required.'
  if (!input.category) errors.category = 'Category is required.'
  if (!input.description.trim()) errors.description = 'Description is required.'
  if (!Number.isFinite(input.price) || input.price <= 0) errors.price = 'Price must be greater than zero.'
  if (!Number.isInteger(input.stock) || input.stock < 0) errors.stock = 'Stock must be zero or greater.'
  const variantSkus = new Set<string>()
  input.variants.forEach((variant, index) => {
    if (!variant.name.trim()) errors[`variant-${index}-name`] = 'Variant name is required.'
    if (!variant.sku.trim()) errors[`variant-${index}-sku`] = 'Variant SKU is required.'
    if (variantSkus.has(variant.sku.trim().toLowerCase())) errors[`variant-${index}-sku`] = 'Variant SKUs must be unique.'
    variantSkus.add(variant.sku.trim().toLowerCase())
    if (variant.price <= 0) errors[`variant-${index}-price`] = 'Variant price must be greater than zero.'
    if (variant.stock < 0) errors[`variant-${index}-stock`] = 'Variant stock cannot be negative.'
  })
  return errors
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: init?.body ? { 'Content-Type': 'application/json' } : undefined, ...init })
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? 'Unable to reach the vendor catalog service.') }
  return response.json() as Promise<T>
}

/** Vendor-scoped adapter backed by /api/vendor/products; the server derives the vendor from the session. */
export const vendorCatalogService: VendorCatalogService = {
  async list(_vendorId, query) {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (query.status) params.set('status', query.status)
    if (query.category) params.set('category', query.category)
    if (query.sort) params.set('sort', query.sort)
    params.set('page', String(query.page ?? 1))
    params.set('pageSize', String(query.pageSize ?? PRODUCT_PAGE_SIZE))
    return apiRequest<ProductListResult>(`/api/vendor/products?${params.toString()}`)
  },
  async get(_vendorId, productId) { return apiRequest<VendorProduct | null>(`/api/vendor/products/${productId}`) },
  async create(_vendorId, input) { return apiRequest<VendorProduct>('/api/vendor/products', { method: 'POST', body: JSON.stringify(input) }) },
  async update(_vendorId, productId, input) { return apiRequest<VendorProduct>(`/api/vendor/products/${productId}`, { method: 'PUT', body: JSON.stringify(input) }) },
  async changeStatus(_vendorId, productId, status) { return apiRequest<VendorProduct>(`/api/vendor/products/${productId}/status`, { method: 'POST', body: JSON.stringify({ status }) }) },
  async setActive(vendorId, productId, isActive) { return this.performLifecycleAction(vendorId, productId, isActive ? 'activate' : 'deactivate') },
  async getApprovalState(_vendorId, productId) { return apiRequest<ProductApprovalState>(`/api/vendor/products/${productId}/approval`) },
  async submitForApproval(vendorId, productId) { return this.changeStatus(vendorId, productId, 'submitted') },
  async resubmit(vendorId, productId) { return this.changeStatus(vendorId, productId, 'resubmitted') },
  async getListingActivity(_vendorId, productId) { return apiRequest<ListingActivityRecord[]>(`/api/vendor/products/${productId}/activity`) },
  async performLifecycleAction(_vendorId, productId, action) { return apiRequest<VendorProduct>(`/api/vendor/products/${productId}/lifecycle`, { method: 'POST', body: JSON.stringify({ action }) }) },
}