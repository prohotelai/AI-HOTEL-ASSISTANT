/**
 * Availability Service - Availability calculation engine
 */

import { prisma } from '@/lib/prisma'
import { addDays, differenceInDays, format } from 'date-fns'

export interface AvailabilityQuery {
  hotelId: string
  checkInDate: Date
  checkOutDate: Date
  roomTypeId?: string
  numberOfRooms?: number
}

export interface DailyAvailability {
  date: Date
  roomTypeId: string
  totalRooms: number
  availableRooms: number
  occupiedRooms: number
  basePrice: number
  finalPrice: number
}

export const availabilityService = {
  // Check availability for a date range
  async checkAvailability(query: AvailabilityQuery) {
    const { hotelId, checkInDate, checkOutDate, roomTypeId, numberOfRooms = 1 } = query

    // Get room types to check
    const roomTypes = roomTypeId
      ? await prisma.roomType.findMany({ where: { id: roomTypeId, hotelId } })
      : await prisma.roomType.findMany({ where: { hotelId } })

    const results = await Promise.all(
      roomTypes.map(async (roomType) => {
        const availability = await this.calculateRoomTypeAvailability(
          hotelId,
          roomType.id,
          checkInDate,
          checkOutDate
        )

        return {
          roomType: roomType,
          isAvailable: availability.availableRooms >= numberOfRooms,
          availableRooms: availability.availableRooms,
          totalRooms: availability.totalRooms,
          pricePerNight: roomType.basePrice,
          totalPrice: roomType.basePrice * differenceInDays(checkOutDate, checkInDate)
        }
      })
    )

    return results.filter(r => r.isAvailable)
  },

  // Calculate availability for a specific room type
  async calculateRoomTypeAvailability(
    hotelId: string,
    roomTypeId: string,
    checkInDate: Date,
    checkOutDate: Date
  ) {
    // Get total rooms of this type
    const totalRooms = await prisma.room.count({
      where: {
        hotelId,
        roomTypeId,
        isActive: true,
        isOutOfService: false
      }
    })

    // Get bookings that overlap
    const bookedRooms = await prisma.booking.count({
      where: {
        hotelId,
        room: {
          roomTypeId
        },
        status: {
          in: ['CONFIRMED', 'CHECKED_IN']
        },
        OR: [
          {
            AND: [
              { checkInDate: { lte: checkInDate } },
              { checkOutDate: { gt: checkInDate } }
            ]
          },
          {
            AND: [
              { checkInDate: { lt: checkOutDate } },
              { checkOutDate: { gte: checkOutDate } }
            ]
          },
          {
            AND: [
              { checkInDate: { gte: checkInDate } },
              { checkOutDate: { lte: checkOutDate } }
            ]
          }
        ]
      }
    })

    return {
      totalRooms,
      bookedRooms,
      availableRooms: Math.max(0, totalRooms - bookedRooms)
    }
  },

  // Get daily availability calendar (for visualization)
  async getDailyAvailabilityCalendar(
    hotelId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string
  ): Promise<DailyAvailability[]> {
    const roomTypes = roomTypeId
      ? await prisma.roomType.findMany({ where: { id: roomTypeId, hotelId } })
      : await prisma.roomType.findMany({ where: { hotelId } })

    const days = differenceInDays(endDate, startDate)
    const calendar: DailyAvailability[] = []

    for (let i = 0; i <= days; i++) {
      const currentDate = addDays(startDate, i)
      const nextDate = addDays(currentDate, 1)

      for (const roomType of roomTypes) {
        const availability = await this.calculateRoomTypeAvailability(
          hotelId,
          roomType.id,
          currentDate,
          nextDate
        )

        calendar.push({
          date: currentDate,
          roomTypeId: roomType.id,
          totalRooms: availability.totalRooms,
          availableRooms: availability.availableRooms,
          occupiedRooms: availability.bookedRooms,
          basePrice: roomType.basePrice,
          finalPrice: roomType.basePrice // TODO: Apply rate plans
        })
      }
    }

    return calendar
  },

  // Get occupancy statistics
  async getOccupancyStats(hotelId: string, startDate: Date, endDate: Date) {
    const totalRooms = await prisma.room.count({
      where: { hotelId, isActive: true, isOutOfService: false }
    })

    const days = differenceInDays(endDate, startDate)
    const totalRoomNights = totalRooms * days

    // Get all bookings in the period
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        status: {
          in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT']
        },
        OR: [
          {
            AND: [
              { checkInDate: { lte: startDate } },
              { checkOutDate: { gt: startDate } }
            ]
          },
          {
            AND: [
              { checkInDate: { lt: endDate } },
              { checkOutDate: { gte: endDate } }
            ]
          },
          {
            AND: [
              { checkInDate: { gte: startDate } },
              { checkOutDate: { lte: endDate } }
            ]
          }
        ]
      },
      include: {
        room: {
          include: {
            roomType: true
          }
        }
      }
    })

    // Calculate occupied room nights
    let occupiedRoomNights = 0
    for (const booking of bookings) {
      const overlapStart = booking.checkInDate > startDate ? booking.checkInDate : startDate
      const overlapEnd = booking.checkOutDate < endDate ? booking.checkOutDate : endDate
      const nights = differenceInDays(overlapEnd, overlapStart)
      occupiedRoomNights += Math.max(0, nights)
    }

    const occupancyRate = (occupiedRoomNights / totalRoomNights) * 100

    return {
      totalRooms,
      totalRoomNights,
      occupiedRoomNights,
      availableRoomNights: totalRoomNights - occupiedRoomNights,
      occupancyRate: Number(occupancyRate.toFixed(2)),
      averageRoomsOccupied: Number((occupiedRoomNights / days).toFixed(1)),
      totalBookings: bookings.length
    }
  },

  // Find best available room for booking
  async findBestAvailableRoom(
    hotelId: string,
    roomTypeId: string,
    checkInDate: Date,
    checkOutDate: Date,
    preferences?: string[]
  ) {
    // Get all available rooms
    const allRooms = await prisma.room.findMany({
      where: {
        hotelId,
        roomTypeId,
        isActive: true,
        isOutOfService: false
      },
      include: {
        roomType: true
      }
    })

    // Filter out rooms with overlapping bookings
    const availableRooms = []
    for (const room of allRooms) {
      const hasConflict = await prisma.booking.count({
        where: {
          roomId: room.id,
          status: {
            in: ['CONFIRMED', 'CHECKED_IN']
          },
          OR: [
            {
              AND: [
                { checkInDate: { lte: checkInDate } },
                { checkOutDate: { gt: checkInDate } }
              ]
            },
            {
              AND: [
                { checkInDate: { lt: checkOutDate } },
                { checkOutDate: { gte: checkOutDate } }
              ]
            },
            {
              AND: [
                { checkInDate: { gte: checkInDate } },
                { checkOutDate: { lte: checkOutDate } }
              ]
            }
          ]
        }
      })

      if (hasConflict === 0) {
        availableRooms.push(room)
      }
    }

    if (availableRooms.length === 0) {
      return null
    }

    // Apply preferences if provided
    if (preferences && preferences.length > 0) {
      // Score rooms based on preferences
      const scoredRooms = availableRooms.map(room => {
        let score = 0
        if (preferences.includes('high_floor') && room.floor !== null && room.floor >= 3) score += 10
        if (preferences.includes('low_floor') && room.floor !== null && room.floor <= 2) score += 10
        // Note: Additional room attributes (hasBalcony, isAccessible, etc.) would need to be added to schema
        
        return { room, score }
      })

      // Sort by score descending
      scoredRooms.sort((a, b) => b.score - a.score)
      return scoredRooms[0].room
    }

    // Return first available room
    return availableRooms[0]
  },

  // Recalculate availability cache (for background job)
  async recalculateAvailabilityCache(hotelId: string, daysAhead: number = 365) {
    const startDate = new Date()
    const endDate = addDays(startDate, daysAhead)

    const calendar = await this.getDailyAvailabilityCalendar(
      hotelId,
      startDate,
      endDate
    )

    // TODO: Store in cache (Redis) for fast lookups
    return calendar
  }
}
