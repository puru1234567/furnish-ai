import { NextRequest, NextResponse } from 'next/server'
import type { ContextualQuestion, RoomAnalysis } from '@/lib/types'
import { QUESTIONS_SYSTEM_PROMPT } from '@/lib/ai/prompts/questions-prompt'
import { getFallbackQuestions } from '@/lib/ai/prompts/question-fallbacks'
import { callGroqChat } from '@/lib/ai/groq-client'

interface QuestionRequestBody {
  furnitureType?: string
  roomAnalysis?: RoomAnalysis
  roomType?: string
}

async function generateWithGroq(body: QuestionRequestBody): Promise<ContextualQuestion[]> {
  const apiKey = process.env.GROQ_API_KEY ?? ''
  if (!apiKey) return getFallbackQuestions(body.furnitureType ?? 'sofa', body.roomAnalysis)

  const userPrompt = `${QUESTIONS_SYSTEM_PROMPT}

INPUT:
furnitureType=${body.furnitureType ?? 'unspecified'}
roomType=${body.roomType ?? 'unspecified'}
roomSummary=${body.roomAnalysis?.roomSummary ?? 'not available'}
furnitureNeeds=${(body.roomAnalysis?.furnitureNeeds ?? []).join(',')}
existingFurniture=${(body.roomAnalysis?.existingFurniture ?? []).join(',')}
spatialConstraints=${(body.roomAnalysis?.spatialConstraints ?? []).join(',')}
lighting=${body.roomAnalysis?.lighting ?? 'unknown'}
layout=${body.roomAnalysis?.roomLayout ?? 'unknown'}

Return 3 or 4 contextual questions.`

  try {
    const raw = await callGroqChat({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 1024,
      jsonMode: true,
    })
    const parsed = JSON.parse(raw) as { questions?: ContextualQuestion[] }
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    if (questions.length >= 3) return questions.slice(0, 4)
  } catch {
    // Fall through to deterministic fallback.
  }

  return getFallbackQuestions(body.furnitureType ?? 'sofa', body.roomAnalysis)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as QuestionRequestBody
    if (!body.furnitureType) {
      return NextResponse.json({ error: 'furnitureType is required' }, { status: 400 })
    }

    const questions = await generateWithGroq(body)
    return NextResponse.json({ questions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate questions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
