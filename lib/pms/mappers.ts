import { NormalizedBooking } from '@/lib/pms/types'

// Stub types for non-existent Booking model
type BookingSyncStatus = 'PENDING' | 'SYNCED' | 'FAILED'
type UpsertPayload = {
  create: any
  update: any
}

export function buildBookingUpsertPayload(
  hotelId: string,
  providerKey: string,
  normalized: NormalizedBooking,
  now: Date
): UpsertPayload {
  const metadata: any = normalized.metadata ?? null
  const totalAmount = normalized.totalAmountCents ?? null

  const base = {
    status: normalized.status,
    source: normalized.source,
    guestName: normalized.guestName,
    guestEmail: normalized.guestEmail ?? null,
    guestPhone: normalized.guestPhone ?? null,
    roomNumber: normalized.roomNumber ?? null,
    checkIn: normalized.checkIn,
    checkOut: normalized.checkOut,
    totalAmount,
    currency: normalized.currency ?? undefined,
    notes: normalized.notes ?? null,
    metadata,
    provider: providerKey,
    externalId: normalized.externalId,
    externalUpdatedAt: normalized.externalUpdatedAt ?? null,
    lastSyncedAt: now,
    syncStatus: 'SYNCED' as BookingSyncStatus,
    syncError: null,
  }

  const create: any = {
    hotelId,
    ...base,
  }

  const update: any = {
    ...base,
  }

  return { create, update }
}
