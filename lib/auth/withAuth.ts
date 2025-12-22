/**
 * Authentication Middleware for API Routes
 * Validates NextAuth session and extracts user context
 * Works with refactored middleware for consistent auth flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface AuthContext {
  userId: string
  hotelId: string
  role: string
  email?: string
}

/**
 * Logger utility for auth errors
 */
function logAuth(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, any>
) {
  const timestamp = new Date().toISOString()
  const contextStr = context ? JSON.stringify(context) : ''
  console.log(`[${timestamp}] [AUTH-${level.toUpperCase()}] ${message} ${contextStr}`)
}

/**
 * Middleware to enforce authentication on API routes
 * Returns 401 if not authenticated
 * Returns 403 if missing hotelId or suspended
 * Never throws - always returns Response
 *
 * @example
 * export const POST = withAuth(async (req, ctx) => {
 *   const { userId, hotelId, role } = ctx
 *   // Handler logic
 *   return NextResponse.json({ success: true })
 * })
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, ctx: AuthContext, params?: T) => Promise<Response>
) {
  return async function (req: NextRequest, params?: T): Promise<Response> {
    try {
      // Rule: Extract session safely
      const session = await getServerSession(authOptions)

      // Rule 4: Return 401 for unauthenticated
      if (!session || !session.user) {
        logAuth('warn', 'API route accessed without session', {
          path: req.nextUrl.pathname
        })

        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Authentication required'
          },
          { status: 401 }
        )
      }

      const user = session.user as any

      // Rule: Check suspension status
      if (user.isSuspended) {
        logAuth('warn', 'Suspended user attempted access', {
          userId: user.id,
          path: req.nextUrl.pathname
        })

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'Your account has been suspended. Contact an administrator for assistance.'
          },
          { status: 403 }
        )
      }

      // Rule 6: Never depend on hotelId before auth
      // But after auth, ensure hotel association
      if (!user.hotelId) {
        logAuth('error', 'Authenticated user missing hotelId', {
          userId: user.id,
          path: req.nextUrl.pathname
        })

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'No hotel association found'
          },
          { status: 403 }
        )
      }

      // Rule: Create auth context with all required fields
      const context: AuthContext = {
        userId: user.id,
        hotelId: user.hotelId,
        role: user.role || 'STAFF',
        email: user.email || undefined
      }

      logAuth('info', 'API route accessed with valid auth', {
        userId: context.userId,
        role: context.role,
        hotelId: context.hotelId,
        path: req.nextUrl.pathname
      })

      // Call the actual handler
      return await handler(req, context, params)
    } catch (error) {
      // Rule 4: Return 500 on unexpected errors (not 401 or 403)
      logAuth('error', 'Auth middleware exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.nextUrl.pathname,
        stack: error instanceof Error ? error.stack : undefined
      })

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Authentication check failed'
        },
        { status: 500 }
      )
    }
  }
}
