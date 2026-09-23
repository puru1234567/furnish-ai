export type VendorNotificationType = 'product_approved' | 'product_rejected' | 'product_changes_required' | 'bulk_upload_completed' | 'bulk_upload_failed' | 'listing_removed' | 'announcement' | 'low_stock' | 'document_issue'
export interface VendorNotification { id: string; vendorId: string; type: VendorNotificationType; title: string; body: string; createdAt: string; readAt: string | null; actionLabel: string | null; actionHref: string | null }
export interface NotificationPreferences { productUpdates: boolean; importUpdates: boolean; listingUpdates: boolean; announcements: boolean; inventoryAlerts: boolean; documentAlerts: boolean }
export interface VendorNotificationService { list(vendorId: string): Promise<VendorNotification[]>; markRead(vendorId: string, notificationId: string): Promise<void>; markAllRead(vendorId: string): Promise<void>; getPreferences(vendorId: string): Promise<NotificationPreferences>; savePreferences(vendorId: string, preferences: NotificationPreferences): Promise<NotificationPreferences> }
export const notificationTypeLabels: Record<VendorNotificationType, string> = { product_approved: 'Product approved', product_rejected: 'Product rejected', product_changes_required: 'Changes required', bulk_upload_completed: 'Bulk upload completed', bulk_upload_failed: 'Bulk upload failed', listing_removed: 'Listing removed', announcement: 'Announcement', low_stock: 'Low stock', document_issue: 'Document issue' }
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: init?.body ? { 'Content-Type': 'application/json' } : undefined, ...init })
  if (!response.ok) throw new Error('Unable to reach the vendor notifications service.')
  return response.json() as Promise<T>
}

/** Vendor-scoped adapter backed by /api/vendor/notifications; the server derives the vendor from the session. */
export const vendorNotificationService: VendorNotificationService = {
  async list(_vendorId) { return apiRequest<VendorNotification[]>('/api/vendor/notifications') },
  async markRead(_vendorId, notificationId) { await apiRequest(`/api/vendor/notifications/${notificationId}/read`, { method: 'POST' }) },
  async markAllRead(_vendorId) { await apiRequest('/api/vendor/notifications/read-all', { method: 'POST' }) },
  async getPreferences(_vendorId) { return apiRequest<NotificationPreferences>('/api/vendor/notifications/preferences') },
  async savePreferences(_vendorId, preferences) { return apiRequest<NotificationPreferences>('/api/vendor/notifications/preferences', { method: 'PUT', body: JSON.stringify(preferences) }) },
}