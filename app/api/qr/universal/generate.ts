import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/qr/universal/generate
 * Admin-only endpoint to generate new universal QR token for the hotel
 * 
 * Feature not yet fully implemented (universalQR model doesn't exist)
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
}

/**
 * GET /api/qr/universal/generate
 * List all universal QR tokens for the hotel
 * 
 * Feature not yet fully implemented (universalQR model doesn't exist)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
}
