/**
 * questions-prompt.ts
 * System prompt for the contextual question generation step.
 *
 * Role: system message only — instructs the model on HOW to generate.
 * The room context data is sent separately as the user message.
 */

export const QUESTIONS_SYSTEM_PROMPT = `
You are a furniture advisor generating follow-up questions tailored to a specific room.
You receive room analysis data from computer vision and must generate 3–4 short, conversational questions
that would help pick the best furniture for THAT room specifically.

OUTPUT — return ONLY valid JSON, no markdown, no prose:
{"questions":[{"id":"<snake_case_id>","question":"<≤12 words>?","options":[{"id":"<snake_case>","label":"<≤6 words>"}]}]}

RULES:
- 2–4 options per question
- Every question must be grounded in the room data provided — reference a specific detail (e.g. the existing furniture, spatial constraint, layout, or identified need)
- Focus on: seating intent, size fit, durability, guest use, storage access, or work setup
- FORBIDDEN: generic style or aesthetic questions ("What style do you prefer?") unless the room analysis shows a clear unresolved style mismatch
- If spatialConstraints includes narrow / tight / limited / small → ask about compact fit, NOT general size
- If existingFurniture includes kid / toy / crib / stroller → ask durability first, not aesthetics
- If confidence is below 0.6 → only ask about primary use intent and durability, skip spatial specifics
- If furnitureNeeds has specific items → ask questions that help prioritise between those needs
- No duplicate or redundant questions across the 3–4 generated
- Question wording must be user-facing and conversational — no technical field names
`.trim()

/**
 * Build the user message containing all room context for question generation.
 * Separated from the system prompt so the model keeps instructions vs data distinct.
 */
export function buildQuestionUserMessage(body: {
  furnitureType?: string
  roomType?: string
  roomAnalysis?: {
    roomSummary?: string
    furnitureNeeds?: string[]
    existingFurniture?: string[]
    spatialConstraints?: string[]
    lighting?: string
    roomLayout?: string
    wallColor?: { id: string; label: string }
    floorType?: { id: string; label: string }
    styleProfile?: { id: string; description: string }
    colorPalette?: string[]
    softFurnishings?: string[]
    confidenceScore?: number
  } | null
}): string {
  const r = body.roomAnalysis

  return [
    `FURNITURE TYPE: ${body.furnitureType ?? 'unspecified'}`,
    `ROOM TYPE: ${body.roomType ?? 'unspecified'}`,
    '',
    '--- ROOM ANALYSIS ---',
    `Summary: ${r?.roomSummary ?? 'not available'}`,
    `Confidence: ${r?.confidenceScore != null ? `${Math.round(r.confidenceScore * 100)}%` : 'unknown'}`,
    `Layout: ${r?.roomLayout ?? 'unknown'}`,
    `Wall colour: ${r?.wallColor?.label ?? 'unknown'}`,
    `Floor type: ${r?.floorType?.label ?? 'unknown'}`,
    `Style profile: ${r?.styleProfile?.id ?? 'unknown'} — ${r?.styleProfile?.description ?? ''}`,
    `Lighting: ${r?.lighting ?? 'unknown'}`,
    `Colour palette: ${r?.colorPalette?.join(', ') ?? 'unknown'}`,
    `Spatial constraints: ${r?.spatialConstraints?.join(', ') || 'none detected'}`,
    `Furniture needs identified: ${r?.furnitureNeeds?.join(', ') || 'none'}`,
    `Existing furniture: ${r?.existingFurniture?.join(', ') || 'none visible'}`,
    `Soft furnishings: ${r?.softFurnishings?.join(', ') || 'none visible'}`,
    '',
    'Generate 3–4 questions that are specific to THIS room and THIS furniture type.',
  ].join('\n')
}
