/**
 * Phase 8: Unit Tests for PMS Services
 * Tests for event emissions, data sync, and business logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { eventBus } from '@/lib/events/eventBus'
import * as pmsService from '@/lib/services/pmsService'
import * as bookingService from '@/lib/services/pms/bookingService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    guest: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('PMS Service - Event Emissions', () => {
  let eventSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    eventSpy = vi.fn()
  })

  afterEach(() => {
    eventBus.removeAllListeners()
  })

  describe('Room Sync Events', () => {
    it('should emit pms.room.synced event with hotelId', async () => {
      // Arrange
      eventBus.on('pms.room.synced', eventSpy)
      
      const mockRoom = {
        id: 'room-123',
        hotelId: 'hotel-abc',
        roomNumber: '101',
        roomTypeId: 'type-1',
        status: 'AVAILABLE',
        isActive: true,
        isOutOfService: false,
        notes: null,
        lastCleaned: null,
        floor: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.room.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.room.create).mockResolvedValue(mockRoom)

      // Act
      await pmsService.syncRooms('hotel-abc', 'test-provider', [
        {
          externalId: 'ext-101',
          roomNumber: '101',
          roomTypeExternalId: 'type-ext-1',
          status: 'available',
          floor: 1,
        },
      ])

      // Assert
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: 'hotel-abc',
          roomId: expect.any(String),
          provider: 'test-provider',
          externalId: 'ext-101',
          syncedAt: expect.any(Date),
        })
      )
    })

    it('should not emit event without hotelId', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act
      eventBus.emit('pms.room.synced' as any, { roomId: 'room-123' } as any)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing hotelId'),
        expect.anything()
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Guest Sync Events', () => {
    it('should emit pms.guest.synced event with proper payload', async () => {
      // Arrange
      eventBus.on('pms.guest.synced', eventSpy)

      const mockGuest = {
        id: 'guest-123',
        hotelId: 'hotel-abc',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: null,
        city: null,
        country: null,
        postalCode: null,
        idType: null,
        idNumber: null,
        preferences: null,
        notes: null,
        vipStatus: false,
        totalStays: 0,
        totalSpent: 0,
        lastStayDate: null,
        language: 'en',
        emailOptIn: true,
        smsOptIn: false,
        loyaltyPoints: 0,
        loyaltyTier: 'NONE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.guest.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.guest.create).mockResolvedValue(mockGuest)

      // Act
      await pmsService.syncGuests('hotel-abc', 'test-provider', [
        {
          externalId: 'ext-guest-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      ])

      // Assert
      expect(eventSpy).toHaveBeenCalled()
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: 'hotel-abc',
          guestId: expect.any(String),
        })
      )
    })
  })

  describe('Booking Events', () => {
    it('should emit booking.created event when creating booking', async () => {
      // Arrange
      eventBus.on('booking.created', eventSpy)

      const mockBooking = {
        id: 'booking-123',
        hotelId: 'hotel-abc',
        guestId: 'guest-123',
        roomId: 'room-123',
        checkInDate: new Date('2025-01-01'),
        checkOutDate: new Date('2025-01-05'),
        confirmationNumber: 'CONF-12345',
        status: 'CONFIRMED',
        source: 'DIRECT',
        externalId: null,
        totalAmount: 500,
        amountPaid: 0,
        currency: 'USD',
        adults: 2,
        children: 0,
        specialRequests: null,
        notes: null,
        actualCheckIn: null,
        actualCheckOut: null,
        canceledAt: null,
        cancelReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.booking.create).mockResolvedValue(mockBooking as any)

      // Act
      await bookingService.createBooking({
        hotelId: 'hotel-abc',
        guestId: 'guest-123',
        roomId: 'room-123',
        checkInDate: new Date('2025-01-01'),
        checkOutDate: new Date('2025-01-05'),
        totalAmount: 500,
        adults: 2,
      })

      // Assert
      expect(eventSpy).toHaveBeenCalledWith({
        bookingId: 'booking-123',
        hotelId: 'hotel-abc',
        confirmationNumber: 'CONF-12345',
      })
    })

    it('should emit booking.cancelled event with reason', async () => {
      // Arrange
      eventBus.on('booking.cancelled', eventSpy)

      const mockBooking = {
        id: 'booking-123',
        hotelId: 'hotel-abc',
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: 'Guest request',
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.booking.update).mockResolvedValue(mockBooking as any)

      // Act
      await bookingService.cancelBooking('booking-123', 'hotel-abc', 'Guest request')

      // Assert
      expect(eventSpy).toHaveBeenCalledWith({
        bookingId: 'booking-123',
        hotelId: 'hotel-abc',
        reason: 'Guest request',
      })
    })

    it('should emit booking.noShow event', async () => {
      // Arrange
      eventBus.on('booking.noShow', eventSpy)

      const mockBooking = {
        id: 'booking-123',
        hotelId: 'hotel-abc',
        guestId: 'guest-123',
        status: 'NO_SHOW',
      }

      const { prisma } = await import('@/lib/prisma')
      vi.mocked(prisma.booking.update).mockResolvedValue(mockBooking as any)

      // Act
      await bookingService.markNoShow('booking-123', 'hotel-abc', 50)

      // Assert
      expect(eventSpy).toHaveBeenCalledWith({
        bookingId: 'booking-123',
        hotelId: 'hotel-abc',
      })
    })
  })
})

describe('PMS Service - Multi-tenant Isolation', () => {
  it('should filter room queries by hotelId', async () => {
    const { prisma } = await import('@/lib/prisma')
    const findFirstSpy = vi.mocked(prisma.room.findFirst)

    await pmsService.syncRooms('hotel-abc', 'provider', [
      { externalId: 'ext-1', roomNumber: '101', roomTypeExternalId: 'type-1', status: 'available' },
    ])

    expect(findFirstSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hotelId: 'hotel-abc',
        }),
      })
    )
  })

  it('should filter guest queries by hotelId', async () => {
    const { prisma } = await import('@/lib/prisma')
    const findFirstSpy = vi.mocked(prisma.guest.findFirst)

    await pmsService.syncGuests('hotel-abc', 'provider', [
      { externalId: 'ext-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ])

    expect(findFirstSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hotelId: 'hotel-abc',
        }),
      })
    )
  })
})

describe('EventBus - Error Handling', () => {
  it('should handle listener errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    eventBus.on('pms.room.synced', () => {
      throw new Error('Listener error')
    })

    eventBus.emit('pms.room.synced', {
      hotelId: 'hotel-123',
      roomId: 'room-123',
      provider: 'test',
      externalId: 'ext-1',
      syncedAt: new Date(),
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should validate hotelId presence in all events', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // @ts-expect-error - Testing runtime validation
    eventBus.emit('booking.created', { bookingId: 'booking-123' })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing hotelId'),
      expect.anything()
    )

    consoleSpy.mockRestore()
  })
})
