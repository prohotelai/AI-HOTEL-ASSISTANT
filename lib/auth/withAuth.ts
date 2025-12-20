/**
 * Authentication Middleware
 * Validates session and extracts user context
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
 * Middleware to enforce authentication
 * Ensures user is logged in and has hotelId
 * 
 * @example
 * export const GET = withAuth(async (req, ctx) => {
 *   const { userId, hotelId, role } = ctx
 *   // Handler logic
 * })
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, ctx: AuthContext, params?: T) => Promise<Response>
) {
  return async function (req: NextRequest, params?: T): Promise<Response> {
    try {
      const session = await getServerSession(authOptions)

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }

      const user = session.user as any

      if (user.isSuspended) {
        return NextResponse.json(
          {
            error: 'Account suspended',
            message: 'Your account has been suspended. Contact an administrator for assistance.'
          },
          { status: 403 }
        )
      }

      // Ensure hotel scoping
      if (!user.hotelId) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'No hotel association found' },
          { status: 403 }
        )
      }

      const context: AuthContext = {
        userId: user.id,
        hotelId: user.hotelId,
        role: user.role || 'staff',
        email: user.email || undefined
      }

      return await handler(req, context, params)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication check failed' },
        { status: 500 }
      )
    }
  }
}
