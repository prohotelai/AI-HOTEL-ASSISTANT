/**
 * POST /api/onboarding/steps/room-config
 * 
 * Step 2: Configure room types
 * - Creates/updates RoomType models
 * - Each room type: name + count
 * - Marks step as completed
 */

import { NextRequest } from 'next/server'
import { createStepHandler } from '@/lib/services/onboarding/stepHandlerFactory'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const RoomTypeSchema = z.object({
  name: z.string().min(1).max(100),
  count: z.number().int().min(1).max(1000),
})

const RoomConfigSchema = z.object({
  roomTypes: z.array(RoomTypeSchema).min(1),
})

export const dynamic = 'force-dynamic'

export const POST = createStepHandler('room-config', {
  action: 'complete',
  handler: async (req: NextRequest, hotelId: string) => {
    try {
      const body = await req.json()

      // Validate input
      const validated = RoomConfigSchema.parse(body)

      // Transaction: clear old room types and create new ones
      await prisma.$transaction(async (tx) => {
        // Delete existing room types and their rooms
        const existingTypes = await tx.roomType.findMany({
          where: { hotelId },
          select: { id: true }
        })

        // Delete rooms first (cascade)
        for (const type of existingTypes) {
          await tx.room.deleteMany({
            where: { roomTypeId: type.id }
          })
        }

        // Delete room types
        await tx.roomType.deleteMany({
          where: { hotelId },
        })

        // Create new room types with rooms
        for (const roomType of validated.roomTypes) {
          const newType = await tx.roomType.create({
            data: {
              hotelId,
              name: roomType.name,
              maxOccupancy: 2, // Default capacity
              basePrice: 0, // Can be set later
            },
          })

          // Create individual room records for each count
          for (let i = 0; i < roomType.count; i++) {
            await tx.room.create({
              data: {
                hotelId,
                roomNumber: `${roomType.name.substring(0, 1)}${String(i + 1).padStart(3, '0')}`,
                roomTypeId: newType.id,
                status: 'AVAILABLE',
              },
            })
          }
        }
      })

      return 'completed'
    } catch (error) {
      console.error('Room config validation error:', error)
      return 'error'
    }
  },
})
