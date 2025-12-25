import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHotelQr } from '@/lib/services/hotelQrService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

/**
 * POST /api/qr/[hotelId]/generate
 * DEPRECATED - QR codes are now permanent (generated on hotel creation)
 * This endpoint now returns 410 Gone
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  return NextResponse.json(
    {
      error: 'QR code generation is no longer available',
      message: 'Hotel QR codes are now permanent and cannot be regenerated. Use GET /api/qr/[hotelId] to retrieve your hotel\'s QR code.',
      deprecated: true
    },
    { status: 410 } // 410 Gone - resource no longer available
  )
}

/**
 * GET /api/qr/[hotelId]
 * Get the permanent QR code for a hotel (admin view)
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

    // Get permanent QR code
    const qrData = await getHotelQr(hotelId)

    if (!qrData) {
      return NextResponse.json(
        { error: 'No QR code found for this hotel. Please contact support.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      qrCode: qrData.qrCode,
      qrUrl: qrData.qrUrl,
      hotelName: qrData.hotelName,
      payload: qrData.qrPayload,
      message: 'This is your hotel\'s permanent QR code'
    })
  } catch (error) {
    console.error('Get QR code error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve QR code' },
      { status: 500 }
    )
  }
}
