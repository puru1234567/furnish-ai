export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_on_vendor' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'normal' | 'high'
export interface SupportAttachment { id: string; fileName: string; storagePath: string; size: number }
export interface SupportMessage { id: string; ticketId: string; authorType: 'vendor' | 'support'; authorName: string; body: string; createdAt: string; attachments: SupportAttachment[] }
export interface SupportTicket { id: string; vendorId: string; subject: string; category: string; priority: SupportTicketPriority; status: SupportTicketStatus; createdAt: string; updatedAt: string; messages: SupportMessage[] }
export interface CreateSupportTicketInput { subject: string; category: string; priority: SupportTicketPriority; body: string; attachments: SupportAttachment[] }
export interface VendorSupportService { list(vendorId: string): Promise<SupportTicket[]>; get(vendorId: string, ticketId: string): Promise<SupportTicket | null>; create(vendorId: string, input: CreateSupportTicketInput): Promise<SupportTicket>; addMessage(vendorId: string, ticketId: string, body: string, attachments: SupportAttachment[]): Promise<SupportTicket> }
export const SUPPORT_CATEGORIES = ['Catalog', 'Approval', 'Inventory', 'Pricing', 'Onboarding', 'Technical']
export function createSupportAttachment(file: File): SupportAttachment { return { id: crypto.randomUUID(), fileName: file.name, storagePath: `pending-support/${file.name}`, size: file.size } }

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: init?.body ? { 'Content-Type': 'application/json' } : undefined, ...init })
  if (!response.ok) throw new Error('Unable to reach the vendor support service.')
  return response.json() as Promise<T>
}

/** Vendor-scoped adapter backed by /api/vendor/support; the server derives the vendor from the session. */
export const vendorSupportService: VendorSupportService = {
  async list(_vendorId) { return apiRequest<SupportTicket[]>('/api/vendor/support') },
  async get(_vendorId, ticketId) { return apiRequest<SupportTicket | null>(`/api/vendor/support/${ticketId}`) },
  async create(_vendorId, input) { return apiRequest<SupportTicket>('/api/vendor/support', { method: 'POST', body: JSON.stringify(input) }) },
  async addMessage(_vendorId, ticketId, body, attachments) { return apiRequest<SupportTicket>(`/api/vendor/support/${ticketId}/messages`, { method: 'POST', body: JSON.stringify({ body, attachments }) }) },
}