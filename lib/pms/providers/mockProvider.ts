import {
  NormalizedBooking,
  NormalizedRoom,
  NormalizedGuest,
  PMSProviderAdapter,
  ProviderHotelContext,
  ProviderSyncOptions,
} from '@/lib/pms/types'
import { PMSIntegrationError } from '@/lib/pms/errors'

// Stub types for non-existent Booking model
enum BookingSource {
  DIRECT = 'DIRECT',
  PMS = 'PMS',
  CHANNEL_MANAGER = 'CHANNEL_MANAGER',
  OTA = 'OTA',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN'
}

enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED'
}

const STATUS_MAP: Record<string, BookingStatus> = {
  reserved: BookingStatus.CONFIRMED,
  confirmed: BookingStatus.CONFIRMED,
  tentative: BookingStatus.PENDING,
  checked_in: BookingStatus.CHECKED_IN,
  checked_out: BookingStatus.CHECKED_OUT,
  cancelled: BookingStatus.CANCELLED,
}

type MockBookingPayload = {
  id: string
  status: keyof typeof STATUS_MAP
  guest: {
    name: string
    email?: string | null
    phone?: string | null
  }
  stay: {
    checkIn: string
    checkOut: string
    room?: string | null
  }
  totals?: {
    amount?: number | null
    currency?: string | null
  }
  notes?: string | null
  updatedAt?: string | null
  channel?: 'DIRECT' | 'OTA' | 'PHONE' | 'WALK_IN'
}

function normalizeStatus(status: string): BookingStatus {
  const normalized = STATUS_MAP[status.toLowerCase()]
  if (!normalized) {
    return BookingStatus.PENDING
  }
  return normalized
}

function toNormalizedBooking(payload: MockBookingPayload): NormalizedBooking {
  const checkIn = new Date(payload.stay.checkIn)
  const checkOut = new Date(payload.stay.checkOut)
  if (Number.isNaN(checkIn.valueOf()) || Number.isNaN(checkOut.valueOf())) {
    throw new PMSIntegrationError('Invalid stay dates in PMS payload', {
      code: 'INVALID_DATES',
      statusCode: 422,
    })
  }

  const amount = payload.totals?.amount ?? null
  const cents = amount !== null && amount !== undefined ? Math.round(amount * 100) : null

  return {
    externalId: payload.id,
    status: normalizeStatus(payload.status),
    source: normalizeChannel(payload.channel),
    guestName: payload.guest.name,
    guestEmail: payload.guest.email ?? null,
    guestPhone: payload.guest.phone ?? null,
    roomNumber: payload.stay.room ?? null,
    checkIn,
    checkOut,
    totalAmountCents: cents,
    currency: payload.totals?.currency ?? 'USD',
    notes: payload.notes ?? null,
    metadata: {
      rawStatus: payload.status,
      channel: payload.channel ?? null,
    },
    externalUpdatedAt: payload.updatedAt ? new Date(payload.updatedAt) : null,
  }
}

function normalizeChannel(channel?: MockBookingPayload['channel']): BookingSource {
  if (!channel) {
    return BookingSource.DIRECT
  }
  if (channel === 'OTA') {
    return BookingSource.OTA
  }
  if (channel === 'PHONE') {
    return BookingSource.PHONE
  }
  if (channel === 'WALK_IN') {
    return BookingSource.WALK_IN
  }
  return BookingSource.DIRECT
}

class MockProviderAdapter implements PMSProviderAdapter {
  readonly key = 'mock'

  normalizeBooking(payload: unknown): NormalizedBooking {
    if (!payload || typeof payload !== 'object') {
      throw new PMSIntegrationError('Missing PMS booking payload', {
        statusCode: 400,
        code: 'INVALID_PAYLOAD',
      })
    }

    return toNormalizedBooking(payload as MockBookingPayload)
  }

  async fetchBookings(_hotel: ProviderHotelContext, options?: ProviderSyncOptions): Promise<NormalizedBooking[]> {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)

    const sample: MockBookingPayload[] = [
      {
        id: 'mock-1',
        status: 'confirmed',
        guest: { name: 'Ava Rivera', email: 'ava@example.com', phone: '+1-555-1010' },
        stay: {
          checkIn: now.toISOString(),
          checkOut: tomorrow.toISOString(),
          room: '1205',
        },
        totals: { amount: 250.35, currency: 'USD' },
        notes: 'Late arrival',
        updatedAt: now.toISOString(),
        channel: 'DIRECT',
      },
      {
        id: 'mock-2',
        status: 'checked_in',
        guest: { name: 'Eugene Walters' },
        stay: {
          checkIn: now.toISOString(),
          checkOut: tomorrow.toISOString(),
        },
        totals: { amount: 180, currency: 'USD' },
        updatedAt: now.toISOString(),
        channel: 'OTA',
      },
    ]

    const filtered = options?.since
      ? sample.filter((entry) => {
          if (!entry.updatedAt) {
            return true
          }
          const updated = new Date(entry.updatedAt)
          return updated >= options.since!
        })
      : sample

