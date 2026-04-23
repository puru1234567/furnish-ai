import { NextRequest, NextResponse } from 'next/server'
import { analyzeRoomWithVision } from './roomVision'
import { preprocessRoomImages } from '@/lib/ai/image-processing'
import { ApiLogger } from '@/lib/ai/logger'

export async function POST(req: NextRequest) {
  const logger = new ApiLogger('POST /api/analyze-room')
  
  try {
    logger.info('start', 'Room analysis request received')
    const body = await req.json() as { images: string[]; furnitureType?: string; roomType?: string }
    logger.debug('input', 'Request parsed', {
      imageCount: body.images.length,
      furnitureType: body.furnitureType,
      roomType: body.roomType,
    })

    if (!Array.isArray(body.images) || body.images.length === 0) {
      logger.warn('validate', 'No images provided')
      return NextResponse.json({ error: 'images array is required (1–4 base64 data-URLs)' }, { status: 400 })
    }

    if (body.images.length > 4) {
      logger.warn('validate', `Too many images: ${body.images.length}`)
      return NextResponse.json({ error: 'Maximum 4 images allowed' }, { status: 400 })
    }

    logger.info('preprocess', 'Starting image preprocessing')
    const prepResult = preprocessRoomImages(body.images)
    if ('error' in prepResult) {
      logger.error('preprocess', 'Image preprocessing failed', prepResult.error as unknown as Record<string, unknown>)
      return NextResponse.json({ error: prepResult.error }, { status: 400 })
    }

    logger.info('preprocess', 'Images preprocessed', {
      original: body.images.length,
      final: prepResult.result.images.length,
      duplicatesRemoved: prepResult.result.duplicatesRemoved,
    })

    const apiKey = process.env.GROQ_API_KEY ?? ''
    const result = await analyzeRoomWithVision(prepResult.result.images, apiKey, {
      furnitureType: body.furnitureType,
      roomType: body.roomType,
    })

    logger.success('complete', 'Room analysis successful', {
      wallColor: result.wallColor.id,
      floor: result.floorType.id,
      layout: result.roomLayout,
      confidence: `${(result.confidenceScore * 100).toFixed(0)}%`,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Room analysis failed'
    logger.error('error', message, err as Error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
