/**
 * Booking Service - Manage PMS bookings
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { BookingStatus } from '@prisma/client'
import { roomHasBlockingMaintenance } from '@/lib/services/maintenanceService'

export interface CreateBookingInput {
  hotelId: string
  guestId?: string
  guestData?: {
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  checkInDate: Date
  checkOutDate: Date
  numberOfAdults: number
  numberOfChildren?: number
  guestNames?: string[]
  roomTypeId: string
  roomId?: string
  ratePlanId: string
  specialRequests?: string
  arrivalTime?: string
  bookingSource?: string
  bookingChannel?: string
}

export interface UpdateBookingInput {
  checkInDate?: Date
  checkOutDate?: Date
  numberOfAdults?: number
  numberOfChildren?: number
  guestNames?: string[]
  roomId?: string
  specialRequests?: string
  arrivalTime?: string
  status?: BookingStatus
}

/**
 * Generate unique confirmation number
 */
function generateConfirmationNumber(): string {
  const prefix = 'BK'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Calculate total booking amount
 */
async function calculateBookingAmount(
  hotelId: string,
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  numberOfAdults: number,
  numberOfChildren: number
): Promise<number> {
  // Phase 2: Simplified calculation using room type base price from room
  const room = await prisma.room.findUnique({
    where: { id: roomId, hotelId },
    include: { roomType: true }
  })

  if (!room || !room.roomType) {
    throw new Error('Room or room type not found')
  }

  // Calculate number of nights
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Phase 2: Use base price only
  const basePrice = room.roomType.basePrice
  const totalAmount = basePrice * nights

  return Math.round(totalAmount * 100) / 100 // Round to 2 decimals
}

/**
 * Create new booking
 */
export async function createBooking(input: CreateBookingInput) {
  // Validate dates
  if (input.checkOutDate <= input.checkInDate) {
    throw new Error('Check-out date must be after check-in date')
  }

  // Get or create guest
  let guestId = input.guestId

  if (!guestId && input.guestData) {
    // Create new guest
    const guest = await prisma.guest.create({
      data: {
        hotelId: input.hotelId,
        ...input.guestData
      }
    })
    guestId = guest.id
  }

  if (!guestId) {
    throw new Error('Guest ID or guest data required')
  }

  if (!input.roomId) {
    throw new Error('Room ID is required')
  }

  // Validate room availability
  if (input.roomId) {
    // Check for conflicting bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId: input.roomId,
        hotelId: input.hotelId,
        status: {
          in: ['CONFIRMED', 'CHECKED_IN']
        },
        OR: [
          {
            checkInDate: { lte: input.checkInDate },
            checkOutDate: { gt: input.checkInDate }
          },
          {
            checkInDate: { lt: input.checkOutDate },
            checkOutDate: { gte: input.checkOutDate }
          }
        ]
      }
    })

    if (conflictingBooking) {
      throw new Error('Room not available for selected dates')
    }

    // Check for blocking maintenance tickets (Phase 4)
    const hasBlockingMaintenance = await roomHasBlockingMaintenance(input.hotelId, input.roomId)
    if (hasBlockingMaintenance) {
      throw new Error('Room is currently under maintenance and unavailable for booking')
    }
  }

  // Calculate total amount
  const totalAmount = await calculateBookingAmount(
    input.hotelId,
    input.roomId,
    input.checkInDate,
    input.checkOutDate,
    input.numberOfAdults,
    input.numberOfChildren || 0
  )

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      hotelId: input.hotelId,
      guestId,
      roomId: input.roomId,
      confirmationNumber: generateConfirmationNumber(),
      status: 'CONFIRMED',
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      adults: input.numberOfAdults,
      children: input.numberOfChildren || 0,
      totalAmount,
      amountPaid: 0,
      currency: 'USD',
      specialRequests: input.specialRequests,
      source: (input.bookingSource as any) || 'DIRECT'
    },
    include: {
      guest: true,
      room: { include: { roomType: true } }
    }
  })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('booking.created', {
      bookingId: booking.id,
      hotelId: booking.hotelId,
      confirmationNumber: booking.confirmationNumber
    })
  } catch (error) {
    console.error('[Booking] Error emitting booking.created:', error)
  }

  return booking
}

/**
 * Get booking by ID
 */
export async function getBooking(bookingId: string, hotelId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId, hotelId },
    include: {
      guest: true,
      room: { include: { roomType: true } }
      // Phase 5 will add: ratePlan, folios, invoices
    }
  })
}

/**
 * Get booking by confirmation number
 */
export async function getBookingByConfirmation(confirmationNumber: string, hotelId: string) {
  return prisma.booking.findFirst({
    where: {
      confirmationNumber,
      hotelId
    },
    include: {
      guest: true,
      room: { include: { roomType: true } }
    }
  })
}

