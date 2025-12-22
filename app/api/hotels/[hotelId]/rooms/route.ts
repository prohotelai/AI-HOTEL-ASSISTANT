import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: {
    hotelId: string
  }
}

/**
 * POST /api/hotels/[hotelId]/rooms
 * Create room types during onboarding
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { hotelId } = params

    // Verify user belongs to this hotel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hotelId: true, role: true }
    })

    if (!user || user.hotelId !== hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this hotel' },
        { status: 403 }
      )
    }

    // Only OWNER can add rooms
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only hotel owners can configure rooms' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { roomTypes } = body

    // Validate input
    if (!Array.isArray(roomTypes) || roomTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one room type is required' },
        { status: 400 }
      )
    }

    // Validate each room type
    for (const rt of roomTypes) {
      if (!rt.name || typeof rt.name !== 'string') {
        return NextResponse.json(
          { error: 'Each room type must have a name' },
          { status: 400 }
        )
      }
      if (!Number.isInteger(rt.count) || rt.count < 1) {
        return NextResponse.json(
          { error: 'Each room type must have a valid count (minimum 1)' },
          { status: 400 }
        )
      }
    }

    // Use transaction for atomic operation
    const result = await prisma.$transaction(async (tx) => {
      const allRooms = []
      
      for (const rt of roomTypes) {
        // Create RoomType
        const roomType = await tx.roomType.create({
          data: {
            hotelId,
            name: rt.name,
            description: rt.description || `${rt.name} room type`,
            basePrice: rt.basePrice || 100,
            maxOccupancy: rt.capacity || 2,
            amenities: [],
            isActive: true,
          },
          select: { id: true, name: true }
        })

        // Create individual Room records for each count
        for (let i = 1; i <= rt.count; i++) {
          const room = await tx.room.create({
            data: {
              hotelId,
              roomNumber: `${rt.name.substring(0, 3).toUpperCase()}-${i}`,
              roomTypeId: roomType.id,
              status: 'AVAILABLE',
              notes: `Created during onboarding`,
            },
            select: {
              id: true,
              roomNumber: true,
              roomTypeId: true,
            }
          })
          allRooms.push(room)
        }
      }

      return allRooms
    })

    return NextResponse.json({
      message: 'Rooms created successfully',
      roomCount: result.length,
      roomsCreated: result.length,
    })
  } catch (error) {
    console.error('Create rooms error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
