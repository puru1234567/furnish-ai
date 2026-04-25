/**
 * groq-client.ts
 * Shared Groq API wrapper for all endpoints.
 * Handles: chat completions (text), vision completions (multimodal), error surfacing,
 * and automatic retries with exponential backoff.
 */

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 500
const MAX_DELAY_MS = 10000

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

interface GroqChatRetryParams {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
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
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
  // Add jitter: ±20% of the delay
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1)
  return Math.round(exponentialDelay + jitter)
}

/**
 * Check if error is retriable
 */
function isRetriableError(status: number, error: Error): boolean {
  // Retry on 429 (rate limit), 500-599 (server errors), and timeout
  if (status === 429 || status >= 500) return true
  if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) return true
  return false
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Sends a chat completion request to Groq and returns the raw text content.
 * Implements automatic retries with exponential backoff for transient failures.
 *
 * @param params - Chat completion parameters
 * @param retryParams - Retry configuration
 * @throws Error on non-retriable errors or max retries exceeded
 */
export async function callGroqChat(
  params: GroqChatParams,
  retryParams: GroqChatRetryParams = {}
): Promise<string> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = MAX_DELAY_MS,
  } = retryParams

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
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
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!res.ok) {
        const errorText = await res.text()
        const error = new Error(`Groq API error ${res.status}: ${errorText}`)

        // Check if error is retriable and we have retries left
        if (isRetriableError(res.status, error) && attempt < maxRetries) {
          lastError = error
          const delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs)
          console.warn(
            `[groq-client] Retriable error on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delayMs}ms...`,
            error.message
          )
          await sleep(delayMs)
          continue
        }

        throw error
      }

      const data = (await res.json()) as GroqChoiceResponse
      const content = data.choices[0]?.message?.content
      if (!content) throw new Error('Groq returned an empty response')
      return content
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // If retriable and retries remain, try again
      if (isRetriableError(500, err) && attempt < maxRetries) {
        lastError = err
        const delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs)
        console.warn(
          `[groq-client] Retriable error on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${delayMs}ms...`,
          err.message
        )
        await sleep(delayMs)
        continue
      }

      // Not retriable or retries exhausted
      throw err
    }
  }

  // If we exhausted retries
  throw new Error(
    `Groq API failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message ?? 'Unknown'}`
  )
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
