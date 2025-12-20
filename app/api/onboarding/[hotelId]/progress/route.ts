export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Onboarding Progress API
 * GET/POST /api/onboarding/[hotelId]/progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  getOnboardingProgress,
  initializeOnboarding,
  updateOnboardingProgress,
} from '@/lib/services/onboarding/onboardingService'
import { onboardingStepUpdateSchema } from '@/lib/validation/onboarding'

export async function GET(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })

    if (!token || !token.hotelId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hotelId } = params

    // Enforce tenant boundary
    if (token.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const progress = await getOnboardingProgress(hotelId)

    if (!progress) {
      // Initialize on first access
      const initialized = await initializeOnboarding(hotelId)
      return NextResponse.json(initialized)
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Onboarding progress fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding progress' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { hotelId: string } }
) {
  try {
    const token = await getToken({ req })

    if (!token || !token.hotelId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hotelId } = params

    // Enforce tenant boundary
    if (token.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = onboardingStepUpdateSchema.parse(body)

    const progress = await updateOnboardingProgress(hotelId, validated)

    return NextResponse.json(progress)
  } catch (error: any) {
    console.error('Onboarding progress update error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    )
  }
}
