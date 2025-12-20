/**
 * Onboarding Activation API
 * POST /api/onboarding/[hotelId]/activate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { completeOnboarding, logOnboardingEvent } from '@/lib/services/onboarding/onboardingService'

export async function POST(
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

    // Complete onboarding
    await completeOnboarding(params.hotelId)

    // Log activation event
    await logOnboardingEvent(
      params.hotelId,
      'finish',
      'assistant-activated',
      {
        activatedAt: new Date().toISOString(),
        activatedBy: token.id,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'AI assistant activated successfully',
      activatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json(
      { error: 'Activation failed', message: String(error) },
      { status: 500 }
    )
  }
}
