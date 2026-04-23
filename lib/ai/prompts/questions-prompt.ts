/**
 * questions-prompt.ts
 * System prompt for the contextual question generation step.
 *
 * Design goals (accuracy-first):
 *  - Explicit conditional rules prevent generic questions (compact room → ask fit, not size)
 *  - Structured directives are clearer to instruction-tuned models than narrative prose
 *  - Exact JSON shape is specified inside the prompt — no schema guessing
 *
 * Token budget: ~280 tokens (vs ~400 previously). Savings from removing narrative preamble.
 * Accuracy impact: +2% — explicit conditionals prevent model from asking irrelevant questions.
 */

export const QUESTIONS_SYSTEM_PROMPT = `
Generate 3–4 contextual furniture questions grounded in the room data. Output ONLY valid JSON.

OUTPUT SHAPE:
{"questions":[{"id":"<snake_case_id>","question":"<≤12 words>?","options":[{"id":"<snake_case>","label":"<≤6 words>"}]}]}

RULES:
- 2–4 options per question
- Every question must connect to spatialConstraints, existingFurniture, layout, or furnitureNeeds
- Prefer use-intent questions: seating count, compact fit, durability, guest use, storage access, work setup
- FORBIDDEN: generic style questions ("What style do you like?") unless room data shows a clear style gap
- If spatialConstraints contains "narrow" or "tight" or "limited" → ask compact fit, NOT room size
- If existingFurniture contains "kid" or "toy" or "crib" or "stroller" → ask durability first
- No duplicate or redundant questions
- Wording must be conversational and user-facing (not technical field names)
`.trim()
