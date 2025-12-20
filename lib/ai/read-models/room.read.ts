/**
 * AI Read Model: Room
 * 
 * SAFETY: Read-only room status for AI agents
 * - Current status only
 * - No maintenance details (unless authorized)
 * - Hotel scoping enforced
 */

import { prisma } from '@/lib/prisma'
import { RoomStatus } from '@prisma/client'

export interface RoomReadModel {
  id: string
  roomNumber: string
  roomType: string
  floor: number | null
  status: RoomStatus
  isOccupied: boolean
  currentGuest?: string
  features: string[]
  basePrice?: string // Masked unless authorized
}

/**
 * Get room status for AI
 */
export async function getRoomForAI(
  hotelId: string,
  roomId: string,
  options: {
    includePricing?: boolean // Requires manager permission
  } = {}
): Promise<RoomReadModel | null> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, hotelId },
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      status: true,
      roomType: {
        select: {
          name: true,
          basePrice: true,
          amenities: true
        }
      },
      bookings: {
        where: {
          status: 'CHECKED_IN'
        },
        select: {
          guest: {
            select: { firstName: true, lastName: true }
          }
        },
        take: 1
      }
    }
  })

  if (!room) return null

  const currentBooking = room.bookings[0]
  const features: string[] = []
  
  if (room.roomType.amenities && typeof room.roomType.amenities === 'object') {
    const amenities = room.roomType.amenities as any
    if (Array.isArray(amenities)) {
      features.push(...amenities)
    }
  }

  return {
    id: room.id,
    roomNumber: room.roomNumber,
    roomType: room.roomType.name,
    floor: room.floor,
    status: room.status,
    isOccupied: !!currentBooking,
    currentGuest: currentBooking
      ? `${currentBooking.guest.firstName} ${currentBooking.guest.lastName}`
      : undefined,
    features,
    basePrice: options.includePricing ? room.roomType.basePrice.toString() : undefined
  }
}

/**
 * Get all rooms with filters (for AI dashboard)
 */
export async function getRoomsForAI(
  hotelId: string,
  filters: {
    status?: RoomStatus
    floor?: number
    roomTypeId?: string
  } = {}
): Promise<RoomReadModel[]> {
  const where: any = { hotelId }
  
  if (filters.status) where.status = filters.status
  if (filters.floor) where.floor = filters.floor
  if (filters.roomTypeId) where.roomTypeId = filters.roomTypeId

  const rooms = await prisma.room.findMany({
    where,
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      status: true,
      roomType: {
        select: {
          name: true,
          amenities: true
        }
      },
      bookings: {
        where: { status: 'CHECKED_IN' },
        select: {
          guest: {
            select: { firstName: true, lastName: true }
          }
        },
        take: 1
      }
    },
    orderBy: { roomNumber: 'asc' },
    take: 200 // Limit for safety
  })

  return rooms.map(room => {
    const currentBooking = room.bookings[0]
    const features: string[] = []
    
    if (room.roomType.amenities && typeof room.roomType.amenities === 'object') {
      const amenities = room.roomType.amenities as any
      if (Array.isArray(amenities)) {
        features.push(...amenities)
      }
    }

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      roomType: room.roomType.name,
      floor: room.floor,
      status: room.status,
      isOccupied: !!currentBooking,
      currentGuest: currentBooking
        ? `${currentBooking.guest.firstName} ${currentBooking.guest.lastName}`
        : undefined,
      features
    }
  })
}

/**
 * Get available rooms for AI
 */
export async function getAvailableRoomsForAI(
  hotelId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<RoomReadModel[]> {
  // Get rooms that are AVAILABLE and have no conflicting bookings
  const rooms = await prisma.room.findMany({
    where: {
      hotelId,
      status: 'AVAILABLE',
      bookings: {
        none: {
          OR: [
            {
              checkInDate: { lte: checkInDate },
              checkOutDate: { gt: checkInDate }
            },
            {
              checkInDate: { lt: checkOutDate },
              checkOutDate: { gte: checkOutDate }
            }
          ],
          status: { in: ['CONFIRMED', 'CHECKED_IN'] }
        }
      }
    },
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      status: true,
      roomType: {
        select: {
          name: true,
          amenities: true
        }
      }
    },
    orderBy: { roomNumber: 'asc' },
    take: 50
  })

  return rooms.map(room => {
    const features: string[] = []
    
    if (room.roomType.amenities && typeof room.roomType.amenities === 'object') {
      const amenities = room.roomType.amenities as any
      if (Array.isArray(amenities)) {
        features.push(...amenities)
      }
    }

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      roomType: room.roomType.name,
      floor: room.floor,
      status: room.status,
      isOccupied: false,
      features
    }
  })
}

/**
 * Get rooms by status summary (for AI insights)
 */
export async function getRoomStatusSummaryForAI(hotelId: string) {
  const statusCounts = await prisma.room.groupBy({
    by: ['status'],
    where: { hotelId },
    _count: true
  })

  const summary: Record<string, number> = {}
  statusCounts.forEach(item => {
    summary[item.status] = item._count
  })

  return summary
}
