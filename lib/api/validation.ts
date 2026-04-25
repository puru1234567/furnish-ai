// lib/api/validation.ts
// Request/Response validation helpers

import type { AnalyzeRoomRequest, GenerateQuestionsRequest, RecommendRequest } from './dtos'
import type { UserContext } from '@/lib/types'

/**
 * Validate AnalyzeRoomRequest
 */
export function validateAnalyzeRoomRequest(data: unknown): data is AnalyzeRoomRequest {
  if (!data || typeof data !== 'object') return false
  const req = data as Record<string, unknown>

  // Check required: images array
  if (!Array.isArray(req.images)) return false
  if (req.images.length === 0 || req.images.length > 4) return false
  if (!req.images.every(img => typeof img === 'string' && img.startsWith('data:image/'))) return false

  // Check optional: furnitureType, roomType
  if (req.furnitureType && typeof req.furnitureType !== 'string') return false
  if (req.roomType && typeof req.roomType !== 'string') return false

  return true
}

/**
 * Validate GenerateQuestionsRequest
 */
export function validateGenerateQuestionsRequest(data: unknown): data is GenerateQuestionsRequest {
  if (!data || typeof data !== 'object') return false
  const req = data as Record<string, unknown>

  // Check required fields
  if (typeof req.furnitureType !== 'string') return false
  if (typeof req.roomType !== 'string') return false

  // roomAnalysis can be null or object
  if (req.roomAnalysis !== null && typeof req.roomAnalysis !== 'object') return false

  return true
}

/**
 * Validate RecommendRequest (UserContext)
 */
export function validateRecommendRequest(data: unknown): data is RecommendRequest {
  if (!data || typeof data !== 'object') return false
  const ctx = data as Record<string, unknown>

  // Check required fields
  if (typeof ctx.roomType !== 'string') return false
  if (typeof ctx.roomSqft !== 'number' || ctx.roomSqft <= 0) return false
  if (typeof ctx.city !== 'string') return false
  if (typeof ctx.budget !== 'number' || ctx.budget <= 0) return false
  if (typeof ctx.budgetMax !== 'number' || ctx.budgetMax <= 0) return false
  if (typeof ctx.deliveryOk !== 'boolean') return false
  if (typeof ctx.urgency !== 'string') return false

  // Check pain point array
  if (!Array.isArray(ctx.painPoint)) return false

  // Check style preference array
  if (!Array.isArray(ctx.stylePreference)) return false

  // Check use case array
  if (!Array.isArray(ctx.useCase)) return false

  return true
}

/**
 * Sanitize error details for client response
 */
export function sanitizeError(error: unknown, isDevelopment: boolean = false): { message: string; details?: unknown } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: isDevelopment ? { stack: error.stack } : undefined,
    }
  }

  return {
    message: String(error) || 'Unknown error',
    details: isDevelopment ? { raw: error } : undefined,
  }
}
