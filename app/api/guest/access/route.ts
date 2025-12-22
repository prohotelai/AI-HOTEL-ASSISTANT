import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/guest/access
 * Create ephemeral guest session via QR access
 * - No User record required
 * - Creates GuestSession with sessionToken
 * - Returns redirect URL to guest chat
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hotelId } = body

    if (!hotelId) {
      return NextResponse.json(
        { error: 'Hotel ID is required' },
        { status: 400 }
      )
    }

    // Verify hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true }
    })

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex')

    // Create guest session record
    const guestSession = await prisma.guestSession.create({
      data: {
        hotelId,
        sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    // Return redirect URL and session info
    return NextResponse.json({
      success: true,
      sessionId: guestSession.id,
      sessionToken: guestSession.sessionToken,
      redirectUrl: `/guest/chat?hotelId=${hotelId}&sessionId=${guestSession.id}`
    })
  } catch (error) {
    console.error('Guest access error:', error)
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    )
  }
}
