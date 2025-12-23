export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DEPRECATED: Old onboarding flow endpoint
 * 
 * This endpoint is part of the legacy onboarding flow which has been superseded 
 * by the hardened 4-step wizard. Use /api/onboarding/progress instead.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'This endpoint is no longer supported. Use GET /api/onboarding/progress instead.',
      newEndpoint: 'GET /api/onboarding/progress',
    },
    { status: 410 }
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'This endpoint is no longer supported. Use the new step endpoints instead.',
      newEndpoints: {
        hotelDetails: 'POST /api/onboarding/steps/hotel-details',
        roomConfig: 'POST /api/onboarding/steps/room-config',
        servicesSetup: 'POST /api/onboarding/steps/services-setup',
        finish: 'POST /api/onboarding/steps/finish',
      },
    },
    { status: 410 }
  )
}
