import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

interface RoomTypeInput {
  name: string
  totalRooms: number
  capacity: number
  basePrice: number
  description?: string
}

/**
 * POST /api/hotels/[hotelId]/rooms
 * 
 * CRITICAL: Room Configuration for Onboarding Wizard
 * 
 * Creates RoomType + individual Room inventory + 365-day RoomAvailability calendar
 * in a single atomic transaction. Rolls back entire operation on any failure.
 * 
 * Expected payload:
 * {
 *   roomTypes: [
 *     {
 *       name: string,
 *       totalRooms: number,
 *       capacity: number,
 *       basePrice: number,
 *       description?: string
 *     }
 *   ]
 * }
 * 
 * Session Validation:
 * - hotelId extracted from NextAuth JWT
 * - Must match route param hotelId
 * - Role must be OWNER
 * 
 * Response on success (200):
 * {
 *   success: true,
 *   message: "Room configuration saved",
 *   roomTypesCreated: number,
 *   totalRoomsCreated: number
 * }
 * 
 * Response on failure:
 * - 400: Validation error (detailed reason)
 * - 401: Missing/invalid session
 * - 403: Unauthorized (not owner)
 * - 500: Database/transaction error (logs exact reason)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestStartTime = Date.now()
  const { hotelId } = params

  try {
    // ===== STEP 1: SESSION VALIDATION =====
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      logger.warn('Room config: missing session', { hotelId })
      return NextResponse.json(
        { error: 'Unauthorized: No active session' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const sessionHotelId = (session.user as any).hotelId

    // Verify hotelId in session matches route param
    if (!sessionHotelId) {
      logger.error('Room config: missing hotelId in session', { userId, hotelId })
      return NextResponse.json(
        { error: 'Missing hotelId in session' },
        { status: 400 }
      )
    }

    if (sessionHotelId !== hotelId) {
      logger.warn('Room config: hotelId mismatch', {
        userId,
        sessionHotelId,
        routeHotelId: hotelId,
      })
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Verify user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user) {
      logger.error('Room config: user not found', { userId, hotelId })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    if (user.hotelId !== hotelId) {
      logger.warn('Room config: user hotel mismatch', {
        userId,
        userHotelId: user.hotelId,
        routeHotelId: hotelId,
      })
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    if (user.role !== 'OWNER') {
      logger.warn('Room config: insufficient role', { userId, hotelId, role: user.role })
      return NextResponse.json(
        { error: 'Only hotel owners can configure rooms' },
        { status: 403 }
      )
    }

    // ===== STEP 2: PAYLOAD VALIDATION =====
    let body: any
    try {
      body = await req.json()
    } catch (e) {
      logger.warn('Room config: invalid JSON payload', { userId, hotelId })
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const { roomTypes } = body

    // Validate roomTypes array
    if (!Array.isArray(roomTypes)) {
      logger.warn('Room config: roomTypes not array', {
        userId,
        hotelId,
        received: typeof roomTypes,
      })
      return NextResponse.json(
        { error: 'Invalid payload: roomTypes must be an array' },
        { status: 400 }
      )
    }

    if (roomTypes.length === 0) {
      logger.warn('Room config: empty roomTypes array', { userId, hotelId })
      return NextResponse.json(
        { error: 'At least one room type is required' },
        { status: 400 }
      )
    }

    // Validate each room type
    const validationErrors: string[] = []
    for (let i = 0; i < roomTypes.length; i++) {
      const rt = roomTypes[i]

      if (!rt.name || typeof rt.name !== 'string' || rt.name.trim().length === 0) {
        validationErrors.push(`Room type ${i + 1}: name is required and must be a non-empty string`)
      }

      if (!Number.isInteger(rt.totalRooms) || rt.totalRooms < 1) {
        validationErrors.push(`Room type ${i + 1}: totalRooms must be an integer >= 1`)
      }

      if (!Number.isInteger(rt.capacity) || rt.capacity < 1) {
        validationErrors.push(`Room type ${i + 1}: capacity must be an integer >= 1`)
      }

      if (typeof rt.basePrice !== 'number' || rt.basePrice < 0) {
        validationErrors.push(`Room type ${i + 1}: basePrice must be a number >= 0`)
      }
    }

    if (validationErrors.length > 0) {
      logger.warn('Room config: validation failed', {
        userId,
        hotelId,
        errors: validationErrors,
      })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      )
    }

    // ===== STEP 3: ATOMIC TRANSACTION =====
    logger.info('Room config: starting transaction', {
      userId,
      hotelId,
      roomTypeCount: roomTypes.length,
    })

    const result = await prisma.$transaction(
      async (tx) => {
        const createdRoomTypes: { id: string; name: string; count: number }[] = []
        let totalRoomsCreated = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // For each room type, create: RoomType + Room records + 365-day availability calendar
        for (const rt of roomTypes) {
          const rtName = rt.name.trim()

          // 1. Create RoomType
          const roomType = await tx.roomType.create({
            data: {
              hotelId,
              name: rtName,
              description: rt.description || `${rtName} room type`,
              basePrice: rt.basePrice,
              maxOccupancy: rt.capacity,
              amenities: [],
              isActive: true,
            },
            select: { id: true, name: true }
          })

          logger.info('Room type created', {
            userId,
            hotelId,
            roomTypeId: roomType.id,
            name: roomType.name,
          })

          // 2. Create individual Room records
          const rooms = []
          for (let i = 1; i <= rt.totalRooms; i++) {
            const roomNumber = `${rtName.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`
            const room = await tx.room.create({
              data: {
                hotelId,
                roomNumber,
                roomTypeId: roomType.id,
                status: 'AVAILABLE',
                isActive: true,
                notes: `Created during onboarding - ${rtName}`,
              },
              select: { id: true, roomNumber: true }
            })
            rooms.push(room)
            totalRoomsCreated++
          }

          logger.info('Rooms created', {
            userId,
            hotelId,
            roomTypeId: roomType.id,
            count: rooms.length,
          })

          // 3. Initialize 365-day RoomAvailability calendar
          const availabilityRecords = []
          for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
            const date = new Date(today)
            date.setDate(date.getDate() + dayOffset)
            availabilityRecords.push({
              roomTypeId: roomType.id,
              date,
              totalRooms: rt.totalRooms,
              available: rt.totalRooms,
              occupied: 0,
              blocked: 0,
              rate: rt.basePrice,
            })
          }

          await tx.roomAvailability.createMany({
            data: availabilityRecords,
          })

          logger.info('Availability calendar initialized', {
            userId,
            hotelId,
            roomTypeId: roomType.id,
            daysInitialized: availabilityRecords.length,
          })

          createdRoomTypes.push({
            id: roomType.id,
            name: roomType.name,
            count: rt.totalRooms,
          })
        }

        return {
          roomTypeCount: createdRoomTypes.length,
          totalRoomsCreated,
          roomTypes: createdRoomTypes,
        }
      },
      {
        timeout: 30000, // 30s timeout for large inventory
      }
    )

    const durationMs = Date.now() - requestStartTime

    logger.info('Room config transaction succeeded', {
      userId,
      hotelId,
      roomTypeCount: result.roomTypeCount,
      totalRoomsCreated: result.totalRoomsCreated,
      durationMs,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Room configuration saved',
        roomTypesCreated: result.roomTypeCount,
        totalRoomsCreated: result.totalRoomsCreated,
      },
      { status: 200 }
    )
  } catch (error) {
    const durationMs = Date.now() - requestStartTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('Room config transaction failed', {
      hotelId,
      durationMs,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Return detailed error for known issues
    if (
      errorMessage.includes('Unique constraint failed') ||
      errorMessage.includes('hotelId_name')
    ) {
      return NextResponse.json(
        { error: 'Room type with this name already exists in your hotel' },
        { status: 400 }
      )
    }

    if (errorMessage.includes('Foreign key constraint failed')) {
      return NextResponse.json(
        { error: 'Invalid hotel or room type reference. Please refresh and try again' },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to save room configuration',
        reason: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}
