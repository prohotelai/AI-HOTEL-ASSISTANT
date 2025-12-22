export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/qr/validate
 * Validate QR token and return hotel ID
 * Public endpoint - does NOT require authentication
 * Used by /access page to validate QR link
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateQRToken } from '@/lib/services/qrCodeService'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { token } = body

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Missing required field: token' },
        { status: 400 }
      )
    }

    // Validate QR token
    const content = await validateQRToken(token)

    if (!content) {
      return NextResponse.json(
        { error: 'Invalid or expired QR token' },
        { status: 401 }
      )
    }

    // Return hotel ID from QR content
    return NextResponse.json(
      {
        success: true,
        hotelId: content.hotelId,
        content,
        message: 'QR token validated successfully'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('QR token validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate QR token' },
      { status: 500 }
    )
  }
}
