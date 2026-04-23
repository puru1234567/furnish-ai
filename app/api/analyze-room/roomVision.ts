/**
 * roomVision.ts
 * Dedicated Groq Vision module for multi-angle room analysis.
 * Moved system prompt to lib/ai/prompts/room-analysis-prompt.ts
 */

import { ROOM_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai/prompts/room-analysis-prompt'
import { callGroqVision } from '@/lib/ai/groq-client'

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
  furnitureNeeds: string[]
  roomSummary: string
  confidenceScore: number
}

interface AnalyzeRoomOptions {
  furnitureType?: string
  roomType?: string
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
  const wallColor = readLabeledField(wallColorValue, 'other', 'Not detected')
  const floorType = readLabeledField(floorTypeValue, 'other', 'Not detected')
  const roomLayout = readString(roomLayoutValue) ?? 'not_detected'
  const estimatedWidthFt =
    readNumber(pickFirst(candidate, ['estimatedWidthFt', 'estimated_width_ft', 'roomWidthFt', 'room_width_ft'])) ??
    readNestedNumber(candidate, ['dimensions', 'estimatedDimensions', 'estimated_dimensions'], ['widthFt', 'width_ft', 'estimatedWidthFt', 'estimated_width_ft'])
  const estimatedDepthFt =
    readNumber(pickFirst(candidate, ['estimatedDepthFt', 'estimated_depth_ft', 'roomDepthFt', 'room_depth_ft'])) ??
    readNestedNumber(candidate, ['dimensions', 'estimatedDimensions', 'estimated_dimensions'], ['depthFt', 'depth_ft', 'estimatedDepthFt', 'estimated_depth_ft'])
  const styleProfile = valueToStyleProfile(styleProfileValue)
  const existingFurniture = readStringArrayFlexible(candidate, ['existingFurniture', 'existing_furniture', 'furniture', 'visibleFurniture', 'visible_furniture'])
  const spatialConstraints = readStringArrayFlexible(candidate, ['spatialConstraints', 'spatial_constraints', 'constraints', 'roomConstraints', 'room_constraints'])
  const furnitureNeeds = readStringArrayFlexible(candidate, ['furnitureNeeds', 'furniture_needs', 'likelyNeeds', 'likely_needs'])
  const roomSummary = readString(pickFirst(candidate, ['roomSummary', 'room_summary', 'summary']))

  return {
    wallColor,
    floorType,
    roomLayout,
    estimatedWidthFt,
    estimatedDepthFt,
    styleProfile,
    colorPalette: readStringArrayFlexible(candidate, ['colorPalette', 'color_palette', 'palette', 'dominantColors', 'dominant_colors']),
    lighting: readString(lightingValue) ?? 'not_detected',
    existingFurniture,
    spatialConstraints,
    furnitureNeeds,
    roomSummary:
      roomSummary ??
      buildRoomSummary({
        roomLayout,
        estimatedWidthFt,
        estimatedDepthFt,
        wallColorLabel: wallColor.label,
        lighting: readString(lightingValue) ?? 'not_detected',
        existingFurniture,
        spatialConstraints,
      }),
    confidenceScore: confidence === null ? 0 : Math.min(1, Math.max(0, confidence)),
  }
}

function buildRoomSummary(input: {
  roomLayout: string
  estimatedWidthFt: number | null
  estimatedDepthFt: number | null
  wallColorLabel: string
  lighting: string
  existingFurniture: string[]
  spatialConstraints: string[]
}): string {
  const size = input.estimatedWidthFt && input.estimatedDepthFt
    ? `~${input.estimatedWidthFt}x${input.estimatedDepthFt} ft`
    : 'size not confidently detected'
  const furniture = input.existingFurniture.length > 0
    ? `visible furniture includes ${input.existingFurniture.slice(0, 3).join(', ')}`
    : 'very little existing furniture is visible'
  const constraints = input.spatialConstraints.length > 0
    ? `main constraint: ${input.spatialConstraints[0]}`
    : 'no major spatial constraint detected'
  return `${input.wallColorLabel} room with ${getReadableToken(input.roomLayout)}, ${size}, ${getReadableToken(input.lighting)} lighting; ${furniture}; ${constraints}.`
}

