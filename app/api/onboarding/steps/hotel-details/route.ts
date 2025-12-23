/**
 * POST /api/onboarding/steps/hotel-details
 * 
 * Step 1: Edit hotel contact details
 * - Updates Hotel model
 * - Marks step as completed
 * - Returns next available step
 */

import { NextRequest } from 'next/server'
import { createStepHandler } from '@/lib/services/onboarding/stepHandlerFactory'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const HotelDetailsSchema = z.object({
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
})

export const dynamic = 'force-dynamic'

export const POST = createStepHandler('hotel-details', {
  action: 'complete',
  handler: async (req: NextRequest, hotelId: string) => {
    try {
      const body = await req.json()

      // Validate input
      const validated = HotelDetailsSchema.parse(body)

      // UPSERT hotel details (safe for repeated edits)
      await prisma.hotel.update({
        where: { id: hotelId },
        data: {
          address: validated.address || undefined,
          phone: validated.phone || undefined,
          email: validated.email || undefined,
          website: validated.website || undefined,
        },
      })

      return 'completed'
    } catch (error) {
      console.error('Hotel details validation error:', error)
      return 'error'
    }
  },
})
