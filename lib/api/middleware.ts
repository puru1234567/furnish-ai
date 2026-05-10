// lib/api/middleware.ts
// Request/response middleware for standardized validation and error handling
// Follows middleware pattern for clean separation of concerns

import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, ApiError, ApiErrorResponse } from './dtos'

/**
 * Type-safe API route handler wrapper
 * 
 * Handles:
 * - Request validation
 * - Error handling with consistent shape
 * - Type-safe response
 * 
 * Usage:
 * export const POST = apiHandler(validateRecommendRequest, async (req, data) => {
 *   // data is already type-safe and validated
 *   return { success: true, data: result }
 * })
 */
export function apiHandler<TRequest, TResponse>(
  validator: (data: unknown) => data is TRequest,
  handler: (req: NextRequest, data: TRequest) => Promise<{ success: true; data: TResponse } | ApiErrorResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()

      // Validate request
      if (!validator(body)) {
        return NextResponse.json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Request validation failed',
            false,
            { received: body }
          ),
          { status: 400 }
        )
      }

      // Call handler with validated data
      const result = await handler(req, body)

      if (!result.success) {
        return NextResponse.json(result, { status: 400 })
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('[apiHandler] Error:', err)

      return NextResponse.json(
        createErrorResponse(
          'INTERNAL_ERROR',
          err.message || 'Internal server error',
          true,
          process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
        ),
        { status: 500 }
      )
    }
  }
}

/**
 * Create an error response with consistent shape
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

/**
 * Create a success response with consistent shape
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}
