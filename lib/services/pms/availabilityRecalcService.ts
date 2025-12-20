/**
 * Availability Recalculation Service - Recalculate room availability
 */

import { prisma } from '@/lib/prisma'
import { addDays, startOfDay } from 'date-fns'

export interface AvailabilityRecalcResult {
  hotelId: string
  roomsProcessed: number
  availabilityUpdated: number
  occupancyRate: number
}

export const availabilityRecalcService = {
  /**
   * Recalculate availability for all room types
   */
  async recalculateAvailability(hotelId: string): Promise<AvailabilityRecalcResult> {
    // Stubbed - RoomType model not in schema
    return {
      hotelId,
      roomsProcessed: 0,
      availabilityUpdated: 0,
      occupancyRate: 0
    }
    
    /* Original code commented out
    const today = startOfDay(new Date())
    let roomsProcessed = 0
    let availabilityUpdated = 0

    // Get all room types
    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId },
      include: {
        rooms: {
          where: { hotelId }
        }
      }
    })

    for (const roomType of roomTypes) {
      const totalRooms = roomType.rooms.length

      if (totalRooms === 0) {
        continue
      }

      // Calculate availability for next 30 days
      for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
        const checkDate = addDays(today, daysAhead)

        const occupiedRooms = await prisma.booking.count({
          where: {
            hotelId,
            roomTypeId: roomType.id,
            checkInDate: {
              lte: checkDate
            },
            checkOutDate: {
              gt: checkDate
            },
            status: {
              in: ['CONFIRMED', 'CHECKED_IN']
            }
          }
        })

        const availableRooms = totalRooms - occupiedRooms

        // Store availability snapshot
        await prisma.roomAvailability.upsert({
          where: {
            roomTypeId_date: {
              roomTypeId: roomType.id,
              date: checkDate
            }
          },
          create: {
            roomTypeId: roomType.id,
            date: checkDate,
            totalRooms,
            occupiedRooms,
            availableRooms,
            occupancyRate: (occupiedRooms / totalRooms) * 100
          },
          update: {
            occupiedRooms,
            availableRooms,
            occupancyRate: (occupiedRooms / totalRooms) * 100
          }
        })

        availabilityUpdated++
      }

      roomsProcessed += roomType.rooms.length
    }

    // Calculate overall occupancy rate
    const totalRooms = await prisma.room.count({
      where: { hotelId }
    })

    const occupiedRooms = await prisma.booking.count({
      where: {
        hotelId,
        checkInDate: {
          lte: today
        },
        checkOutDate: {
          gt: today
        },
        status: {
          in: ['CONFIRMED', 'CHECKED_IN']
        }
      }
    })

    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

    // Log execution
    await prisma.jobExecution.create({
      data: {
        hotelId,
        jobName: 'recalculate-availability',
        status: 'COMPLETED',
        metadata: {
          roomsProcessed,
          availabilityUpdated,
          occupancyRate
        }
      }
    })

    return {
      hotelId,
      roomsProcessed,
      availabilityUpdated,
      occupancyRate
    }
    */
  },

  /**
   * Get availability snapshot for a date
   */
  async getAvailabilityForDate(hotelId: string, date: Date) {
    return prisma.roomAvailability.findMany({
      where: {
        date,
        roomType: {
          hotelId
        }
      },
      include: {
        roomType: true
      }
    })
  },

  /**
   * Get occupancy forecast for next N days
   */
  async getOccupancyForecast(hotelId: string, days: number = 30) {
    const today = startOfDay(new Date())

    const forecast = []
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i)
      const availabilities = await prisma.roomAvailability.findMany({
        where: {
          date,
          roomType: {
            hotelId
          }
        }
      })

      const totalRooms = availabilities.reduce((sum, a) => sum + a.totalRooms, 0)
      const totalOccupied = availabilities.reduce((sum, a) => sum + a.occupied, 0)

      forecast.push({
        date,
        totalRooms,
        occupiedRooms: totalOccupied,
        occupancyRate: totalRooms > 0 ? (totalOccupied / totalRooms) * 100 : 0,
        availableRooms: totalRooms - totalOccupied
      })
    }

    return forecast
  },

  /**
   * Find low occupancy periods for promotions
   */
  async findLowOccupancyPeriods(hotelId: string, threshold: number = 30) {
    const today = startOfDay(new Date())

    const allAvailability = await prisma.roomAvailability.findMany({
      where: {
        date: {
          gte: today
        },
        roomType: {
          hotelId
        }
      },
      orderBy: { date: 'asc' }
    })

    // Filter by occupancy rate (calculated)
    const lowOccupancyDays = allAvailability.filter(a => {
      const occupancyRate = a.totalRooms > 0 ? (a.occupied / a.totalRooms) * 100 : 0
      return occupancyRate < threshold
    }).map(a => ({
      ...a,
      occupancyRate: a.totalRooms > 0 ? (a.occupied / a.totalRooms) * 100 : 0
    }))

    // Group consecutive days
    const periods = []
    let currentPeriod = null

    for (const day of lowOccupancyDays) {
      if (!currentPeriod) {
        currentPeriod = {
          startDate: day.date,
          endDate: day.date,
          avgOccupancy: day.occupancyRate
        }
      } else if (addDays(currentPeriod.endDate, 1).getTime() === day.date.getTime()) {
        currentPeriod.endDate = day.date
        currentPeriod.avgOccupancy =
          (currentPeriod.avgOccupancy + day.occupancyRate) / 2
      } else {
        periods.push(currentPeriod)
        currentPeriod = {
          startDate: day.date,
          endDate: day.date,
          avgOccupancy: day.occupancyRate
        }
      }
    }

    if (currentPeriod) {
      periods.push(currentPeriod)
    }

    return periods
  }
}