/**
 * List bookings with filters
 */
export async function listBookings(
  hotelId: string,
  options?: {
    status?: BookingStatus
    checkInDate?: Date
    checkOutDate?: Date
    guestId?: string
    roomId?: string
    limit?: number
    offset?: number
  }
) {
  const where: any = { hotelId }

  if (options?.status) {
    where.status = options.status
  }

  if (options?.checkInDate) {
    where.checkInDate = { gte: options.checkInDate }
  }

  if (options?.checkOutDate) {
    where.checkOutDate = { lte: options.checkOutDate }
  }

  if (options?.guestId) {
    where.guestId = options.guestId
  }

  if (options?.roomId) {
    where.roomId = options.roomId
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        room: {
          select: {
            roomNumber: true,
            roomType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { checkInDate: 'asc' },
      take: options?.limit || 50,
      skip: options?.offset || 0
    }),
    prisma.booking.count({ where })
  ])

  return { bookings, total }
}

/**
 * Update booking
 */
export async function updateBooking(
  bookingId: string,
  hotelId: string,
  input: UpdateBookingInput
) {
  // Recalculate amount if dates or guests changed
  let updateData: any = { ...input }

  if (input.checkInDate || input.checkOutDate || input.numberOfAdults !== undefined || input.roomId) {
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId, hotelId }
    })

    if (!existingBooking) {
      throw new Error('Booking not found')
    }

    const roomIdToUse = input.roomId || existingBooking.roomId

    const totalAmount = await calculateBookingAmount(
      hotelId,
      roomIdToUse,
      input.checkInDate || existingBooking.checkInDate,
      input.checkOutDate || existingBooking.checkOutDate,
      input.numberOfAdults ?? existingBooking.adults,
      input.numberOfChildren ?? existingBooking.children
    )

    updateData.totalAmount = totalAmount
  }

  const booking = await prisma.booking.update({
    where: { id: bookingId, hotelId },
    data: updateData,
    include: {
      guest: true,
      room: { include: { roomType: true } }
    }
  })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('booking.updated', {
      bookingId: booking.id,
      hotelId: booking.hotelId,
      changes: updateData as Record<string, unknown>
    })
  } catch (error) {
    console.error('[Booking] Error emitting booking.updated:', error)
  }

  return booking
}

/**
 * Assign room to booking
 */
export async function assignRoom(bookingId: string, hotelId: string, roomId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId, hotelId },
    data: { roomId },
    include: {
      room: { include: { roomType: true } }
    }
  })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('booking.roomAssigned', {
      bookingId: booking.id,
      hotelId: booking.hotelId,
      roomId
    })
  } catch (error) {
    console.error('[Booking] Error emitting booking.roomAssigned:', error)
  }

  return booking
}

/**
 * Cancel booking
 */
export async function cancelBooking(
  bookingId: string,
  hotelId: string,
  reason?: string,
  userId?: string
) {
  const booking = await prisma.booking.update({
    where: { id: bookingId, hotelId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      cancelReason: reason
    }
  })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('booking.cancelled', {
      bookingId: booking.id,
      hotelId: booking.hotelId,
      reason
    })
  } catch (error) {
    console.error('[Booking] Error emitting booking.cancelled:', error)
  }

  return booking
}

/**
 * Mark booking as no-show
 */
export async function markNoShow(
  bookingId: string,
  hotelId: string,
  noShowFee: number = 0
) {
  const booking = await prisma.booking.update({
    where: { id: bookingId, hotelId },
    data: {
      status: 'NO_SHOW'
    },
    include: {
      guest: true
    }
  })

  // TODO: Create no-show record in Phase 4
  // await prisma.noShowRecord.create({
  //   data: {
  //     hotelId,
  //     bookingId: booking.id,
  //     guestId: booking.guestId,
  //     expectedCheckInDate: booking.checkInDate,
  //     feeCharged: noShowFee,
  //     date: new Date()
  //   }
  // })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('booking.noShow', {
      bookingId: booking.id,
      hotelId: booking.hotelId
    })
  } catch (error) {
    console.error('[Booking] Error emitting booking.noShow:', error)
  }

  return booking
}

/**
 * Get arrivals for date
 */
export async function getArrivals(hotelId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return prisma.booking.findMany({
    where: {
      hotelId,
      checkInDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'CONFIRMED'
    },
    include: {
      guest: true,
      room: { include: { roomType: true } }
    },
    orderBy: { checkInDate: 'asc' }
  })
}

/**
 * Get departures for date
 */
export async function getDepartures(hotelId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return prisma.booking.findMany({
    where: {
      hotelId,
      checkOutDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'CHECKED_IN'
    },
    include: {
      guest: true,
      room: { include: { roomType: true } }
    },
    orderBy: { guest: { lastName: 'asc' } }
  })
}

