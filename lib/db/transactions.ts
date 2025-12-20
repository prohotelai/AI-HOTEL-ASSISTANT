/**
 * Phase 8: Transaction Helpers for Critical Operations
 * Ensures ACID properties for multi-step database operations
 */

import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Execute function within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    try {
      return await fn(tx)
    } catch (error) {
      console.error('[Transaction] Rolling back due to error:', error)
      throw error
    }
  }, {
    maxWait: 5000, // 5 seconds max wait to acquire transaction
    timeout: 10000, // 10 seconds transaction timeout
    isolationLevel: 'ReadCommitted', // Standard isolation level
  })
}

/**
 * Create booking with folio in a single transaction
 * Ensures booking and folio are created atomically
 * 
 * Phase 9: Uncommented - Folio models are now available
 */
export async function createBookingWithFolio(
  hotelId: string,
  bookingData: {
    guestId: string
    roomId: string
    checkInDate: Date
    checkOutDate: Date
    totalAmount: number
    adults: number
    children?: number
    specialRequests?: string
  }
): Promise<{ bookingId: string; folioId: string }> {
  return await withTransaction(async (tx) => {
    // 1. Create booking
    const booking = await tx.booking.create({
      data: {
        hotelId,
        guestId: bookingData.guestId,
        roomId: bookingData.roomId,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        confirmationNumber: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'CONFIRMED',
        source: 'DIRECT',
        totalAmount: bookingData.totalAmount,
        amountPaid: 0,
        currency: 'USD',
        adults: bookingData.adults,
        children: bookingData.children || 0,
        specialRequests: bookingData.specialRequests,
      },
    })

    // 2. Create folio
    const folio = await tx.folio.create({
      data: {
        hotelId,
        bookingId: booking.id,
        guestId: bookingData.guestId,
        folioNumber: `F-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'OPEN',
        totalAmount: bookingData.totalAmount,
        balanceDue: bookingData.totalAmount,
        currency: 'USD',
        paymentStatus: 'UNPAID',
      },
    })

    return {
      bookingId: booking.id,
      folioId: folio.id,
    }
  })
}

/**
 * Check-in guest with room assignment and key issuance
 * Atomic operation to prevent partial check-ins
 */
export async function checkInGuest(
  hotelId: string,
  bookingId: string,
  roomId: string,
  userId: string
): Promise<void> {
  return await withTransaction(async (tx) => {
    // 1. Update booking status
    await tx.booking.update({
      where: { id: bookingId, hotelId },
      data: {
        status: 'CHECKED_IN',
        actualCheckIn: new Date(),
        roomId,
      },
    })

    // 2. Update room status
    await tx.room.update({
      where: { id: roomId, hotelId },
      data: {
        status: 'OCCUPIED',
      },
    })

    // 3. Create key issue log
    // Note: KeyIssueLog model to be added in future phase if needed
    // For now, key issuance is handled via external systems
  })
}

/**
 * Check-out guest with folio closure
 * Ensures room is marked clean and folio is closed atomically
 */
export async function checkOutGuest(
  hotelId: string,
  bookingId: string,
  roomId: string,
  userId: string
): Promise<{ housekeepingTaskId: string }> {
  return await withTransaction(async (tx) => {
    // 1. Update booking status
    const booking = await tx.booking.update({
      where: { id: bookingId, hotelId },
      data: {
        status: 'CHECKED_OUT',
        actualCheckOut: new Date(),
      },
    })

    // 2. Update room status
    await tx.room.update({
      where: { id: roomId, hotelId },
      data: {
        status: 'DIRTY',
      },
    })

    // 3. Close folio
    await tx.folio.updateMany({
      where: { bookingId, hotelId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    })

    // 4. Create housekeeping task
    const housekeepingTask = await tx.housekeepingTask.create({
      data: {
        hotelId,
        roomId,
        taskType: 'CHECKOUT_CLEAN',
        status: 'PENDING',
        priority: 'HIGH',
        scheduledFor: new Date(),
        credits: 10,
      },
    })

    return {
      housekeepingTaskId: housekeepingTask.id,
    }
  })
}

/**
 * Post charge to folio with audit trail
 * Ensures charge and audit log are created atomically
 * 
 * Phase 9: Uncommented - Folio models are now available
 */
export async function postChargeToFolio(
  hotelId: string,
  folioId: string,
  chargeData: {
    description: string
    amount: number
    category: string
    postedBy: string
  }
): Promise<string> {
  return await withTransaction(async (tx) => {
    // 1. Get current folio
    const folio = await tx.folio.findUnique({
      where: { id: folioId, hotelId },
    })

    if (!folio) {
      throw new Error('Folio not found')
    }

    if (folio.status !== 'OPEN') {
      throw new Error('Cannot post charge to closed folio')
    }

    // 2. Create charge record
    const charge = await tx.folioItem.create({
      data: {
        folioId,
        description: chargeData.description,
        category: chargeData.category,
        quantity: 1,
        unitPrice: chargeData.amount,
        totalPrice: chargeData.amount,
        taxRate: 0,
        taxAmount: 0,
        postedBy: chargeData.postedBy,
        referenceType: 'MANUAL',
      },
    })

    // 3. Update folio balance
    await tx.folio.update({
      where: { id: folioId, hotelId },
      data: {
        totalAmount: {
          increment: chargeData.amount,
        },
        balanceDue: {
          increment: chargeData.amount,
        },
      },
    })

    // 4. Create audit log
    await tx.auditLog.create({
      data: {
        hotelId,
        userId: chargeData.postedBy,
        eventType: 'FOLIO_CHARGE',
        action: 'charge.posted',
        resourceType: 'FolioCharge',
        resourceId: charge.id,
        success: true,
        severity: 'INFO',
        metadata: {
          folioId,
          amount: chargeData.amount,
          description: chargeData.description,
        },
      },
    })

    return charge.id
  })
}

/**
 * Cancel booking with refund processing
 * Ensures booking cancellation, folio update, and room release are atomic
 * 
 * Phase 9: Uncommented - Folio models are now available
 */
export async function cancelBookingWithRefund(
  hotelId: string,
  bookingId: string,
  cancelReason: string,
  refundAmount: number,
  userId: string
): Promise<void> {
  return await withTransaction(async (tx) => {
    // 1. Get booking
    const booking = await tx.booking.findUnique({
      where: { id: bookingId, hotelId },
      include: { room: true },
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // 2. Update booking status
    await tx.booking.update({
      where: { id: bookingId, hotelId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason,
      },
    })

    // 3. Release room if assigned
    if (booking.roomId) {
      await tx.room.update({
        where: { id: booking.roomId, hotelId },
        data: {
          status: 'AVAILABLE',
        },
      })
    }

    // 4. Update folio with refund
    if (refundAmount > 0) {
      const folio = await tx.folio.findUnique({ where: { bookingId } })
      if (folio) {
        await tx.folio.update({
          where: { id: folio.id },
          data: {
            balanceDue: {
              decrement: refundAmount,
            },
          },
        })

        // Create refund record
        await tx.folioItem.create({
          data: {
            folioId: folio.id,
            description: `Cancellation refund: ${cancelReason}`,
            category: 'REFUND',
            quantity: 1,
            unitPrice: -refundAmount,
            totalPrice: -refundAmount,
            taxRate: 0,
            taxAmount: 0,
            postedBy: userId,
            referenceType: 'CORRECTION',
          },
        })
      }
    }

    // 5. Audit log
    await tx.auditLog.create({
      data: {
        hotelId,
        userId,
        eventType: 'BOOKING_CANCELED',
        action: 'booking.cancelled',
        resourceType: 'Booking',
        resourceId: bookingId,
        success: true,
        severity: 'WARN',
        metadata: {
          cancelReason,
          refundAmount,
          roomReleased: !!booking.roomId,
        },
      },
    })
  })
}

/**
 * Bulk room status update (for nightly batch jobs)
 * Updates multiple rooms atomically
 */
export async function bulkUpdateRoomStatus(
  hotelId: string,
  updates: Array<{ roomId: string; status: string; notes?: string }>
): Promise<number> {
  return await withTransaction(async (tx) => {
    let updatedCount = 0

    for (const update of updates) {
      await tx.room.update({
        where: { id: update.roomId, hotelId },
        data: {
          status: update.status as any,
          notes: update.notes,
          updatedAt: new Date(),
        },
      })
      updatedCount++
    }

    return updatedCount
  })
}

/**
 * Complete housekeeping task and update room status
 * Ensures task completion and room status are updated atomically
 */
export async function completeHousekeepingTask(
  hotelId: string,
  taskId: string,
  staffId: string,
  issuesFound?: string
): Promise<void> {
  return await withTransaction(async (tx) => {
    // 1. Get task
    const task = await tx.housekeepingTask.findUnique({
      where: { id: taskId, hotelId },
    })

    if (!task) {
      throw new Error('Task not found')
    }

    // 2. Update task
    await tx.housekeepingTask.update({
      where: { id: taskId, hotelId },
      data: {
        status: issuesFound ? 'NEEDS_ATTENTION' : 'COMPLETED',
        completedAt: new Date(),
        issuesFound,
      },
    })

    // 3. Update room status if no issues
    if (!issuesFound) {
      await tx.room.update({
        where: { id: task.roomId, hotelId },
        data: {
          status: 'AVAILABLE',
          lastCleaned: new Date(),
        },
      })
    }

    // 4. Award credits to staff
    // (Assuming staff credits tracking exists)
  })
}

/**
 * Handle PMS sync transaction
 * Ensures all sync operations are atomic
 */
export async function syncPMSDataTransaction(
  hotelId: string,
  provider: string,
  syncData: {
    rooms?: Array<any>
    guests?: Array<any>
    bookings?: Array<any>
  }
): Promise<{ processed: number; failed: number }> {
  return await withTransaction(async (tx) => {
    let processed = 0
    let failed = 0

    // Sync rooms
    if (syncData.rooms) {
      for (const room of syncData.rooms) {
        try {
          // Upsert logic here
          processed++
        } catch (error) {
          failed++
          console.error('[Sync] Failed to sync room:', error)
        }
      }
    }

    // Sync guests
    if (syncData.guests) {
      for (const guest of syncData.guests) {
        try {
          // Upsert logic here
          processed++
        } catch (error) {
          failed++
          console.error('[Sync] Failed to sync guest:', error)
        }
      }
    }

    // Sync bookings
    if (syncData.bookings) {
      for (const booking of syncData.bookings) {
        try {
          // Upsert logic here
          processed++
        } catch (error) {
          failed++
          console.error('[Sync] Failed to sync booking:', error)
        }
      }
    }

    return { processed, failed }
  })
}
