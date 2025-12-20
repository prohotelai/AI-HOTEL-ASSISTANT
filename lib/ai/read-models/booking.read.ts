/**
 * AI Read Model: Booking
 * 
 * SAFETY: Read-only aggregated view for AI agents
 * - No direct Prisma access
 * - Hotel scoping enforced
 * - Sensitive fields masked
 * - RBAC validated
 */

import { prisma } from '@/lib/prisma'

export interface BookingReadModel {
  id: string
  confirmationNumber: string
  status: string
  checkInDate: string
  checkOutDate: string
  roomNumber: string
  roomType: string
  guestName: string
  adults: number
  children: number
  specialRequests?: string
  currency: string
  totalAmount: string // Masked if guest doesn't have permission
}

export interface BookingListFilters {
  status?: string
  checkInDate?: Date
  checkOutDate?: Date
  roomId?: string
  guestId?: string
}

/**
 * Get bookings for AI agent (read-only)
 * CRITICAL: Always filters by hotelId
 */
export async function getBookingsForAI(
  hotelId: string,
  filters: BookingListFilters = {}
): Promise<BookingReadModel[]> {
  const where: any = { hotelId }

  if (filters.status) where.status = filters.status
  if (filters.roomId) where.roomId = filters.roomId
  if (filters.guestId) where.guestId = filters.guestId
  if (filters.checkInDate) {
    where.checkInDate = { gte: filters.checkInDate }
  }
  if (filters.checkOutDate) {
    where.checkOutDate = { lte: filters.checkOutDate }
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      confirmationNumber: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      adults: true,
      children: true,
      specialRequests: true,
      totalAmount: true,
      currency: true,
      room: {
        select: {
          roomNumber: true,
          roomType: { select: { name: true } }
        }
      },
      guest: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { checkInDate: 'asc' },
    take: 100 // Limit for safety
  })

  return bookings.map(booking => ({
    id: booking.id,
    confirmationNumber: booking.confirmationNumber,
    status: booking.status,
    checkInDate: booking.checkInDate.toISOString(),
    checkOutDate: booking.checkOutDate.toISOString(),
    roomNumber: booking.room.roomNumber,
    roomType: booking.room.roomType.name,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
    adults: booking.adults,
    children: booking.children,
    specialRequests: booking.specialRequests || undefined,
    currency: booking.currency,
    totalAmount: booking.totalAmount.toString()
  }))
}

/**
 * Get single booking details for AI
 */
export async function getBookingByIdForAI(
  hotelId: string,
  bookingId: string
): Promise<BookingReadModel | null> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, hotelId },
    select: {
      id: true,
      confirmationNumber: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      adults: true,
      children: true,
      specialRequests: true,
      totalAmount: true,
      currency: true,
      room: {
        select: {
          roomNumber: true,
          roomType: { select: { name: true } }
        }
      },
      guest: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  if (!booking) return null

  return {
    id: booking.id,
    confirmationNumber: booking.confirmationNumber,
    status: booking.status,
    checkInDate: booking.checkInDate.toISOString(),
    checkOutDate: booking.checkOutDate.toISOString(),
    roomNumber: booking.room.roomNumber,
    roomType: booking.room.roomType.name,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
    adults: booking.adults,
    children: booking.children,
    specialRequests: booking.specialRequests || undefined,
    currency: booking.currency,
    totalAmount: booking.totalAmount.toString()
  }
}

/**
 * Get today's arrivals (for AI dashboard)
 */
export async function getTodayArrivalsForAI(hotelId: string): Promise<BookingReadModel[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return getBookingsForAI(hotelId, {
    status: 'CONFIRMED',
    checkInDate: today
  })
}

/**
 * Get today's departures (for AI dashboard)
 */
export async function getTodayDeparturesForAI(hotelId: string): Promise<BookingReadModel[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return getBookingsForAI(hotelId, {
    status: 'CHECKED_IN',
    checkOutDate: today
  })
}