/**
 * Get in-house guests
 */
export async function getInHouseGuests(hotelId: string) {
  return prisma.booking.findMany({
    where: {
      hotelId,
      status: 'CHECKED_IN'
    },
    include: {
      guest: true,
      room: { include: { roomType: true } }
    },
    orderBy: { room: { roomNumber: 'asc' } }
  })
}

/**
 * Get booking statistics
 */
export async function getBookingStatistics(
  hotelId: string,
  startDate: Date,
  endDate: Date
) {
  const [
    totalBookings,
    confirmedBookings,
    checkedInBookings,
    cancelledBookings,
    noShowBookings,
    totalRevenue
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        hotelId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        hotelId,
        status: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        hotelId,
        status: 'CHECKED_IN',
        checkInDate: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        hotelId,
        status: 'CANCELED',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        hotelId,
        status: 'NO_SHOW',
        checkInDate: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.aggregate({
      where: {
        hotelId,
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: { gte: startDate, lte: endDate }
      },
      _sum: { totalAmount: true }
    })
  ])

  return {
    totalBookings,
    confirmedBookings,
    checkedInBookings,
    cancelledBookings,
    noShowBookings,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
    noShowRate: totalBookings > 0 ? (noShowBookings / totalBookings) * 100 : 0
  }
}

/**
 * =============================================================================
 * PHASE 5: BILLING INTEGRATION
 * =============================================================================
 */

import { openFolio, addFolioItem, closeFolio } from './folioService'
import { updateGuestStats } from './guestService'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Check-in: Set booking to CHECKED_IN, create folio, post initial room charge
 * CRITICAL: This is idempotent - can be called multiple times safely
 */
export async function checkInBooking(
  hotelId: string,
  bookingId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    // Get booking with full details
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: {
        room: { include: { roomType: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
      }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    if (booking.status === 'CHECKED_IN') {
      // Already checked in - return existing folio
      const existingFolio = await tx.folio.findUnique({
        where: { bookingId: booking.id }
      })
      return { booking, folio: existingFolio }
    }

    if (booking.status === 'CANCELED') {
      throw new Error('Cannot check in canceled booking')
    }

    // Update booking status
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_IN',
        actualCheckIn: new Date()
      }
    })

    // Check if folio already exists (edge case)
    let folio = await tx.folio.findUnique({
      where: { bookingId: booking.id }
    })

    if (!folio) {
      // Create folio
      folio = await openFolio(hotelId, userId, {
        bookingId: booking.id,
        guestId: booking.guestId,
        billingName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        billingEmail: booking.guest.email || undefined,
        billingPhone: booking.guest.phone || undefined,
        currency: booking.currency
      })

      // Calculate room charge (per night or full stay, depending on hotel policy)
      // For now: Post full stay amount as one charge
      const nights = Math.ceil(
        (booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      const roomRate = new Decimal(booking.room.roomType.basePrice)
      const totalRoomCharge = roomRate.mul(nights)

      // Post room charge to folio
      await addFolioItem(hotelId, folio.id, userId, {
        description: `Room ${booking.room.roomNumber} - ${nights} night(s)`,
        category: 'ROOM',
        quantity: nights,
        unitPrice: roomRate,
        taxRate: 0, // TODO: Get tax rate from hotel settings
        referenceId: booking.id,
        referenceType: 'ROOM_CHARGE'
      })
    }

    return { booking, folio }
  })
}

/**
 * Check-out: Set booking to CHECKED_OUT, close folio, update guest stats
 * CRITICAL: Requires folio balance to be zero (paid) unless allowUnpaid=true
 */
export async function checkOutBooking(
  hotelId: string,
  bookingId: string,
  userId: string,
  options: { allowUnpaid?: boolean } = {}
) {
  return prisma.$transaction(async (tx) => {
    // Get booking
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, hotelId },
      include: {
        folio: true,
        guest: { select: { id: true } }
      }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    if (booking.status !== 'CHECKED_IN') {
      throw new Error(`Cannot check out booking with status: ${booking.status}`)
    }

    if (!booking.folio) {
      throw new Error('No folio found for booking')
    }

    // Close folio (will validate balance unless allowUnpaid=true)
    const closedFolio = await closeFolio(
      hotelId,
      booking.folio.id,
      userId,
      options.allowUnpaid || false
    )

    // Update booking status
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_OUT',
        actualCheckOut: new Date()
      }
    })

    // Update guest stats (totalStays incremented, totalSpent already updated by closeFolio)
    await updateGuestStats(
      booking.guestId,
      hotelId,
      0 // Amount already added by closeFolio
    )

    return { booking, folio: closedFolio }
  })
}
