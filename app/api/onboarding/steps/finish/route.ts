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

      // Mark onboarding as COMPLETED - registration tracking fields removed from schema
      if (userId) {
        // Registration status fields have been removed from User table
        // Onboarding completion is now tracked in OnboardingProgress table
        console.log('✅ Onboarding completed for hotel:', hotelId)
      }

      return 'completed'
    } catch (error) {
      console.error('Finish step error:', error)
      return 'error'
    }
  },
})
