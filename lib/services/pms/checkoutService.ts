/**
 * Check-out Service - Handle guest check-out workflow
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { RoomStatus } from '@prisma/client'
import { generateCheckoutCleaningTask } from '@/lib/services/housekeepingService'

export interface CheckOutInput {
  bookingId: string
  hotelId: string
  actualCheckOutTime?: Date
  userId: string
  generateInvoice?: boolean
  emailInvoice?: boolean
}

/**
 * Perform check-out
 * Phase 4: Simplified version using only Phase 4 models
 */
export async function checkOut(input: CheckOutInput) {
  const {
    bookingId,
    hotelId,
    actualCheckOutTime,
    userId
  } = input

  // Get booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, hotelId },
    include: {
      guest: true,
      room: {
        include: {
          roomType: true
        }
      }
    }
  })

  if (!booking) {
    throw new Error('Booking not found')
  }

  if (booking.status !== 'CHECKED_IN') {
    throw new Error(`Cannot check out booking with status: ${booking.status}`)
  }

  if (!booking.roomId) {
    throw new Error('No room assigned to booking')
  }

  // TODO Phase 5+: Check for unpaid balances via folio system

  // Update booking to checked out
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId, hotelId },
    data: {
      status: 'CHECKED_OUT',
      actualCheckOut: actualCheckOutTime || new Date()
    }
  })

  // Generate housekeeping task automatically
  const housekeepingTask = await generateCheckoutCleaningTask(
    hotelId,
    booking.roomId,
    booking.confirmationNumber,
    actualCheckOutTime
  )

  // TODO Phase 5+: Add guest statistics tracking (totalStays, totalSpent, loyalty points)

  eventBus.emit('booking.checkedOut', {
    bookingId: updatedBooking.id,
    hotelId,
    roomId: booking.roomId,
    guestId: booking.guestId,
    userId,
    housekeepingTaskId: housekeepingTask.id
  })

  return {
    booking: updatedBooking,
    housekeepingTask
  }
}

/**
 * Update guest statistics after checkout
 */
// TODO Phase 5+: Implement guest statistics tracking

// TODO Phase 5+: The following utility functions require models not yet implemented:
// - expressCheckOut (requires folio model)
// - getPendingCheckOutsToday (requires folio model)
// - getLateCheckOuts (basic function - can be implemented with current models)
// - returnRoomKey (requires keyIssueLog model)
// - reportLostKey (requires keyIssueLog model)
// - postLateCheckoutCharge (requires folio, folioItem models)
// - getCheckoutSummary (requires folio, invoice models)

/**
 * Get late check-outs (bookings that should have checked out but haven't)
 */
export async function getLateCheckOuts(hotelId: string) {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  return prisma.booking.findMany({
    where: {
      hotelId,
      checkOutDate: {
        lt: new Date(now.setHours(0, 0, 0, 0))
      },
      status: 'CHECKED_IN'
    },
    include: {
      guest: true,
      room: {
        include: {
          roomType: true
        }
      }
    },
    orderBy: { checkOutDate: 'asc' }
  })
}
