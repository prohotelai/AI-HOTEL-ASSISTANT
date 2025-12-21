import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/qr/resolve
 * Resolve QR token to context data (does NOT authenticate)
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    // Find QR token in database
    const qrToken = await prisma.guestStaffQRToken.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    })

    if (!qrToken) {
      return NextResponse.json(
        { error: 'Invalid or expired QR code' },
        { status: 404 }
      )
    }

    // Parse metadata for context data
    const metadata = qrToken.metadata ? JSON.parse(qrToken.metadata as string) : {}
    
    // Build context object based on role
    const context: any = {
      hotelId: qrToken.hotelId,
      hotelName: qrToken.hotel.name,
      role: qrToken.role.toUpperCase(),
    }

    if (qrToken.role === 'staff' || qrToken.role === 'STAFF') {
      context.staffId = qrToken.userId
      context.staffName = qrToken.user?.name
      context.staffEmail = qrToken.user?.email
    }

    // Return context without creating session
    return NextResponse.json({
      success: true,
      context,
      tokenId: qrToken.id,
    })
  } catch (error) {
    console.error('QR resolve error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve QR code' },
      { status: 500 }
    )
  }
}
