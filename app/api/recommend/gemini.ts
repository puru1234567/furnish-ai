// Gemini 3.1 Pro API call for recommendations
//import fetch from 'node-fetch'

export async function generateWithGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<unknown> {
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY')

  // Gemini API endpoint (Google AI Studio or Vertex)
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey

  const body = {
    contents: [
      { role: 'user', parts: [ { text: `${systemPrompt}\n\n${userPrompt}` } ] }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
      candidate_count: 1
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }
  // Gemini returns JSON in candidates[0].content.parts[0].text
  return JSON.parse(data.candidates[0].content.parts[0].text)
}
