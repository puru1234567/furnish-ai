import { NextRequest, NextResponse } from 'next/server'
import { analyzeRoomWithVision } from './roomVision'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { images: string[] }

    if (!Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json({ error: 'images array is required (1–4 base64 data-URLs)' }, { status: 400 })
    }

    if (body.images.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 images allowed' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY ?? ''
    const result = await analyzeRoomWithVision(body.images, apiKey)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Room analysis failed'
    console.error('[analyze-room]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
