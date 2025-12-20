import crypto from 'node:crypto'
import { BookingStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import { getProviderAdapter } from '@/lib/pms/registry'
import { buildBookingUpsertPayload } from '@/lib/pms/mappers'
import {
  BookingSyncSummary,
  NormalizedBooking,
  NormalizedRoom,
  NormalizedGuest,
  RoomSyncSummary,
  GuestSyncSummary,
  PMSWebhookPayload,
  ProviderSyncOptions,
} from '@/lib/pms/types'
import { PMSIntegrationError, assert } from '@/lib/pms/errors'

export type BookingListFilter = {
  hotelId: string
  status?: BookingStatus[]
  startDate?: Date
  endDate?: Date
  provider?: string
}

export async function ingestBookingWebhook(
  hotelId: string,
  providerKey: string,
  payload: PMSWebhookPayload
) {
  const adapter = getProviderAdapter(providerKey)
  assert(payload?.booking, 'PMS booking payload is required', {
    statusCode: 400,
    code: 'MISSING_BOOKING',
  })

  const normalized = adapter.normalizeBooking(payload.booking)
  return upsertNormalizedBooking(hotelId, adapter.key, normalized, payload.metadata?.correlationId)
}

export async function syncProviderBookings(
  hotelId: string,
  providerKey: string,
  options?: ProviderSyncOptions
): Promise<BookingSyncSummary> {
  const adapter = getProviderAdapter(providerKey)
  const syncId = crypto.randomUUID()
  const startedAt = new Date()

  try {
    const bookings = await adapter.fetchBookings({ hotelId }, options)

    const summary: BookingSyncSummary = {
      processed: 0,
      failed: 0,
      bookings: [],
      errors: [],
    }

    for (const booking of bookings) {
      try {
        const result = await upsertNormalizedBooking(hotelId, adapter.key, booking)
        summary.processed += 1
        summary.bookings.push(result.normalized)
      } catch (error) {
        summary.failed += 1
        summary.errors.push({
          externalId: booking.externalId,
          message: (error as Error).message,
        })
      }
    }

    const completedAt = new Date()
    eventBus.emit('pms.sync.completed', {
      hotelId,
      provider: adapter.key,
      syncId,
      processed: summary.processed,
      failed: summary.failed,
      startedAt,
      completedAt,
    })

    return summary
  } catch (error) {
    eventBus.emit('pms.sync.failed', {
      hotelId,
      provider: adapter.key,
      syncId,
      error: (error as Error).message,
      occurredAt: new Date(),
    })

    throw new PMSIntegrationError('PMS sync failed', {
      statusCode: 502,
      code: 'SYNC_FAILED',
      cause: error,
    })
  }
}

export async function listBookings(filter: BookingListFilter) {
  const where: Prisma.BookingWhereInput = {
    hotelId: filter.hotelId,
  }

  if (filter.status?.length) {
    where.status = { in: filter.status }
  }

  if (filter.startDate || filter.endDate) {
    where.checkInDate = {}
    if (filter.startDate) {
      where.checkInDate.gte = filter.startDate
    }
    if (filter.endDate) {
      where.checkInDate.lte = filter.endDate
    }
  }

  // TODO Phase 7+: Add provider filter when external PMS integration is implemented
  // if (filter.provider) {
  //   where.provider = filter.provider
  // }

  return prisma.booking.findMany({
    where,
    orderBy: { checkInDate: 'asc' },
  })
}

type UpsertResult = {
  booking: Awaited<ReturnType<typeof prisma.booking.upsert>>
  normalized: NormalizedBooking
}

async function upsertNormalizedBooking(
  hotelId: string,
  providerKey: string,
  normalized: NormalizedBooking,
  correlationId?: string
): Promise<UpsertResult> {
  const now = new Date()
  const upsertPayload = buildBookingUpsertPayload(hotelId, providerKey, normalized, now)

  // Try to find existing booking by externalId first
  const existingBooking = await prisma.booking.findFirst({
    where: {
      hotelId,
      externalId: normalized.externalId,
    },
  })

  const booking = existingBooking
    ? await prisma.booking.update({
        where: { id: existingBooking.id },
        data: upsertPayload.update,
      })
    : await prisma.booking.create({
        data: upsertPayload.create,
      })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('pms.booking.synced', {
      bookingId: booking.id,
      hotelId,
      provider: providerKey,
      externalId: normalized.externalId,
      syncedAt: now,
    })
  } catch (error) {
    console.error('[PMS] Error emitting pms.booking.synced:', error)
  }

  console.info(
    JSON.stringify({
      event: 'pms.booking.synced',
      bookingId: booking.id,
      hotelId,
      provider: providerKey,
      externalId: normalized.externalId,
      correlationId: correlationId ?? null,
    })
  )

  return { booking, normalized }
}

export async function syncProviderRooms(
  hotelId: string,
  providerKey: string,
  options?: ProviderSyncOptions
): Promise<RoomSyncSummary> {
  const adapter = getProviderAdapter(providerKey)

  if (!adapter.fetchRooms) {
    throw new PMSIntegrationError('Provider does not support room sync', {
      statusCode: 501,
      code: 'ROOMS_NOT_SUPPORTED',
    })
  }

  const syncId = crypto.randomUUID()
  const startedAt = new Date()

  try {
    const rooms = await adapter.fetchRooms({ hotelId }, options)

    const summary: RoomSyncSummary = {
      processed: 0,
      failed: 0,
      rooms: [],
      errors: [],
    }

    for (const room of rooms) {
      try {
        const result = await upsertNormalizedRoom(hotelId, adapter.key, room)
        summary.processed += 1
        summary.rooms.push(room)
      } catch (error) {
        summary.failed += 1
        summary.errors.push({
          externalId: room.externalId,
          message: (error as Error).message,
        })
      }
    }

    const completedAt = new Date()
    eventBus.emit('pms.sync.completed', {
      hotelId,
      provider: adapter.key,
      syncId,
      processed: summary.processed,
      failed: summary.failed,
      startedAt,
      completedAt,
    })

    return summary
  } catch (error) {
    eventBus.emit('pms.sync.failed', {
      hotelId,
      provider: adapter.key,
      syncId,
      error: (error as Error).message,
      occurredAt: new Date(),
    })

    throw new PMSIntegrationError('PMS room sync failed', {
      statusCode: 502,
      code: 'ROOM_SYNC_FAILED',
      cause: error,
    })
  }
}

