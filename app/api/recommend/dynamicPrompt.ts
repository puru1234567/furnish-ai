// This module loads the latest PROMPT.md and injects dynamic values for the AI system prompt.
import fs from 'fs/promises'
import path from 'path'

export async function getDynamicSystemPrompt(params: Record<string, unknown>): Promise<string> {
  const promptPath = path.join(process.cwd(), 'PROMPT.md')
  let prompt = await fs.readFile(promptPath, 'utf8')

  // Replace placeholders with actual values from params
  for (const [key, value] of Object.entries(params)) {
    const re = new RegExp(`{{${key}}}`, 'g')
    prompt = prompt.replace(re, typeof value === 'string' ? value : JSON.stringify(value))
  }
  return prompt
}
