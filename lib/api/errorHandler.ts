/**
 * API Error Handler Utility
 * 
 * Provides:
 * - Consistent error responses (no raw 500s)
 * - Error categorization (400, 401, 403, 500)
 * - Structured logging with context
 * - Safe error serialization
 */

import { NextResponse } from 'next/server'

export interface ErrorLogContext {
  hotelId?: string
  userId?: string
  role?: string
  endpoint: string
  method: string
  errorCode?: string
  [key: string]: any
}

/**
 * Log authentication error with structured context
 */
export function logAuthError(
  message: string,
  context: ErrorLogContext
) {
  const timestamp = new Date().toISOString()
  const { hotelId, userId, role, endpoint, method, errorCode, ...rest } = context
  
  console.error(`[${timestamp}] [AUTH-ERROR] ${message}`, {
    hotelId,
    userId,
    role,
    endpoint,
    method,
    errorCode,
    ...rest
  })
}

/**
 * Safe error response - never expose internal details in production
 */
function getSafeErrorMessage(error: any): string {
  if (error?.message) {
    // Extract only user-safe messages
    const msg = error.message.toLowerCase()
    
    // Database errors - generic
    if (msg.includes('unique') || msg.includes('conflict')) {
      return 'This record already exists'
    }
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return 'Record not found'
    }
    if (msg.includes('invalid') || msg.includes('bad')) {
      return 'Invalid input provided'
    }
    if (msg.includes('permission') || msg.includes('forbidden')) {
      return 'Permission denied'
    }
    if (msg.includes('unauthorized') || msg.includes('unauthenticated')) {
      return 'Authentication required'
    }
  }
  
  return 'An error occurred processing your request'
}

/**
 * 400 Bad Request - Invalid input, validation errors
 */
export function badRequest(
  message: string,
  context: ErrorLogContext,
  details?: Record<string, any>
) {
  logAuthError(`Bad Request: ${message}`, { ...context, errorCode: '400' })
  
  return NextResponse.json(
    {
      error: 'Bad Request',
      message,
      ...(details && { details })
    },
    { status: 400 }
  )
}

/**
 * 401 Unauthorized - Missing/invalid authentication
 */
export function unauthorized(
  message: string,
  context: ErrorLogContext
) {
  logAuthError(`Unauthorized: ${message}`, { ...context, errorCode: '401' })
  
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message
    },
    { status: 401 }
  )
}

/**
 * 403 Forbidden - Insufficient permissions/suspended account
 */
export function forbidden(
  message: string,
  context: ErrorLogContext
) {
  logAuthError(`Forbidden: ${message}`, { ...context, errorCode: '403' })
  
  return NextResponse.json(
    {
      error: 'Forbidden',
      message
    },
    { status: 403 }
  )
}

/**
 * 404 Not Found
 */
export function notFound(
  message: string,
  context: ErrorLogContext
) {
  logAuthError(`Not Found: ${message}`, { ...context, errorCode: '404' })
  
  return NextResponse.json(
    {
      error: 'Not Found',
      message
    },
    { status: 404 }
  )
}

/**
 * 409 Conflict - Resource already exists
 */
export function conflict(
  message: string,
  context: ErrorLogContext
) {
  logAuthError(`Conflict: ${message}`, { ...context, errorCode: '409' })
  
  return NextResponse.json(
    {
      error: 'Conflict',
      message
    },
    { status: 409 }
  )
}

/**
 * 500 Internal Server Error - Should be rare
 * NEVER expose error details in production
 */
export function internalError(
  error: any,
  context: ErrorLogContext,
  userMessage = 'An error occurred processing your request'
) {
  // Log full error for debugging
  logAuthError(`Internal Server Error`, {
    ...context,
    errorCode: '500',
    originalMessage: error?.message,
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
  })

  const response = {
    error: 'Internal Server Error',
    message: userMessage
  }

  // Only include details in development
  if (process.env.NODE_ENV === 'development') {
    (response as any).details = error?.message
  }

  return NextResponse.json(response, { status: 500 })
}

/**
 * Wrap async handler with comprehensive error handling
 * Ensures all DB operations are wrapped in try/catch
 *
 * @example
 * export const POST = withApiErrorHandler(async (req, ctx) => {
 *   const { hotelId, userId, role } = ctx
 *   // Your handler logic
 *   return NextResponse.json({ success: true })
 * }, 'POST', '/api/endpoint')
 */
export function withApiErrorHandler(
  handler: (req: any, ctx: any) => Promise<Response>,
  method: string,
  endpoint: string
) {
  return async (req: any, ctx?: any): Promise<Response> => {
    try {
      return await handler(req, ctx)
    } catch (error: any) {
      // Create error context
      const errorContext: ErrorLogContext = {
        hotelId: ctx?.hotelId,
        userId: ctx?.userId,
        role: ctx?.role,
        endpoint,
        method,
        errorCode: error?.code
      }

      // Return safe error response
      return internalError(error, errorContext)
    }
  }
}
