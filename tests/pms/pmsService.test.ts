import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingSource, BookingStatus } from '@prisma/client'

vi.mock('@/lib/prisma', () => {
  const bookingUpsert = vi.fn()
  return {
    prisma: {
      booking: {
        upsert: bookingUpsert,
      },
    },
  }
})
const getProviderAdapterMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/pms/registry', () => ({
  getProviderAdapter: getProviderAdapterMock,
}))

import { eventBus } from '@/lib/events/eventBus'
import { buildBookingUpsertPayload } from '@/lib/pms/mappers'
import { ingestBookingWebhook, syncProviderBookings } from '@/lib/services/pmsService'
import { PMSIntegrationError } from '@/lib/pms/errors'
import { prisma } from '@/lib/prisma'
import { getProviderAdapter } from '@/lib/pms/registry'

const upsertMock = vi.mocked(prisma.booking.upsert)
const registryMock = vi.mocked(getProviderAdapter)

describe('pmsService', () => {
  const normalizeBooking = vi.fn()
  const fetchBookings = vi.fn()
  const adapter = {
    key: 'mock',
    normalizeBooking,
    fetchBookings,
  }

  const normalized = {
    externalId: 'ext-1',
    status: BookingStatus.CONFIRMED,
    source: BookingSource.DIRECT,
    guestName: 'Test Guest',
    guestEmail: 'guest@example.com',
    guestPhone: null,
    roomNumber: '501',
    checkIn: new Date('2024-04-01T15:00:00.000Z'),
    checkOut: new Date('2024-04-05T11:00:00.000Z'),
    totalAmountCents: 45000,
    currency: 'USD',
    notes: null,
    metadata: { vip: true },
    externalUpdatedAt: new Date('2024-03-30T10:00:00.000Z'),
  }

  beforeEach(() => {
    upsertMock.mockReset()
    normalizeBooking.mockReset()
    fetchBookings.mockReset()
    registryMock.mockReturnValue(adapter)
  })

  it('buildBookingUpsertPayload maps normalized booking fields', () => {
    const now = new Date('2024-03-31T12:00:00.000Z')
    const payload = buildBookingUpsertPayload('hotel-1', 'mock', normalized, now)

    expect(payload.create).toMatchObject({
      hotelId: 'hotel-1',
      provider: 'mock',
      externalId: 'ext-1',
      status: BookingStatus.CONFIRMED,
      source: BookingSource.DIRECT,
      totalAmount: 45000,
      lastSyncedAt: now,
      syncError: null,
    })

    expect(payload.update).toMatchObject({
      provider: 'mock',
      externalId: 'ext-1',
      lastSyncedAt: now,
      metadata: { vip: true },
    })
  })

  it('ingestBookingWebhook normalizes payload and upserts booking', async () => {
    normalizeBooking.mockReturnValue(normalized)
    upsertMock.mockResolvedValue({ id: 'booking-1' })
    const emitSpy = vi.spyOn(eventBus, 'emit')

    const result = await ingestBookingWebhook('hotel-1', 'mock', {
      booking: { id: 'ext-1' },
      metadata: { correlationId: 'corr-1' },
    })

    expect(normalizeBooking).toHaveBeenCalledWith({ id: 'ext-1' })
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith({
      where: {
        hotelId_provider_externalId: {
          hotelId: 'hotel-1',
          provider: 'mock',
          externalId: 'ext-1',
        },
      },
      create: expect.objectContaining({ hotelId: 'hotel-1', externalId: 'ext-1' }),
      update: expect.objectContaining({ provider: 'mock' }),
    })
    expect(emitSpy).toHaveBeenCalledWith(
      'pms.booking.synced',
      expect.objectContaining({ bookingId: 'booking-1', provider: 'mock', externalId: 'ext-1' })
    )
    expect(result.booking?.id).toBe('booking-1')

    emitSpy.mockRestore()
  })

  it('syncProviderBookings processes each booking and emits completion event', async () => {
    fetchBookings.mockResolvedValue([normalized, normalized])
    upsertMock.mockResolvedValue({ id: 'booking-1' })
    const emitSpy = vi.spyOn(eventBus, 'emit')

    const summary = await syncProviderBookings('hotel-1', 'mock')

    expect(fetchBookings).toHaveBeenCalledWith({ hotelId: 'hotel-1' }, undefined)
    expect(upsertMock).toHaveBeenCalledTimes(2)
    expect(summary.processed).toBe(2)
    expect(summary.failed).toBe(0)
    expect(summary.bookings).toHaveLength(2)
    expect(emitSpy).toHaveBeenCalledWith('pms.sync.completed', expect.any(Object))

    emitSpy.mockRestore()
  })

  it('syncProviderBookings raises PMSIntegrationError on adapter failure', async () => {
    fetchBookings.mockRejectedValue(new Error('Provider offline'))

    await expect(syncProviderBookings('hotel-1', 'mock')).rejects.toBeInstanceOf(PMSIntegrationError)
  })
})
