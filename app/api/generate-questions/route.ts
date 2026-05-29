import { NextRequest, NextResponse } from 'next/server'
import type { ContextualQuestion, RoomAnalysis } from '@/lib/types'
import { QUESTIONS_SYSTEM_PROMPT, buildQuestionUserMessage } from '@/lib/ai/prompts/questions-prompt'
import { getFallbackQuestions } from '@/lib/ai/prompts/question-fallbacks'
import { callGroqChat } from '@/lib/ai/groq-client'
import { validateGenerateQuestionsRequest } from '@/lib/api/validation'
import { createErrorResponse, createSuccessResponse } from '@/lib/api/middleware'
import { ApiLogger } from '@/lib/ai/logger'
import { createClient } from '@/lib/supabase/server'

interface QuestionRequestBody {
  furnitureType?: string
  roomAnalysis?: RoomAnalysis | null
  roomType?: string
}

async function generateWithGroq(body: QuestionRequestBody, logger: ApiLogger): Promise<ContextualQuestion[]> {
  const apiKey = process.env.GROQ_API_KEY ?? ''
  if (!apiKey) {
    logger.warn('groq', 'No GROQ_API_KEY, using fallback')
    return getFallbackQuestions(body.furnitureType ?? 'sofa', body.roomAnalysis ?? undefined)
  }

  const userPrompt = buildQuestionUserMessage(body)

  try {
    const raw = await callGroqChat({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: QUESTIONS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 1024,
      jsonMode: true,
    })
    const parsed = JSON.parse(raw) as { questions?: ContextualQuestion[] }
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    if (questions.length >= 3) return questions.slice(0, 4)
  } catch (error) {
    logger.warn('groq', `Failed to generate with Groq: ${error}, using fallback`)
    // Fall through to deterministic fallback.
  }

  return getFallbackQuestions(body.furnitureType ?? 'sofa', body.roomAnalysis ?? undefined)
}

export async function POST(req: NextRequest) {
  const logger = new ApiLogger('POST /api/generate-questions')

  // Attach user ID for per-user prod log files (non-blocking)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    logger.setUserId(user?.id ?? null)
  } catch { /* auth resolution must not break the request */ }

  try {
    const body = await req.json()
    
    logger.debug('validation', 'Validating request', {
      furnitureType: body.furnitureType,
      roomType: body.roomType,
      hasRoomAnalysis: body.roomAnalysis != null,
      roomSummaryLength: body.roomAnalysis?.roomSummary?.length ?? 0,
      furnitureNeedsCount: body.roomAnalysis?.furnitureNeeds?.length ?? 0,
      spatialConstraints: body.roomAnalysis?.spatialConstraints ?? [],
    })

    // Validate request
    if (!validateGenerateQuestionsRequest(body)) {
      logger.warn('validation', 'Request validation failed')
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'furnitureType and roomType are required'),
        { status: 400 }
      )
    }

    const questions = await generateWithGroq(body, logger)
    logger.success('complete', `Generated ${questions.length} questions`)

    // Return flat shape to match frontend contract: { questions: [...] }
    return NextResponse.json({ questions }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate questions'
    logger.error('error', message, error as Error)
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', message, true),
      { status: 500 }
    )
  }
}
