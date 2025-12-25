export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/validate
 * Validate permanent hotel QR code
 * Public endpoint - does NOT require authentication
 * Used by /access page to validate QR link
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateHotelQr } from '@/lib/services/hotelQrService'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { qrCode, token } = body

    // Support both 'qrCode' and 'token' for backward compatibility
    const qrToken = qrCode || token

    // Validate required fields
    if (!qrToken) {
      return NextResponse.json(
        { error: 'Missing required field: qrCode' },
        { status: 400 }
      )
    }

    // Validate QR code
    const hotelInfo = await validateHotelQr(qrToken)

    if (!hotelInfo) {
      return NextResponse.json(
        { error: 'Invalid or expired QR code' },
        { status: 401 }
      )
    }

    // Return hotel info
    return NextResponse.json(
      {
        success: true,
        hotelId: hotelInfo.hotelId,
        hotelName: hotelInfo.hotelName,
        payload: hotelInfo.payload,
        message: 'QR code validated successfully'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('QR code validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate QR code' },
      { status: 500 }
    )
  }
}
