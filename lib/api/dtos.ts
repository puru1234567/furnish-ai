// lib/api/dtos.ts
// Request and response DTOs for all API endpoints

import type { UserContext, RoomAnalysis, RecommendedItem, ContextualQuestion } from '@/lib/types'

/**
 * Request/Response types ensure client/server contract clarity
 * and enable versioning without tight coupling
 */

// ─────────────────────────────────────────────────────────────
// /api/analyze-room
// ─────────────────────────────────────────────────────────────

export interface AnalyzeRoomRequest {
  images: string[] // 1-4 base64 data-URLs
  furnitureType?: string
  roomType?: string
}

export interface AnalyzeRoomResponse {
  wallColor: RoomAnalysis['wallColor']
  floorType: RoomAnalysis['floorType']
  roomLayout: string
  estimatedWidthFt: number | null
  estimatedDepthFt: number | null
  styleProfile: RoomAnalysis['styleProfile']
  colorPalette: string[]
  lighting: string
  existingFurniture: string[]
  spatialConstraints: string[]
  furnitureNeeds: string[]
  softFurnishings: string[]
  roomSummary: string
  confidenceScore: number
  confidence_signals?: string[]
}

// ─────────────────────────────────────────────────────────────
// /api/generate-questions
// ─────────────────────────────────────────────────────────────

export interface GenerateQuestionsRequest {
  furnitureType: string
  roomType: string
  roomAnalysis: RoomAnalysis | null
}

export interface GenerateQuestionsResponse {
  questions: ContextualQuestion[]
}

// ─────────────────────────────────────────────────────────────
// /api/recommend
// ─────────────────────────────────────────────────────────────

export interface RecommendRequest extends UserContext {
  // UserContext is the request type
}

export interface RecommendResponse {
  summary: string
  archetypeLabel: string
  contextInsights: string[]
  visionSummary: string | null
  items: RecommendedItem[]
  flaggedIssues: string[]
}

// ─────────────────────────────────────────────────────────────
// Error Response (consistent across all endpoints)
// ─────────────────────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
  retriable: boolean
  details?: unknown
}

export interface ApiErrorResponse {
  success: false
  error: ApiError
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data }
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  retriable: boolean = false,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, retriable, details },
  }
}
