import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

/**
 * POST /api/hotels/[hotelId]/services
 * Configure AI services during onboarding
 * 
 * CRITICAL ARCHITECTURE:
 * - Validates hotelId from admin session (never from request params alone)
 * - Uses UPSERT pattern: create or update ServiceConfig atomically
 * - Ensures trial subscription exists if needed
 * - Returns detailed error messages for debugging
 * 
 * Request body:
 * {
 *   services: {
 *     aiGuestChat: boolean,
 *     analyticsDashboard: boolean,
 *     guestPrivacyMode: boolean
 *   }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   services: {
 *     aiGuestChat: boolean,
 *     analyticsDashboard: boolean,
 *     guestPrivacyMode: boolean
 *   }
 * }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      logAuth('error', 'ENFORCEMENT: Services endpoint - no session', {})
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NO_SESSION' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    if (!hotelId) {
      logAuth('error', 'ENFORCEMENT: Services endpoint - missing hotelId', { userId })
      return NextResponse.json(
        { error: 'Missing hotelId in request', code: 'MISSING_HOTEL_ID' },
        { status: 400 }
      )
    }

    // Verify user belongs to this hotel and has OWNER role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user || user.hotelId !== hotelId) {
      logAuth('error', 'ENFORCEMENT: Services endpoint - unauthorized access', {
        userId,
        hotelId,
        userHotelId: user?.hotelId
      })
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel', code: 'UNAUTHORIZED_HOTEL' },
        { status: 403 }
      )
    }

    // Only OWNER can configure services
    if (user.role !== 'OWNER') {
      logAuth('error', 'ENFORCEMENT: Services endpoint - non-owner access', {
        userId,
        hotelId,
        role: user.role
      })
      return NextResponse.json(
        { error: 'Only hotel owners can configure services', code: 'OWNER_ONLY' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    let body: any
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    // Validate payload structure
    if (!body.services || typeof body.services !== 'object') {
      return NextResponse.json(
        {
          error: 'Missing or invalid services object',
          code: 'INVALID_SERVICES',
          expected: {
            services: {
              aiGuestChat: 'boolean',
              analyticsDashboard: 'boolean',
              guestPrivacyMode: 'boolean'
            }
          }
        },
        { status: 400 }
      )
    }

    const { aiGuestChat, analyticsDashboard, guestPrivacyMode } = body.services

    // Validate each service flag is a boolean
    if (typeof aiGuestChat !== 'boolean' || typeof analyticsDashboard !== 'boolean' || typeof guestPrivacyMode !== 'boolean') {
      return NextResponse.json(
        {
          error: 'All service flags must be boolean values',
          code: 'INVALID_SERVICE_FLAGS'
        },
        { status: 400 }
      )
    }

    // Use atomic transaction to:
    // 1. Ensure hotel exists
    // 2. Ensure trial subscription exists (if none active)
    // 3. UPSERT ServiceConfig
    const result = await prisma.$transaction(async (tx) => {
      // Verify hotel exists
      const hotel = await tx.hotel.findUnique({
        where: { id: hotelId },
        select: { id: true, subscriptionPlan: true, subscriptionStatus: true }
      })

      if (!hotel) {
        throw new Error('Hotel not found')
      }

      // If no active subscription, ensure STARTER/TRIALING status
      // (Hotel creation already sets these defaults, but being explicit here)
      if (hotel.subscriptionStatus !== 'ACTIVE' && hotel.subscriptionStatus !== 'TRIALING') {
        // Update hotel to TRIALING if needed
        await tx.hotel.update({
          where: { id: hotelId },
          data: {
            subscriptionStatus: 'TRIALING',
            subscriptionPlan: 'STARTER',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14-day trial
          }
        })
      }

      // UPSERT ServiceConfig: create if doesn't exist, update if does
      const serviceConfig = await tx.serviceConfig.upsert({
        where: { hotelId },
        create: {
          hotelId,
          aiGuestChat,
          analyticsDashboard,
          guestPrivacyMode,
          configuredBy: userId,
          configuredAt: new Date()
        },
        update: {
          aiGuestChat,
          analyticsDashboard,
          guestPrivacyMode,
          updatedAt: new Date()
        }
      })

      return serviceConfig
    })

    logAuth('info', 'Services configured successfully', {
      hotelId,
      userId,
      services: { aiGuestChat, analyticsDashboard, guestPrivacyMode }
    })

    return NextResponse.json({
      success: true,
      services: {
        aiGuestChat: result.aiGuestChat,
        analyticsDashboard: result.analyticsDashboard,
        guestPrivacyMode: result.guestPrivacyMode
      }
    })
  } catch (error: any) {
    console.error('Configure services error:', error)

    // Determine error type and message
    let statusCode = 500
    let errorMessage = 'Failed to save service configuration'
    let errorCode = 'INTERNAL_ERROR'

    if (error.message === 'Hotel not found') {
      statusCode = 404
      errorMessage = 'Hotel not found'
      errorCode = 'HOTEL_NOT_FOUND'
    } else if (error.message.includes('Unique constraint')) {
      statusCode = 409
      errorMessage = 'Service configuration already exists'
      errorCode = 'DUPLICATE_CONFIG'
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}