    return filtered.map(toNormalizedBooking)
  }

  async fetchRooms(_hotel: ProviderHotelContext, options?: ProviderSyncOptions): Promise<NormalizedRoom[]> {
    const sampleRooms: NormalizedRoom[] = [
      {
        externalId: 'room-101',
        roomNumber: '101',
        roomType: 'Single',
        floor: 1,
        status: 'AVAILABLE',
        cleaningStatus: 'CLEAN',
        occupancy: 0,
        maxOccupancy: 1,
        rateCents: 15000,
        currency: 'USD',
        amenities: { wifi: true, tv: true, minibar: false },
        metadata: { building: 'Main' },
        externalUpdatedAt: new Date(),
      },
      {
        externalId: 'room-205',
        roomNumber: '205',
        roomType: 'Double',
        floor: 2,
        status: 'OCCUPIED',
        cleaningStatus: 'DIRTY',
        occupancy: 2,
        maxOccupancy: 2,
        rateCents: 25000,
        currency: 'USD',
        amenities: { wifi: true, tv: true, minibar: true },
        metadata: { building: 'Main' },
        externalUpdatedAt: new Date(),
      },
      {
        externalId: 'room-401',
        roomNumber: '401',
        roomType: 'Suite',
        floor: 4,
        status: 'RESERVED',
        cleaningStatus: 'CLEAN',
        occupancy: 0,
        maxOccupancy: 4,
        rateCents: 50000,
        currency: 'USD',
        amenities: { wifi: true, tv: true, minibar: true, balcony: true },
        metadata: { building: 'Main', premium: true },
        externalUpdatedAt: new Date(),
      },
    ]

    const limit = options?.limit ?? sampleRooms.length
    return sampleRooms.slice(0, limit)
  }

  async fetchGuests(_hotel: ProviderHotelContext, options?: ProviderSyncOptions): Promise<NormalizedGuest[]> {
    const sampleGuests: NormalizedGuest[] = [
      {
        externalId: 'guest-1001',
        firstName: 'Ava',
        lastName: 'Rivera',
        email: 'ava@example.com',
        phone: '+1-555-1010',
        country: 'US',
        dateOfBirth: new Date('1985-03-15'),
        passportNumber: null,
        loyaltyTier: 'Gold',
        totalStays: 12,
        totalSpent: 350000,
        preferences: { roomType: 'quiet', pillow: 'soft', floor: 'high' },
        metadata: { vip: true },
        externalUpdatedAt: new Date(),
      },
      {
        externalId: 'guest-1002',
        firstName: 'Eugene',
        lastName: 'Walters',
        email: 'eugene@example.com',
        phone: '+1-555-2020',
        country: 'US',
        dateOfBirth: new Date('1978-07-22'),
        passportNumber: null,
        loyaltyTier: 'Silver',
        totalStays: 5,
        totalSpent: 120000,
        preferences: { roomType: 'standard', temperature: 'cool' },
        metadata: {},
        externalUpdatedAt: new Date(),
      },
      {
        externalId: 'guest-1003',
        firstName: 'Sofia',
        lastName: 'Martinez',
        email: 'sofia@example.com',
        phone: '+34-600-123456',
        country: 'ES',
        dateOfBirth: new Date('1992-11-08'),
        passportNumber: 'ES123456789',
        loyaltyTier: 'Bronze',
        totalStays: 2,
        totalSpent: 45000,
        preferences: null,
        metadata: {},
        externalUpdatedAt: new Date(),
      },
    ]

    const limit = options?.limit ?? sampleGuests.length
    return sampleGuests.slice(0, limit)
  }

  normalizeRoom(payload: unknown): NormalizedRoom {
    if (!payload || typeof payload !== 'object') {
      throw new PMSIntegrationError('Missing PMS room payload', {
        statusCode: 400,
        code: 'INVALID_PAYLOAD',
      })
    }

    const room = payload as any
    return {
      externalId: room.id || room.externalId,
      roomNumber: room.roomNumber,
      roomType: room.roomType || null,
      floor: room.floor || null,
      status: room.status || 'AVAILABLE',
      cleaningStatus: room.cleaningStatus || 'CLEAN',
      occupancy: room.occupancy || null,
      maxOccupancy: room.maxOccupancy || null,
      rateCents: room.rateCents || null,
      currency: room.currency || 'USD',
      amenities: room.amenities || null,
      metadata: room.metadata || null,
      externalUpdatedAt: room.updatedAt ? new Date(room.updatedAt) : null,
    }
  }

  normalizeGuest(payload: unknown): NormalizedGuest {
    if (!payload || typeof payload !== 'object') {
      throw new PMSIntegrationError('Missing PMS guest payload', {
        statusCode: 400,
        code: 'INVALID_PAYLOAD',
      })
    }

    const guest = payload as any
    return {
      externalId: guest.id || guest.externalId,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || null,
      phone: guest.phone || null,
      country: guest.country || null,
      dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth) : null,
      passportNumber: guest.passportNumber || null,
      loyaltyTier: guest.loyaltyTier || null,
      totalStays: guest.totalStays || null,
      totalSpent: guest.totalSpent || null,
      preferences: guest.preferences || null,
      metadata: guest.metadata || null,
      externalUpdatedAt: guest.updatedAt ? new Date(guest.updatedAt) : null,
    }
  }
}

export const mockProviderAdapter = new MockProviderAdapter()
