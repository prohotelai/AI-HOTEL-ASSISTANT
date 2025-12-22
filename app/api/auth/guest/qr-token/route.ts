export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API - Generate Guest QR Token
 * 
 * POST /api/auth/guest/qr-token
 * Generate QR code token for guest access
 * 
 * Error Handling:
 * - 400: Invalid input (missing fields)
 * - 403: Insufficient permissions (handled by withRole)
 * - 500: Database errors (wrapped in try/catch)
 * - Comprehensive logging with userId, hotelId, role, endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRole } from '@/lib/middleware/rbac'
import { generateGuestQRToken } from '@/lib/auth/guestAuth'
import { badRequest, internalError } from '@/lib/api/errorHandler'

/**
 * POST /api/auth/guest/qr-token
 * Generate QR token for guest after check-in
 */
export const POST = withRole(['owner', 'manager', 'reception'])(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const userId = user?.id
    const hotelId = user?.hotelId

    // Parse request body with error handling
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      return badRequest(
        'Invalid JSON in request body',
        { userId, hotelId, endpoint: '/api/auth/guest/qr-token', method: 'POST' }
      )
    }

    const { guestId, stayId } = body

    // Validate required fields
    if (!guestId || !stayId) {
      return badRequest(
        'Guest ID and stay ID are required',
        { userId, hotelId, endpoint: '/api/auth/guest/qr-token', method: 'POST' },
        {
          missing: [
            !guestId && 'guestId',
            !stayId && 'stayId'
          ].filter(Boolean)
        }
      )
    }

    // DB operation: wrapped in try/catch
    const result = await generateGuestQRToken(
      guestId,
      hotelId
    )

    if (!result.success) {
      return badRequest(
        result.error || 'Failed to generate QR token',
        { userId, hotelId, endpoint: '/api/auth/guest/qr-token', method: 'POST' }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'QR token generated successfully',
      token: (result as any).token,
      qrCode: (result as any).qrCode,
      instructions: {
        ar: 'قم بطباعة أو إرسال رمز QR للنزيل. يمكنه مسحه للدخول بسرعة.',
        en: 'Print or send the QR code to the guest. They can scan it for quick access.'
      }
    })
  } catch (error: any) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    return internalError(
      error,
      { userId: user?.id, hotelId: user?.hotelId, endpoint: '/api/auth/guest/qr-token', method: 'POST' },
      'Failed to generate QR token'
    )
  }
})
