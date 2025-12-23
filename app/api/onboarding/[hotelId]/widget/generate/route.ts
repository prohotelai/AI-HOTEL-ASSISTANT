export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DEPRECATED: Old onboarding flow endpoint
 * 
 * This endpoint is part of the legacy onboarding flow which has been superseded 
 * by the hardened 4-step wizard. Widget management is now handled separately.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'This endpoint is no longer supported. Use the widget management interface instead.',
    },
    { status: 410 }
  )
}
