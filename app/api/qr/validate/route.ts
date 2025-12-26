export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/validate
 * Validate a QR login token and return session info
 * Public endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateQRToken } from '@/lib/services/qr/qrService'
import { validateHotelQr } from '@/lib/services/hotelQrService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, hotelId, qrCode } = body || {}

    // Hotel identity QR validation
    const hotelQrCode = qrCode
    if (hotelQrCode) {
      const validation = await validateHotelQr(hotelQrCode)
      if (!validation) {
        return NextResponse.json({ error: 'Invalid or expired QR' }, { status: 401 })
      }

      return NextResponse.json(
        {
          success: true,
          hotelId: validation.hotelId,
          hotelName: validation.hotelName,
          payload: validation.payload
        },
        { status: 200 }
      )
    }

    // Login token validation
    if (!token || !hotelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payload = await validateQRToken(token, hotelId)

    return NextResponse.json(
      {
        success: true,
        session: {
          hotelId: payload.hotelId,
          userId: payload.userId,
          role: payload.role,
          tokenId: payload.tokenId,
        },
        user: payload.user,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('QR code validation error:', error)
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
}
