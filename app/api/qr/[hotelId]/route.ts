import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateHotelQRCode } from '@/lib/services/qrCodeService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

/**
 * POST /api/qr/[hotelId]/generate
 * Generate or regenerate QR code for a hotel (admin only)
 * - Admin (OWNER/MANAGER) can generate one QR per hotel
 * - Previous QR codes are invalidated
 * - Returns: token, redirectUrl, content
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    // Verify user belongs to this hotel and has appropriate role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Only OWNER and MANAGER can generate QR codes
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only hotel owners and managers can generate QR codes' },
        { status: 403 }
      )
    }

    // Generate QR code
    const result = await generateHotelQRCode(hotelId, userId)

    return NextResponse.json({
      success: true,
      token: result.token,
      redirectUrl: result.redirectUrl,
      qrUrl: result.qrUrl,
      content: result.content,
      message: 'QR code generated successfully'
    })
  } catch (error) {
    console.error('Generate QR code error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/qr/[hotelId]/current
 * Get the current active QR code for a hotel (admin view)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    // Verify user belongs to this hotel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Get active QR code
    const qrCode = await prisma.hotelQRCode.findFirst({
      where: {
        hotelId,
        isActive: true
      },
      select: {
        token: true,
        qrContent: true,
        createdAt: true,
        createdBy: true
      }
    })

    if (!qrCode) {
      return NextResponse.json(
        { error: 'No active QR code found for this hotel' },
        { status: 404 }
      )
    }

    const content = JSON.parse(qrCode.qrContent)

    return NextResponse.json({
      success: true,
      token: qrCode.token,
      content,
      redirectUrl: `/access?hotelId=${hotelId}`,
      createdAt: qrCode.createdAt
    })
  } catch (error) {
    console.error('Get QR code error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve QR code' },
      { status: 500 }
    )
  }
}
