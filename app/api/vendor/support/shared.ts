import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupportAttachment, SupportMessage, SupportTicket } from '@/lib/vendor/support'

export const TICKET_SELECT = '*, vendor_support_messages(*, vendor_support_attachments(*))'

interface AttachmentRow { id: string; file_name: string; storage_path: string; size_bytes: number }
interface MessageRow { id: string; ticket_id: string; author_type: 'vendor' | 'support'; author_id: string | null; body: string; created_at: string; vendor_support_attachments?: AttachmentRow[] | null }
interface TicketRow { id: string; vendor_id: string; subject: string; category: string; priority: SupportTicket['priority']; status: SupportTicket['status']; created_at: string; updated_at: string; vendor_support_messages?: MessageRow[] | null }

function mapAttachment(row: AttachmentRow): SupportAttachment { return { id: row.id, fileName: row.file_name, storagePath: row.storage_path, size: row.size_bytes } }
function mapMessage(row: MessageRow): SupportMessage {
  return { id: row.id, ticketId: row.ticket_id, authorType: row.author_type, authorName: row.author_type === 'vendor' ? 'Vendor' : 'Support team', body: row.body, createdAt: row.created_at, attachments: (row.vendor_support_attachments ?? []).map(mapAttachment) }
}
export function mapTicket(row: TicketRow): SupportTicket {
  const messages = [...(row.vendor_support_messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(mapMessage)
  return { id: row.id, vendorId: row.vendor_id, subject: row.subject, category: row.category, priority: row.priority, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, messages }
}

export async function fetchTicket(supabase: SupabaseClient, vendorId: string, ticketId: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase.from('vendor_support_tickets').select(TICKET_SELECT).eq('vendor_id', vendorId).eq('id', ticketId).maybeSingle()
  if (error) throw error
  return data ? mapTicket(data as TicketRow) : null
}
