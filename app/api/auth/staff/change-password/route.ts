export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API - Staff Password Change
 * 
 * POST /api/auth/staff/change-password
 * Change password for authenticated staff member
 * 
 * Error Handling:
 * - 400: Invalid input (missing fields, password requirements)
 * - 401: Unauthenticated (handled by withAuth)
 * - 500: Database errors (wrapped in try/catch)
 * - Comprehensive logging with userId, hotelId, endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withAuth } from '@/lib/middleware/rbac'
import { changeStaffPassword, setInitialPassword } from '@/lib/auth/staffAuth'
import { badRequest, internalError } from '@/lib/api/errorHandler'

/**
 * POST /api/auth/staff/change-password
 * Change password (with current password verification)
 */
export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const userId = user?.id

    // Parse request body with error handling
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      return badRequest(
        'Invalid JSON in request body',
        { userId, hotelId: user?.hotelId, endpoint: '/api/auth/staff/change-password', method: 'POST' }
      )
    }

    const { currentPassword, newPassword } = body

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return badRequest(
        'Current password and new password are required',
        { userId, hotelId: user?.hotelId, endpoint: '/api/auth/staff/change-password', method: 'POST' },
        {
          missing: [
            !currentPassword && 'currentPassword',
            !newPassword && 'newPassword'
          ].filter(Boolean)
        }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return badRequest(
        'New password must be at least 8 characters long',
        { userId, hotelId: user?.hotelId, endpoint: '/api/auth/staff/change-password', method: 'POST' }
      )
    }

    // DB operation: wrapped in try/catch
    const result = await changeStaffPassword(
      userId,
      currentPassword,
      newPassword
    )

    if (!result.success) {
      return badRequest(
        result.error || 'Password change failed',
        { userId, hotelId: user?.hotelId, endpoint: '/api/auth/staff/change-password', method: 'POST' }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error: any) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    return internalError(
      error,
      { userId: user?.id, hotelId: user?.hotelId, endpoint: '/api/auth/staff/change-password', method: 'POST' },
      'Failed to change password'
    )
  }
})
