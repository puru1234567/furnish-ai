import { NextRequest, NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import type { CreateSupportTicketInput } from '@/lib/vendor/support'
import { fetchTicket, mapTicket, TICKET_SELECT } from './shared'

export async function GET() {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('vendor_support_tickets').select(TICKET_SELECT).eq('vendor_id', auth.user.id).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load support tickets.' }, { status: 500 })
  return NextResponse.json((data ?? []).map(mapTicket))
}

export async function POST(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const input = (await request.json()) as CreateSupportTicketInput
  const { data: ticket, error } = await auth.supabase.from('vendor_support_tickets').insert({
    vendor_id: auth.user.id, subject: input.subject, category: input.category, priority: input.priority, status: 'open',
  }).select('id').single()
  if (error || !ticket) return NextResponse.json({ error: 'Unable to create support ticket.' }, { status: 500 })

  const { data: message, error: messageError } = await auth.supabase.from('vendor_support_messages').insert({ ticket_id: ticket.id, author_type: 'vendor', author_id: auth.user.id, body: input.body }).select('id').single()
  if (messageError || !message) return NextResponse.json({ error: 'Ticket created but the message could not be saved.' }, { status: 500 })
  if (input.attachments.length) await auth.supabase.from('vendor_support_attachments').insert(input.attachments.map((attachment) => ({ message_id: message.id, file_name: attachment.fileName, storage_path: attachment.storagePath, size_bytes: attachment.size })))

  const created = await fetchTicket(auth.supabase, auth.user.id, ticket.id)
  if (!created) return NextResponse.json({ error: 'Ticket created but could not be reloaded.' }, { status: 500 })
  return NextResponse.json(created)
}
