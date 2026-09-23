import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import { fetchTicket } from '../shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const { id } = await params
  const ticket = await fetchTicket(auth.supabase, auth.user.id, id)
  return NextResponse.json(ticket)
}
