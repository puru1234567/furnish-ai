/**
 * roomVision.ts
 * Dedicated Gemini Vision module for multi-angle room analysis.
 * Accepts up to 4 base64-encoded room images and returns a structured
 * RoomContext object that is fed directly into the recommendation engine.
 */

const ROOM_VISION_SYSTEM_PROMPT = `
You are an expert interior-design analyst and spatial intelligence model.
You have been given between 1 and 4 photographs of the same room taken from different sides (front wall, left wall, right wall, back/entry wall).

Your task is to perform a comprehensive, professional-grade room analysis and return a single JSON object.

ANALYSIS INSTRUCTIONS:
────────────────────────────────────────────────────────────────
1. WALL COLOR
   - Identify the dominant wall color across all photos.
   - Use one of: "cream_offwhite", "beige_sand", "sage_green", "blue_grey", "dark_charcoal", "white_pure", "terracotta", "blush_pink", "navy", "other"
   - Also provide a human-readable label e.g. "Warm off-white with cream undertones"

2. FLOOR TYPE
   - Identify the primary flooring material.
   - Use one of: "hardwood", "engineered_wood", "marble", "vitreous_tile", "ceramic_tile", "cement_screed", "carpet", "vinyl_laminate", "stone", "other"
   - Also provide a human-readable label.

3. ROOM LAYOUT
   - Infer the spatial configuration from all available angles.
   - Use one of: "standard_rectangular", "l_shaped", "narrow_rectangular", "open_plan", "square", "irregular"

4. ESTIMATED DIMENSIONS
   - Estimate approximate room dimensions in feet using furniture as scale references.
   - Provide estimatedWidthFt and estimatedDepthFt as integers.
   - If insufficient data, use null.

5. STYLE PROFILE
   - Identify the existing interior style.
   - Use one of: "modern_minimal", "warm_natural", "classic_traditional", "contemporary_bold", "boho_eclectic", "industrial", "scandinavian", "transitional", "undefined"
   - Provide a 1-sentence style description.

6. COLOR PALETTE
   - List up to 5 dominant colors visible in the room (furniture, walls, accents) as hex codes.

7. LIGHTING
   - Assess the natural and artificial lighting quality.
   - Use one of: "bright_natural", "moderate_natural", "low_natural", "artificial_warm", "artificial_cool", "mixed"

8. EXISTING FURNITURE
   - List key furniture pieces already present (use concise labels, e.g. "3-seater sofa", "wooden coffee table", "ceiling fan").
   - Maximum 8 items. Empty array if none visible.

9. SPATIAL CONSTRAINTS
   - Note any spatial challenges: low ceiling, pillar/column obstruction, irregular walls, limited floor space, etc.
   - Empty array if none.

10. CONFIDENCE SCORE
    - Provide a confidence score from 0.0 to 1.0 for the overall analysis.
    - Lower score if fewer photos are provided or room is cluttered/dark.

REQUIRED OUTPUT SHAPE:
{
  "wallColor": { "id": "cream_offwhite", "label": "Warm off-white with cream undertones" },
  "floorType": { "id": "hardwood", "label": "Medium-tone hardwood flooring" },
  "roomLayout": "standard_rectangular",
  "estimatedWidthFt": 12,
  "estimatedDepthFt": 15,
  "styleProfile": { "id": "modern_minimal", "description": "Clean-lined modern room with minimal clutter and neutral finishes." },
  "colorPalette": ["#E8E0D4", "#A88F7A", "#F5F2EA"],
  "lighting": "bright_natural",
  "existingFurniture": ["3-seater sofa", "TV unit"],
  "spatialConstraints": ["narrow walkway near entry"],
  "confidenceScore": 0.84
}

CRITICAL RULES:
- Return ONLY the JSON object. No markdown fences, no commentary, no preamble.
- All string enum values must match exactly as listed above.
- If a field cannot be determined with reasonable confidence, use null.
- Be generous with existing furniture — even partial visibility counts.
- Do NOT hallucinate room features not visible in any photo.
`.trim()

export interface RoomAnalysisResult {
  wallColor: {
    id: string
    label: string
  }
  floorType: {
    id: string
    label: string
  }
  roomLayout: string
  estimatedWidthFt: number | null
  estimatedDepthFt: number | null
  styleProfile: {
    id: string
    description: string
  }
  colorPalette: string[]
  lighting: string
  existingFurniture: string[]
  spatialConstraints: string[]
  confidenceScore: number
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => readString(item)).filter((item): item is string => item !== null)
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function pickFirst(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in source) return source[key]
  }
  return undefined
}

function readNestedNumber(source: Record<string, unknown>, parentKeys: string[], childKeys: string[]): number | null {
  for (const parentKey of parentKeys) {
    const parent = readObject(source[parentKey])
    if (!parent) continue

    for (const childKey of childKeys) {
      const value = readNumber(parent[childKey])
      if (value !== null) return value
    }
  }

  return null
}

function readStringArrayFlexible(source: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const direct = readStringArray(source[key])
    if (direct.length > 0) return direct

    const nested = readObject(source[key])
    if (!nested) continue

    const nestedItems = readStringArray(pickFirst(nested, ['items', 'values', 'list']))
    if (nestedItems.length > 0) return nestedItems
  }

  return []
}

