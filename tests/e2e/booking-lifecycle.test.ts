/**
 * E2E Tests: Booking Lifecycle
 * 
 * Critical flows:
 * - Create booking (availability respected)
 * - Prevent double booking
 * - Check-in → Check-out lifecycle
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('E2E: Booking Lifecycle', () => {
  let testHotel: any
  let roomType: any
  let room: any
  let guest: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.booking.deleteMany()
    await prisma.room.deleteMany()
    await prisma.roomType.deleteMany()
    await prisma.guest.deleteMany({ where: { email: { contains: '@booking-e2e.com' } } })
    await prisma.hotel.deleteMany({ where: { name: { contains: 'Booking E2E Hotel' } } })

    // Create test hotel
    testHotel = await prisma.hotel.create({
      data: {
        name: 'Booking E2E Hotel',
        slug: `booking-e2e-hotel-${Date.now()}`,
        email: 'booking@e2e-test.com',
        phone: '1234567890',
        address: '123 Test St'
      }
    })

    // Create room type
    roomType = await prisma.roomType.create({
      data: {
        hotelId: testHotel.id,
        name: 'Standard Room',
        basePrice: 150,
        maxOccupancy: 2,
        description: 'Standard room for testing'
      }
    })

    // Create room
    room = await prisma.room.create({
      data: {
        hotelId: testHotel.id,
        roomNumber: '101',
        floor: 1,
        roomTypeId: roomType.id,
        status: 'AVAILABLE',
        isActive: true
      }
    })

    // Create guest
    guest = await prisma.guest.create({
      data: {
        hotelId: testHotel.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@booking-e2e.com',
        phone: '+1234567890'
      }
    })
  })

  afterEach(async () => {
    // Cleanup
    await prisma.booking.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.room.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.roomType.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.guest.deleteMany({ where: { hotelId: testHotel.id } })
    await prisma.hotel.deleteMany({ where: { id: testHotel.id } })
  })

  describe('Create Booking (Availability Respected)', () => {
    it('should create booking when room is available', async () => {
      const checkInDate = new Date('2025-06-01')
      const checkOutDate = new Date('2025-06-05')

      // Check no existing bookings for this room in this period
      const existingBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          hotelId: testHotel.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          OR: [
            {
              checkInDate: { lte: checkOutDate },
              checkOutDate: { gte: checkInDate }
            }
          ]
        }
      })

      expect(existingBookings).toHaveLength(0)

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate,
          checkOutDate,
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CONFIRMED',
          totalAmount: 600, // 4 nights * 150
          amountPaid: 0,
          currency: 'USD',
          adults: 2,
          children: 0,
          source: 'DIRECT'
        }
      })

      expect(booking).toBeTruthy()
      expect(booking.id).toBeTruthy()
      expect(booking.status).toBe('CONFIRMED')
      expect(booking.hotelId).toBe(testHotel.id)
      expect(booking.roomId).toBe(room.id)
      expect(booking.guestId).toBe(guest.id)
      expect(booking.totalAmount).toBe(600)

      // Verify booking exists
      const fetchedBooking = await prisma.booking.findUnique({
        where: { id: booking.id }
      })

      expect(fetchedBooking).toBeTruthy()
      expect(fetchedBooking?.confirmationNumber).toBe(booking.confirmationNumber)
    })

    it('should respect room availability status', async () => {
      // Mark room as out of order
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'OUT_OF_ORDER', isActive: false }
      })

      const checkInDate = new Date('2025-06-01')
      const checkOutDate = new Date('2025-06-05')

      // Check room availability
      const availableRoom = await prisma.room.findFirst({
        where: {
          id: room.id,
          hotelId: testHotel.id,
          isActive: true, // Should filter out inactive rooms
          status: { not: 'OUT_OF_ORDER' }
        }
      })

      // Room should not be available
      expect(availableRoom).toBeNull()

      // Attempting to book should fail (in real API)
      // Here we just verify the room is not available in query
    })

    it('should calculate total amount correctly', async () => {
      const checkInDate = new Date('2025-07-01')
      const checkOutDate = new Date('2025-07-06') // 5 nights

      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalAmount = nights * roomType.basePrice

      expect(nights).toBe(5)
      expect(totalAmount).toBe(750) // 5 * 150

      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate,
          checkOutDate,
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CONFIRMED',
          totalAmount,
          currency: 'USD',
          adults: 1
        }
      })

      expect(booking.totalAmount).toBe(750)
    })
  })

  describe('Prevent Double Booking', () => {
    it('should detect overlapping booking - exact same dates', async () => {
      const checkInDate = new Date('2025-08-01')
      const checkOutDate = new Date('2025-08-05')

      // Create first booking
      const booking1 = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate,
          checkOutDate,
          confirmationNumber: `CONF-${Date.now()}-1`,
          status: 'CONFIRMED',
          totalAmount: 600,
          currency: 'USD'
        }
      })

      expect(booking1).toBeTruthy()

      // Check for conflicting bookings (same dates)
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          hotelId: testHotel.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          OR: [
            {
              checkInDate: { lte: checkOutDate },
              checkOutDate: { gte: checkInDate }
            }
          ]
        }
      })

      // Should find the existing booking
      expect(conflictingBookings.length).toBeGreaterThan(0)
      expect(conflictingBookings[0].id).toBe(booking1.id)

      // Attempting to create second booking should be prevented by application logic
      // In a real scenario, this would throw an error or return validation failure
    })

    it('should detect overlapping booking - check-in during existing booking', async () => {
      // Create first booking: Aug 1-5
      const booking1 = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date('2025-08-01'),
          checkOutDate: new Date('2025-08-05'),
          confirmationNumber: `CONF-${Date.now()}-1`,
          status: 'CONFIRMED',
          totalAmount: 600,
          currency: 'USD'
        }
      })

      // Try to book with overlap: Aug 3-7 (check-in during existing booking)
      const newCheckIn = new Date('2025-08-03')
      const newCheckOut = new Date('2025-08-07')

      const conflictingBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          hotelId: testHotel.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          OR: [
            {
              checkInDate: { lte: newCheckOut },
              checkOutDate: { gte: newCheckIn }
            }
          ]
        }
      })

      // Should detect conflict
      expect(conflictingBookings.length).toBeGreaterThan(0)
      expect(conflictingBookings[0].id).toBe(booking1.id)
    })

    it('should detect overlapping booking - check-out during existing booking', async () => {
      // Create first booking: Aug 5-10
      const booking1 = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date('2025-08-05'),
          checkOutDate: new Date('2025-08-10'),
          confirmationNumber: `CONF-${Date.now()}-1`,
          status: 'CONFIRMED',
          totalAmount: 750,
          currency: 'USD'
        }
      })

      // Try to book with overlap: Aug 1-7 (check-out during existing booking)
      const newCheckIn = new Date('2025-08-01')
      const newCheckOut = new Date('2025-08-07')

      const conflictingBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          hotelId: testHotel.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          OR: [
            {
              checkInDate: { lte: newCheckOut },
              checkOutDate: { gte: newCheckIn }
            }
          ]
        }
      })

      // Should detect conflict
      expect(conflictingBookings.length).toBeGreaterThan(0)
      expect(conflictingBookings[0].id).toBe(booking1.id)
    })

    it('should allow booking when existing booking is CANCELLED', async () => {
      const checkInDate = new Date('2025-09-01')
      const checkOutDate = new Date('2025-09-05')

      // Create cancelled booking
      const cancelledBooking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate,
          checkOutDate,
          confirmationNumber: `CONF-${Date.now()}-cancelled`,
          status: 'CANCELLED', // Cancelled status
          totalAmount: 600,
          currency: 'USD',
          canceledAt: new Date(),
          cancelReason: 'Guest requested'
        }
      })

      // Check for active bookings (should exclude cancelled)
      const activeBookings = await prisma.booking.findMany({
        where: {
          roomId: room.id,
          hotelId: testHotel.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] }, // Excludes CANCELLED
          OR: [
            {
              checkInDate: { lte: checkOutDate },
              checkOutDate: { gte: checkInDate }
            }
          ]
        }
      })

      // Should not find any active bookings
      expect(activeBookings).toHaveLength(0)

      // Can create new booking
      const newBooking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate,
          checkOutDate,
          confirmationNumber: `CONF-${Date.now()}-new`,
          status: 'CONFIRMED',
          totalAmount: 600,
          currency: 'USD'
        }
      })

      expect(newBooking).toBeTruthy()
      expect(newBooking.status).toBe('CONFIRMED')
    })
  })

  describe('Check-in → Check-out Lifecycle', () => {
    it('should complete full booking lifecycle: PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT', async () => {
      // 1. Create PENDING booking
      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date('2025-10-01'),
          checkOutDate: new Date('2025-10-05'),
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'PENDING', // Initial status
          totalAmount: 600,
          currency: 'USD'
        }
      })

      expect(booking.status).toBe('PENDING')
      expect(booking.actualCheckIn).toBeNull()
      expect(booking.actualCheckOut).toBeNull()

      // 2. Confirm booking
      const confirmedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' }
      })

      expect(confirmedBooking.status).toBe('CONFIRMED')

      // 3. Check-in (set actual check-in time)
      const checkInTime = new Date()
      const checkedInBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          actualCheckIn: checkInTime
        }
      })

      expect(checkedInBooking.status).toBe('CHECKED_IN')
      expect(checkedInBooking.actualCheckIn).toBeTruthy()
      expect(checkedInBooking.actualCheckIn?.getTime()).toBe(checkInTime.getTime())

      // 4. Check-out (set actual check-out time)
      const checkOutTime = new Date()
      const checkedOutBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_OUT',
          actualCheckOut: checkOutTime
        }
      })

      expect(checkedOutBooking.status).toBe('CHECKED_OUT')
      expect(checkedOutBooking.actualCheckOut).toBeTruthy()
      expect(checkedOutBooking.actualCheckOut?.getTime()).toBe(checkOutTime.getTime())

      // Verify both check-in and check-out times are recorded
      expect(checkedOutBooking.actualCheckIn).toBeTruthy()
      expect(checkedOutBooking.actualCheckOut).toBeTruthy()
    })

    it('should update room status during check-in', async () => {
      // Create confirmed booking
      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date(),
          checkOutDate: new Date(Date.now() + 86400000 * 3), // +3 days
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CONFIRMED',
          totalAmount: 450,
          currency: 'USD'
        }
      })

      // Room should be AVAILABLE before check-in
      expect(room.status).toBe('AVAILABLE')

      // Check-in: Mark booking and update room
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          actualCheckIn: new Date()
        }
      })

      // Update room status to OCCUPIED
      await prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' }
      })

      const updatedRoom = await prisma.room.findUnique({
        where: { id: room.id }
      })

      expect(updatedRoom?.status).toBe('OCCUPIED')
    })

    it('should track payment during booking lifecycle', async () => {
      // Create booking with initial payment
      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date(),
          checkOutDate: new Date(Date.now() + 86400000 * 2), // +2 days
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CONFIRMED',
          totalAmount: 300,
          amountPaid: 100, // Partial payment
          currency: 'USD'
        }
      })

      expect(booking.amountPaid).toBe(100)
      expect(booking.totalAmount).toBe(300)

      // Additional payment at check-in
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: 200,
          status: 'CHECKED_IN',
          actualCheckIn: new Date()
        }
      })

      // Full payment at check-out
      const finalBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: 300, // Full payment
          status: 'CHECKED_OUT',
          actualCheckOut: new Date()
        }
      })

      expect(finalBooking.amountPaid).toBe(finalBooking.totalAmount)
      expect(finalBooking.status).toBe('CHECKED_OUT')
    })

    it('should handle early check-out', async () => {
      const originalCheckOut = new Date('2025-11-10')

      // Create checked-in booking
      const booking = await prisma.booking.create({
        data: {
          hotelId: testHotel.id,
          guestId: guest.id,
          roomId: room.id,
          checkInDate: new Date('2025-11-05'),
          checkOutDate: originalCheckOut, // 5 days booking
          confirmationNumber: `CONF-${Date.now()}`,
          status: 'CHECKED_IN',
          actualCheckIn: new Date('2025-11-05T14:00:00'),
          totalAmount: 750, // 5 nights * 150
          currency: 'USD'
        }
      })

      // Guest checks out early (day 3)
      const earlyCheckOut = new Date('2025-11-08') // 2 days early
      
      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_OUT',
          actualCheckOut: earlyCheckOut
        }
      })

      expect(updatedBooking.status).toBe('CHECKED_OUT')
      expect(updatedBooking.actualCheckOut?.getTime()).toBe(earlyCheckOut.getTime())
      
      // In real system, would recalculate charges or note early checkout
      expect(updatedBooking.checkOutDate.getTime()).not.toBe(earlyCheckOut.getTime())
    })
  })
})
