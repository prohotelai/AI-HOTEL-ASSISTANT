/**
 * GET /api/onboarding/progress
 * POST /api/onboarding/progress
 * 
 * Manage onboarding progress
 * - GET: Retrieve current progress (or initialize if new hotel)
 *        Also checks User.registrationStatus for state persistence
 * - POST: Update progress (legacy, steps now have own endpoints)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getOnboardingProgress,
  initializeOnboarding,
  resumeOnboarding,
} from '@/lib/services/onboarding/onboardingStepService'
import { errorResponse, successResponse } from '@/lib/services/onboarding/stepHandlerFactory'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return errorResponse('Unauthorized', 401)
    }

    const hotelId = (session.user as any).hotelId
    const userId = (session.user as any).sub || (session.user as any).id

    if (!hotelId) {
      return errorResponse('Hotel context missing', 400)
    }

    // Check User.registrationStatus for persistent state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        // registrationStatus and registrationStep fields removed - no longer in database
        id: true,
      },
    })

    // Registration state tracking removed - use other mechanisms
    if (false) {
      // Return completed state (disabled)
      return NextResponse.json(
        {
          hotelId,
          status: 'COMPLETED',
          currentStep: null,
          completedSteps: ['hotel-details', 'room-config', 'services-setup', 'finish'],
          skippedSteps: [],
          totalTimeSpent: 0,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        { status: 200 }
      )
    }

    // Get current progress or initialize
    let progress = await getOnboardingProgress(hotelId)

    if (!progress) {
      progress = await initializeOnboarding(hotelId)
    }

    // Registration step tracking removed - no longer in database
    // Use progress.currentStep from OnboardingProgress table instead

    return NextResponse.json(progress, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching onboarding progress:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return errorResponse('Unauthorized', 401)
    }

    const hotelId = (session.user as any).hotelId

    if (!hotelId) {
      return errorResponse('Hotel context missing', 400)
    }

    const body = await req.json()
    const { action } = body

    // Support 'resume' action to get last incomplete step
    if (action === 'resume') {
      const resumeStep = await resumeOnboarding(hotelId)
      const progress = await getOnboardingProgress(hotelId)

      return NextResponse.json(
        {
          success: true,
          resumeStep,
          progress,
        },
        { status: 200 }
      )
    }

    // Default: just return current progress
    const progress = await getOnboardingProgress(hotelId)

    return NextResponse.json(progress, { status: 200 })
  } catch (error: any) {
    console.error('Error updating onboarding progress:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
