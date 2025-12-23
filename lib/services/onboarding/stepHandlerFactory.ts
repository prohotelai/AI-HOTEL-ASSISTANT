/**
 * Generic Step Handler Wrapper
 * 
 * All step endpoints use this pattern:
 * 1. Validate authentication & hotelId from session
 * 2. Validate request payload
 * 3. Call domain service (Hotel, Room, Service, etc.)
 * 4. Call onboarding step service to mark progress
 * 5. Return standardized response
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  completeStep,
  skipStep,
  editStep,
} from '@/lib/services/onboarding/onboardingStepService'
import type { OnboardingStepName, StepResponse } from '@/lib/services/onboarding/onboardingStepService'

/**
 * Validate admin has permission to access onboarding
 */
export async function validateOnboardingAccess(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: 'Unauthorized',
      status: 401,
    }
  }

  const hotelId = (session.user as any).hotelId
  const role = (session.user as any).role

  if (!hotelId) {
    return {
      error: 'Hotel context missing from session',
      status: 400,
    }
  }

  // Only OWNER/admin can access onboarding
  if (role !== 'OWNER' && role !== 'owner' && role !== 'admin') {
    return {
      error: 'Insufficient permissions to access onboarding',
      status: 403,
    }
  }

  return { hotelId, userId: (session.user as any).id }
}

/**
 * Check if wizard is locked (COMPLETED)
 */
export async function isWizardLocked(hotelId: string): Promise<boolean> {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { hotelId },
    select: { status: true },
  })

  return progress?.status === 'COMPLETED'
}

/**
 * Standard error response format
 */
export function errorResponse(
  message: string,
  status: number = 400,
  hotelId?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      hotelId,
    },
    { status }
  )
}

/**
 * Standard success response format
 */
export function successResponse(
  data: StepResponse,
  status: number = 200
) {
  return NextResponse.json(data, { status })
}

/**
 * Shared step handler factory
 * 
 * Usage:
 * export const POST = createStepHandler('hotel-details', async (req, hotelId) => {
 *   const { address, phone, email, website } = await req.json()
 *   await updateHotelDetails(hotelId, { address, phone, email, website })
 *   return 'completed'
 * })
 */
export function createStepHandler(
  stepName: OnboardingStepName,
  options: {
    action?: 'complete' | 'skip' | 'edit'
    handler?: (req: NextRequest, hotelId: string) => Promise<'completed' | 'skipped' | 'error'>
  } = {}
) {
  const action = options.action || 'complete'
  const handler = options.handler

  return async (req: NextRequest) => {
    try {
      // Validate access
      const auth = await validateOnboardingAccess(req)
      if ('error' in auth) {
        return NextResponse.json(
          {
            success: false,
            error: auth.error,
          },
          { status: auth.status }
        )
      }

      const { hotelId, userId } = auth

      // Check if wizard is locked
      const isLocked = await isWizardLocked(hotelId)
      if (isLocked && action === 'complete') {
        return errorResponse(
          'Onboarding is already completed. Access denied.',
          403,
          hotelId
        )
      }

      // Run step-specific handler if provided
      let handlerResult: 'completed' | 'skipped' | 'error' = action === 'skip' ? 'skipped' : 'completed'
      if (handler) {
        handlerResult = await handler(req, hotelId)
      }

      if (handlerResult === 'error') {
        return errorResponse(
          'Failed to save step data',
          400,
          hotelId
        )
      }

      // Update onboarding progress
      let response
      if (action === 'skip') {
        const { skipStep: skipStepFn } = await import('@/lib/services/onboarding/onboardingStepService')
        response = await skipStepFn(hotelId, stepName)
      } else if (action === 'edit') {
        await editStep(hotelId, stepName)
        const { getOnboardingProgress } = await import('@/lib/services/onboarding/onboardingStepService')
        const progress = await getOnboardingProgress(hotelId)
        response = {
          success: true,
          stepStatus: 'pending' as const,
          currentStep: stepName,
          nextStep: stepName,
          completedSteps: progress?.completedSteps || [],
          skippedSteps: progress?.skippedSteps || [],
          progress: progress!,
        }
      } else {
        response = await completeStep(hotelId, stepName)
      }

      return successResponse(response)
    } catch (error: any) {
      console.error(`Error in step handler for ${stepName}:`, error)
      return errorResponse(
        error.message || 'Internal server error',
        500
      )
    }
  }
}
