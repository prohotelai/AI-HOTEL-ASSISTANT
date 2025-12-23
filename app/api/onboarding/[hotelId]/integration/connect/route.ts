export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DEPRECATED: Old onboarding flow endpoint
 * 
 * This endpoint is part of the legacy onboarding flow which has been superseded 
 * by the hardened 4-step wizard. PMS integration is configured via the services-setup step.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'This endpoint is no longer supported. Use /api/onboarding/steps/services-setup instead.',
      newEndpoint: 'POST /api/onboarding/steps/services-setup',
    },
    { status: 410 }
  )
}
