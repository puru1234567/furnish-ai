import { NextRequest, NextResponse } from 'next/server'
import { getDocumentUrl, reviewDocument } from '@/lib/admin/onboarding'

export async function POST(request: NextRequest, context: { params: Promise<{ vendorId: string; documentId: string }> }) {
  try {
    const { vendorId, documentId } = await context.params
    const body = await request.json() as { action?: 'approve' | 'reject' | 'replace'; comment?: string }
    return NextResponse.json(await reviewDocument(vendorId, documentId, body.action ?? 'reject', body.comment))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND') return NextResponse.json({ error: 'Document not found for this vendor.' }, { status: 404 })
    if (error instanceof Error && error.message === 'DOCUMENT_REASON_REQUIRED') return NextResponse.json({ error: 'A reason is required for rejection or replacement requests.' }, { status: 400 })
    return NextResponse.json({ error: 'Unable to review document.' }, { status: 500 })
  }
}

export async function GET(_request: Request, context: { params: Promise<{ vendorId: string; documentId: string }> }) {
  try {
    const { vendorId, documentId } = await context.params
    return NextResponse.json(await getDocumentUrl(vendorId, documentId))
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (error instanceof Error && error.message === 'DOCUMENT_NOT_AVAILABLE') return NextResponse.json({ error: 'Document file is not available.' }, { status: 404 })
    return NextResponse.json({ error: 'Unable to create a private document link.' }, { status: 500 })
  }
}
