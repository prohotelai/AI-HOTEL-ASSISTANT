/**
 * Check-in Service - Handle guest check-in workflow
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { RoomStatus } from '@prisma/client'

export interface CheckInInput {
  bookingId: string
  hotelId: string
  roomId?: string
  actualCheckInTime?: Date
  guestIdVerified?: boolean
  depositAmount?: number
  paymentMethodId?: string
  specialRequests?: string
  userId: string
}

/**
 * Perform check-in
 */
export async function checkIn(input: CheckInInput) {
  const {
    bookingId,
    hotelId,
    roomId,
    actualCheckInTime,
    guestIdVerified,
    depositAmount,
    specialRequests,
    userId
  } = input

  // Get booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, hotelId },
    include: {
      guest: true,
      room: { include: { roomType: true } }
    }
  })

  if (!booking) {
    throw new Error('Booking not found')
  }

  if (booking.status !== 'CONFIRMED') {
    throw new Error(`Cannot check in booking with status: ${booking.status}`)
  }

  // Assign room if not already assigned
  let assignedRoomId = booking.roomId || roomId

  if (!assignedRoomId) {
    // Auto-assign available room of same type
    const availableRoom = await prisma.room.findFirst({
      where: {
        hotelId,
        roomTypeId: booking.room.roomTypeId,
        status: 'AVAILABLE',
        isOutOfService: false
      }
    })

    if (!availableRoom) {
      throw new Error('No available rooms of this type')
    }

    assignedRoomId = availableRoom.id
  }

  // Verify room is available
  const room = await prisma.room.findUnique({
    where: { id: assignedRoomId, hotelId }
  })

  if (!room) {
    throw new Error('Room not found')
  }

  if (room.status !== 'AVAILABLE') {
    throw new Error(`Room ${room.roomNumber} is ${room.status}`)
  }

  // Begin transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update booking
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId, hotelId },
      data: {
        status: 'CHECKED_IN',
        roomId: assignedRoomId,
        actualCheckIn: actualCheckInTime || new Date(),
        specialRequests: specialRequests || booking.specialRequests
      }
    })

    // Update room status
    await tx.room.update({
      where: { id: assignedRoomId!, hotelId },
      data: {
        status: 'OCCUPIED' as RoomStatus
      }
    })

    // TODO: Phase 4 - Add room status history tracking
    // await tx.roomStatusHistory.create({ ... })

    // TODO: Phase 4 - Create folio and folio items for billing
    // const folio = await tx.folio.create({ ... })
    // await tx.folioItem.create({ ... })

    return { booking: updatedBooking, room }
  })

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('booking.checkedIn', {
  //   bookingId: result.booking.id,
  //   hotelId,
  //   roomId: assignedRoomId,
  //   guestId: booking.guestId,
  //   userId
  // })

  return result
}

/**
 * Get available rooms for check-in
 */
export async function getAvailableRoomsForCheckIn(
  hotelId: string,
  roomTypeId: string
) {
  return prisma.room.findMany({
    where: {
      hotelId,
      roomTypeId,
      status: 'AVAILABLE',
      isOutOfService: false
    },
    include: {
      roomType: true
    },
    orderBy: { roomNumber: 'asc' }
  })
}

/**
 * Verify guest identity
 */
export async function verifyGuestIdentity(
  guestId: string,
  hotelId: string,
  idType: string,
  idNumber: string,
  idExpiry?: Date,
  idImageUrl?: string
) {
  const guest = await prisma.guest.update({
    where: { id: guestId, hotelId },
    data: {
      idType,
      idNumber
      // TODO: Phase 4 - Add idExpiry, idImageUrl fields to Guest model
    }
  })

  return guest
}

/**
 * Issue room key
 */
export async function issueRoomKey(
  hotelId: string,
  bookingId: string,
  roomId: string,
  keyNumber: string,
  keyType: 'PHYSICAL' | 'CARD' | 'DIGITAL',
  guestName: string,
  userId: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, hotelId }
  })

  if (!booking) {
    throw new Error('Booking not found')
  }

  // TODO: Phase 4 - Add key management system
  // const keyLog = await prisma.keyIssueLog.create({
  //   data: {
  //     hotelId,
  //     bookingId,
  //     roomId,
  //     guestId: booking.guestId,
  //     keyNumber,
  //     keyType,
  //     guestName,
  //     issuedBy: userId,
  //     issuedAt: new Date(),
  //     status: 'ISSUED'
  //   }
  // })

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('key.issued', {
  //   keyLogId: keyLog.id,
  //   hotelId,
  //   bookingId,
  //   roomId,
  //   keyNumber
  // })

  return null // Phase 4 will return keyLog
}

/**
 * Get pending check-ins for today
 */
export async function getPendingCheckInsToday(hotelId: string) {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
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
 * Get early check-in requests
 */
export async function getEarlyCheckInRequests(hotelId: string) {
  const now = new Date()
  const standardCheckInTime = new Date()
  standardCheckInTime.setHours(15, 0, 0, 0) // 3 PM

  if (now.getHours() >= 15) {
    return [] // Past standard check-in time
  }

  return prisma.booking.findMany({
    where: {
      hotelId,
      checkInDate: {
        gte: new Date(now.setHours(0, 0, 0, 0)),
        lte: new Date(now.setHours(23, 59, 59, 999))
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
 * Pre-assign rooms for arrivals
 */
export async function preAssignRooms(hotelId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Get confirmed bookings for the date
  const bookings = await prisma.booking.findMany({
    where: {
      hotelId,
      checkInDate: {
        gte: startOfDay,
        lte: endOfDay
      },
      status: 'CONFIRMED'
    },
    include: {
      room: {
        include: {
          roomType: true
        }
      }
    }
  })

  const assignments: any[] = []

  for (const booking of bookings) {
    // Skip if already has room assignment (roomId is required in schema)
    // TODO Phase 5+: Make roomId optional in schema to support pre-assignment booking flow
    
    // Find available room matching the booking's room type
    const availableRoom = await prisma.room.findFirst({
      where: {
        hotelId,
        roomTypeId: booking.room.roomTypeId,
        status: 'AVAILABLE',
        isOutOfService: false
      }
    })

    if (availableRoom) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { roomId: availableRoom.id }
      })

      assignments.push({
        bookingId: booking.id,
        confirmationNumber: booking.confirmationNumber,
        roomNumber: availableRoom.roomNumber
      })
    }
  }

  // TODO: Add PMS event types in Phase 6
  // eventBus.emit('rooms.preAssigned', {
  //   hotelId,
  //   date,
  //   assignmentCount: assignments.length
  // })

  return assignments
}
