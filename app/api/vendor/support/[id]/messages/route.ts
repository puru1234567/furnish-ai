import { NextRequest, NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import type { SupportAttachment } from '@/lib/vendor/support'
import { fetchTicket } from '../../shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const { body, attachments } = (await request.json()) as { body: string; attachments: SupportAttachment[] }

  const { data: ticket, error: lookupError } = await auth.supabase.from('vendor_support_tickets').select('id, status').eq('vendor_id', auth.user.id).eq('id', id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Unable to load ticket.' }, { status: 500 })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })

  const { data: message, error: messageError } = await auth.supabase.from('vendor_support_messages').insert({ ticket_id: id, author_type: 'vendor', author_id: auth.user.id, body }).select('id').single()
  if (messageError || !message) return NextResponse.json({ error: 'Unable to save message.' }, { status: 500 })
  if (attachments.length) await auth.supabase.from('vendor_support_attachments').insert(attachments.map((attachment) => ({ message_id: message.id, file_name: attachment.fileName, storage_path: attachment.storagePath, size_bytes: attachment.size })))

  await auth.supabase.from('vendor_support_tickets').update({ status: ticket.status === 'resolved' ? 'open' : ticket.status, updated_at: new Date().toISOString() }).eq('id', id)

  const updated = await fetchTicket(auth.supabase, auth.user.id, id)
  if (!updated) return NextResponse.json({ error: 'Message saved but ticket could not be reloaded.' }, { status: 500 })
  return NextResponse.json(updated)
}
