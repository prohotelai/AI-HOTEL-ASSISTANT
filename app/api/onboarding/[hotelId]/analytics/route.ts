export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Onboarding Analytics API
 * GET /api/onboarding/[hotelId]/analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getOnboardingAnalytics } from '@/lib/services/onboarding/onboardingService'

export async function GET(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token || token.hotelId !== params.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const analytics = await getOnboardingAnalytics(params.hotelId)

    return NextResponse.json({
      success: true,
      analytics,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
