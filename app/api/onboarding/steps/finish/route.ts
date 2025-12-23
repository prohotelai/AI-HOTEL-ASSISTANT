/**
 * POST /api/onboarding/steps/finish
 * 
 * Final step: Mark onboarding as COMPLETED
 * - Locks wizard
 * - Sets hotel status to ACTIVE
 * - Marks User.registrationStatus as COMPLETED
 * - Sets User.registrationStep to null (no more step tracking needed)
 * - Returns redirect path to dashboard
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createStepHandler } from '@/lib/services/onboarding/stepHandlerFactory'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = createStepHandler('finish', {
  action: 'complete',
  handler: async (req: NextRequest, hotelId: string) => {
    try {
      // Get current user from session
      const session = await getServerSession(authOptions)
      const userId = (session?.user as any)?.sub || (session?.user as any)?.id

      // Mark hotel as activated
      await prisma.hotel.update({
        where: { id: hotelId },
        data: {},
      })

      // Mark User registration as COMPLETED and clear step tracking
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            registrationStatus: 'COMPLETED',
            registrationStep: null,
            onboardingCompleted: true, // Also mark onboarding as complete
          },
        })
      }

      return 'completed'
    } catch (error) {
      console.error('Finish step error:', error)
      return 'error'
    }
  },
})