function getReadableToken(value: string): string {
  return value.replace(/_/g, ' ')
}

function inferFurnitureNeeds(result: RoomAnalysisResult, furnitureType?: string): string[] {
  const existing = result.existingFurniture.join(' ').toLowerCase()
  const constraints = result.spatialConstraints.join(' ').toLowerCase()
  const compactRoom = constraints.includes('narrow') || constraints.includes('tight') || constraints.includes('limited')

  switch (furnitureType) {
    case 'sofa':
      return [
        !existing.includes('sofa') ? 'needs_primary_seating' : 'upgrade_seating',
        compactRoom ? 'compact_footprint_needed' : 'comfortable_lounge_seating',
      ]
    case 'bed':
      return [
        !existing.includes('bed') ? 'needs_sleeping_surface' : 'upgrade_sleep_setup',
        compactRoom ? 'storage_bed_candidate' : 'comfort_first_sleeping',
      ]
    case 'desk':
      return [
        !existing.includes('desk') && !existing.includes('study table') ? 'needs_work_surface' : 'upgrade_workstation',
        compactRoom ? 'compact_workstation_needed' : 'dedicated_work_setup',
      ]
    case 'wardrobe':
      return [
        'needs_storage',
        compactRoom ? 'space_efficient_storage' : 'higher_capacity_storage',
      ]
    case 'dining-table':
      return [
        !existing.includes('dining') && !existing.includes('table') ? 'needs_dining_surface' : 'upgrade_dining_setup',
        compactRoom ? 'compact_dining_capacity' : 'shared_meal_capacity',
      ]
    case 'chair':
      return [
        'needs_additional_seating',
        compactRoom ? 'easy_to_move_seating' : 'comfort_or_accent_seating',
      ]
    default:
      return compactRoom ? ['compact_footprint_needed'] : ['fit_room_context']
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
  apiKey: string,
  options: AnalyzeRoomOptions = {}
): Promise<RoomAnalysisResult> {
  if (!apiKey) throw new Error('Missing GROQ_API_KEY')
  if (base64Images.length === 0) throw new Error('At least one image is required')

  // Use shared callGroqVi sion from lib/ai/groq-client
  const userTextParts = [
    `Selected furniture type: ${options.furnitureType ?? 'unspecified'}.`,
    `Declared room type: ${options.roomType ?? 'unspecified'}.`,
    `Photos provided: ${base64Images.map((_, i) => `Photo ${i + 1} = ${['Front wall view', 'Left wall view', 'Right wall view', 'Back / entry wall view'][i]}`).join('; ')}.`,
    'Analyze all provided room photos together and return the unified JSON RoomAnalysisResult object.',
  ]


  const raw = await callGroqVision({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    systemPrompt: ROOM_ANALYSIS_SYSTEM_PROMPT,
    userTextParts,
    base64Images,
    maxTokens: 2048,
  })

  // callGroqVision already parses JSON, so raw is an object
  const normalized = normalizeRoomAnalysis(raw as unknown)
  return {
    ...normalized,
    furnitureNeeds: normalized.furnitureNeeds.length > 0
      ? normalized.furnitureNeeds
      : inferFurnitureNeeds(normalized, options.furnitureType),
    roomSummary: normalized.roomSummary || buildRoomSummary({
      roomLayout: normalized.roomLayout,
      estimatedWidthFt: normalized.estimatedWidthFt,
      estimatedDepthFt: normalized.estimatedDepthFt,
      wallColorLabel: normalized.wallColor.label,
      lighting: normalized.lighting,
      existingFurniture: normalized.existingFurniture,
      spatialConstraints: normalized.spatialConstraints,
    }),
  }
}