export async function syncProviderGuests(
  hotelId: string,
  providerKey: string,
  options?: ProviderSyncOptions
): Promise<GuestSyncSummary> {
  const adapter = getProviderAdapter(providerKey)

  if (!adapter.fetchGuests) {
    throw new PMSIntegrationError('Provider does not support guest sync', {
      statusCode: 501,
      code: 'GUESTS_NOT_SUPPORTED',
    })
  }

  const syncId = crypto.randomUUID()
  const startedAt = new Date()

  try {
    const guests = await adapter.fetchGuests({ hotelId }, options)

    const summary: GuestSyncSummary = {
      processed: 0,
      failed: 0,
      guests: [],
      errors: [],
    }

    for (const guest of guests) {
      try {
        const result = await upsertNormalizedGuest(hotelId, adapter.key, guest)
        summary.processed += 1
        summary.guests.push(guest)
      } catch (error) {
        summary.failed += 1
        summary.errors.push({
          externalId: guest.externalId,
          message: (error as Error).message,
        })
      }
    }

    const completedAt = new Date()
    eventBus.emit('pms.sync.completed', {
      hotelId,
      provider: adapter.key,
      syncId,
      processed: summary.processed,
      failed: summary.failed,
      startedAt,
      completedAt,
    })

    return summary
  } catch (error) {
    eventBus.emit('pms.sync.failed', {
      hotelId,
      provider: adapter.key,
      syncId,
      error: (error as Error).message,
      occurredAt: new Date(),
    })

    throw new PMSIntegrationError('PMS guest sync failed', {
      statusCode: 502,
      code: 'GUEST_SYNC_FAILED',
      cause: error,
    })
  }
}

// Map PMS status to Room model status
function mapRoomStatus(pmsStatus: string): string {
  const statusMap: Record<string, string> = {
    'AVAILABLE': 'AVAILABLE',
    'OCCUPIED': 'OCCUPIED',
    'DIRTY': 'DIRTY',
    'CLEANING': 'CLEANING',
    'INSPECTING': 'INSPECTING',
    'MAINTENANCE': 'MAINTENANCE',
    'OUT_OF_SERVICE': 'OUT_OF_ORDER',
    'OUT_OF_ORDER': 'OUT_OF_ORDER',
    'BLOCKED': 'BLOCKED',
    'RESERVED': 'BLOCKED', // Map RESERVED to BLOCKED
  }
  return statusMap[pmsStatus] || 'AVAILABLE'
}

async function upsertNormalizedRoom(
  hotelId: string,
  providerKey: string,
  normalized: NormalizedRoom
) {
  const now = new Date()

  // Find existing room by external ID
  const existingRoom = await prisma.room.findFirst({
    where: {
      hotelId,
      // Note: Room model doesn't have externalId field, using roomNumber as unique identifier
      roomNumber: normalized.roomNumber,
    },
  })

  const mappedStatus = mapRoomStatus(normalized.status) as any

  const room = existingRoom
    ? await prisma.room.update({
        where: { id: existingRoom.id },
        data: {
          floor: normalized.floor,
          status: mappedStatus,
          updatedAt: now,
        },
      })
    : await prisma.room.create({
        data: {
          hotelId,
          roomNumber: normalized.roomNumber,
          floor: normalized.floor,
          status: mappedStatus,
          roomTypeId: '', // TODO: Map from normalized.roomType to actual RoomType ID
          createdAt: now,
          updatedAt: now,
        },
      })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('pms.room.synced', {
      roomId: room.id,
      hotelId,
      provider: providerKey,
      externalId: normalized.externalId,
      syncedAt: now,
    })
  } catch (error) {
    console.error('[PMS] Error emitting pms.room.synced:', error)
  }

  return room
}

async function upsertNormalizedGuest(
  hotelId: string,
  providerKey: string,
  normalized: NormalizedGuest
) {
  const now = new Date()

  // Find existing guest by email
  const existingGuest = await prisma.guest.findFirst({
    where: {
      hotelId,
      email: normalized.email,
    },
  })

  const guest = existingGuest
    ? await prisma.guest.update({
        where: { id: existingGuest.id },
        data: {
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          phone: normalized.phone,
          country: normalized.country,
          loyaltyTier: normalized.loyaltyTier || 'NONE',
          totalStays: normalized.totalStays || 0,
          totalSpent: normalized.totalSpent || 0,
          updatedAt: now,
        },
      })
    : await prisma.guest.create({
        data: {
          hotelId,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          email: normalized.email,
          phone: normalized.phone,
          country: normalized.country,
          loyaltyTier: normalized.loyaltyTier || 'NONE',
          totalStays: normalized.totalStays || 0,
          totalSpent: normalized.totalSpent || 0,
          createdAt: now,
          updatedAt: now,
        },
      })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('pms.guest.synced', {
      guestId: guest.id,
      hotelId,
      provider: providerKey,
      externalId: normalized.externalId,
      syncedAt: now,
    })
  } catch (error) {
    console.error('[PMS] Error emitting pms.guest.synced:', error)
  }

  return guest
}