function readLabeledField(
  value: unknown,
  fallbackId: string,
  fallbackLabel: string
): { id: string; label: string } {
  if (typeof value === 'string' && value.trim()) {
    return { id: value.trim(), label: value.trim().replace(/_/g, ' ') }
  }

  if (value && typeof value === 'object') {
    const candidate = value as { id?: unknown; label?: unknown; value?: unknown; name?: unknown; description?: unknown }
    const id =
      readString(candidate.id) ??
      readString(candidate.value) ??
      readString(candidate.name) ??
      fallbackId
    const label =
      readString(candidate.label) ??
      readString(candidate.description) ??
      readString(candidate.name) ??
      readString(candidate.id)?.replace(/_/g, ' ') ??
      readString(candidate.value)?.replace(/_/g, ' ') ??
      fallbackLabel
    return { id, label }
  }

  return { id: fallbackId, label: fallbackLabel }
}

function normalizeRoomAnalysis(raw: unknown): RoomAnalysisResult {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  //console.log('Raw Gemini Vision output:', JSON.stringify(candidate, null, 2))
  const confidence = readNumber(pickFirst(candidate, ['confidenceScore', 'confidence_score', 'confidence']))
  const wallColorValue = pickFirst(candidate, ['wallColor', 'wall_color', 'dominantWallColor', 'dominant_wall_color'])
  const floorTypeValue = pickFirst(candidate, ['floorType', 'floor_type', 'flooring', 'primaryFloorType', 'primary_floor_type'])
  const roomLayoutValue = pickFirst(candidate, ['roomLayout', 'room_layout', 'layout', 'roomShape', 'room_shape'])
  const styleProfileValue = pickFirst(candidate, ['styleProfile', 'style_profile', 'style', 'interiorStyle', 'interior_style'])
  const lightingValue = pickFirst(candidate, ['lighting', 'lightingType', 'lighting_type', 'lightQuality', 'light_quality'])

  return {
    wallColor: readLabeledField(wallColorValue, 'other', 'Not detected'),
    floorType: readLabeledField(floorTypeValue, 'other', 'Not detected'),
    roomLayout: readString(roomLayoutValue) ?? 'not_detected',
    estimatedWidthFt:
      readNumber(pickFirst(candidate, ['estimatedWidthFt', 'estimated_width_ft', 'roomWidthFt', 'room_width_ft'])) ??
      readNestedNumber(candidate, ['dimensions', 'estimatedDimensions', 'estimated_dimensions'], ['widthFt', 'width_ft', 'estimatedWidthFt', 'estimated_width_ft']),
    estimatedDepthFt:
      readNumber(pickFirst(candidate, ['estimatedDepthFt', 'estimated_depth_ft', 'roomDepthFt', 'room_depth_ft'])) ??
      readNestedNumber(candidate, ['dimensions', 'estimatedDimensions', 'estimated_dimensions'], ['depthFt', 'depth_ft', 'estimatedDepthFt', 'estimated_depth_ft']),
    styleProfile: valueToStyleProfile(styleProfileValue),
    colorPalette: readStringArrayFlexible(candidate, ['colorPalette', 'color_palette', 'palette', 'dominantColors', 'dominant_colors']),
    lighting: readString(lightingValue) ?? 'not_detected',
    existingFurniture: readStringArrayFlexible(candidate, ['existingFurniture', 'existing_furniture', 'furniture', 'visibleFurniture', 'visible_furniture']),
    spatialConstraints: readStringArrayFlexible(candidate, ['spatialConstraints', 'spatial_constraints', 'constraints', 'roomConstraints', 'room_constraints']),
    confidenceScore: confidence === null ? 0 : Math.min(1, Math.max(0, confidence)),
  }
}

function valueToStyleProfile(value: unknown): { id: string; description: string } {
  if (typeof value === 'string' && value.trim()) {
    return {
      id: value.trim(),
      description: value.trim().replace(/_/g, ' '),
    }
  }

  if (value && typeof value === 'object') {
    const candidate = value as { id?: unknown; description?: unknown }
    return {
      id: readString(candidate.id) ?? 'undefined',
      description: readString(candidate.description) ?? readString(candidate.id)?.replace(/_/g, ' ') ?? 'Not detected',
    }
  }

  return {
    id: 'undefined',
    description: 'Not detected',
  }
}

export async function analyzeRoomWithVision(
  base64Images: string[], // array of base64 data-url strings (1–4)
  apiKey: string
): Promise<RoomAnalysisResult> {
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY')
  if (base64Images.length === 0) throw new Error('At least one image is required')

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey

  // Build image parts — strip the data-url prefix to get raw base64 + mime
  const imageParts = base64Images.map(dataUrl => {
    const [header, data] = dataUrl.split(',')
    const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
    return {
      inline_data: {
        mime_type: mimeType,
        data,
      },
    }
  })

  // User message: label each image by its position slot
  const slotLabels = ['Front wall view', 'Left wall view', 'Right wall view', 'Back / entry wall view']
  const labelParts = base64Images.map((_, i) => ({
    text: `[Photo ${i + 1}: ${slotLabels[i] ?? `View ${i + 1}`}]`,
  }))

  // Interleave label + image pairs
  const contentParts: unknown[] = [
    { text: ROOM_VISION_SYSTEM_PROMPT },
    ...base64Images.flatMap((_, i) => [labelParts[i], imageParts[i]]),
    {
      text: 'Analyze all provided room photos together and return the unified JSON RoomAnalysisResult object.',
    },
  ]

  const body = {
    contents: [{ role: 'user', parts: contentParts }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
      candidate_count: 1,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini Vision API error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }

  const raw = data.candidates[0]?.content?.parts[0]?.text
  if (!raw) throw new Error('Gemini Vision returned empty response')

  return normalizeRoomAnalysis(JSON.parse(raw))
}
