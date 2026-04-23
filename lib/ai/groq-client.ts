/**
 * groq-client.ts
 * Shared Groq API wrapper for all three endpoints.
 * Handles: chat completions (text), vision completions (multimodal), error surfacing.
 */

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | unknown[]
}

interface GroqChatParams {
  model: string
  messages: GroqMessage[]
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

interface GroqChoiceResponse {
  choices: Array<{ message: { content: string } }>
}

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY ?? ''
  if (!key) throw new Error('GROQ_API_KEY environment variable is not set')
  return key
}

/**
 * Sends a chat completion request to Groq and returns the raw text content.
 * Throws on non-2xx response so callers can apply fallback logic.
 */
export async function callGroqChat(params: GroqChatParams): Promise<string> {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.1,
      max_tokens: params.maxTokens ?? 1500,
      ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Groq API error ${res.status}: ${errorText}`)
  }

  const data = await res.json() as GroqChoiceResponse
  const content = data.choices[0]?.message?.content
  if (!content) throw new Error('Groq returned an empty response')
  return content
}

/**
 * Sends a vision (multimodal) request to Groq and returns parsed JSON.
 * Used exclusively by the room analysis endpoint.
 */
export async function callGroqVision(params: {
  model: string
  systemPrompt: string
  userTextParts: string[]
  base64Images: string[]
  maxTokens?: number
}): Promise<unknown> {
  const imageContentParts = params.base64Images.map(dataUrl => ({
    type: 'image_url',
    image_url: { url: dataUrl },
  }))

  const userContent: unknown[] = [
    { type: 'text', text: params.userTextParts.join(' ') },
    ...imageContentParts,
  ]

  const rawContent = await callGroqChat({
    model: params.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user',   content: userContent },
    ],
    temperature: 0.1,
    maxTokens: params.maxTokens ?? 2048,
    jsonMode: true,
  })

  return JSON.parse(rawContent)
}
