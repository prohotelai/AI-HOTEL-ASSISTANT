// Stub types for non-existent Booking model
export enum BookingSource {
  DIRECT = 'DIRECT',
  PMS = 'PMS',
  CHANNEL_MANAGER = 'CHANNEL_MANAGER',
  OTA = 'OTA',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED'
}

export type ProviderHotelContext = {
  hotelId: string
  externalHotelId?: string
  credentials?: Record<string, string>
}

export type ProviderSyncOptions = {
  since?: Date
  limit?: number
}

export type NormalizedBooking = {
  externalId: string
  status: BookingStatus
  source: BookingSource
  guestName: string
  guestEmail?: string | null
  guestPhone?: string | null
  roomNumber?: string | null
  checkIn: Date
  checkOut: Date
  totalAmountCents?: number | null
  currency?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  externalUpdatedAt?: Date | null
}

export type BookingSyncError = {
  externalId: string
  message: string
}

export type BookingSyncSummary = {
  processed: number
  failed: number
  bookings: NormalizedBooking[]
  errors: BookingSyncError[]
}

export type NormalizedRoom = {
  externalId: string
  roomNumber: string
  roomType?: string | null
  floor?: number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
  cleaningStatus?: 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'PICKUP' | null
  occupancy?: number | null
  maxOccupancy?: number | null
  rateCents?: number | null
  currency?: string | null
  amenities?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  externalUpdatedAt?: Date | null
}

export type RoomSyncError = {
  externalId: string
  message: string
}

export type RoomSyncSummary = {
  processed: number
  failed: number
  rooms: NormalizedRoom[]
  errors: RoomSyncError[]
}

export type NormalizedGuest = {
  externalId: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  country?: string | null
  dateOfBirth?: Date | null
  passportNumber?: string | null
  loyaltyTier?: string | null
  totalStays?: number | null
  totalSpent?: number | null
  preferences?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  externalUpdatedAt?: Date | null
}

export type GuestSyncError = {
  externalId: string
  message: string
}

export type GuestSyncSummary = {
  processed: number
  failed: number
  guests: NormalizedGuest[]
  errors: GuestSyncError[]
}

export interface PMSProviderAdapter {
  key: string
  normalizeBooking(payload: unknown): NormalizedBooking
  fetchBookings(hotel: ProviderHotelContext, options?: ProviderSyncOptions): Promise<NormalizedBooking[]>
  normalizeRoom?(payload: unknown): NormalizedRoom
  fetchRooms?(hotel: ProviderHotelContext, options?: ProviderSyncOptions): Promise<NormalizedRoom[]>
  normalizeGuest?(payload: unknown): NormalizedGuest
  fetchGuests?(hotel: ProviderHotelContext, options?: ProviderSyncOptions): Promise<NormalizedGuest[]>
}

export type PMSWebhookPayload = {
  booking: unknown
  metadata?: {
    correlationId?: string
  }
}
// Module 11: QR Guest Login System - New Types

/**
 * Guest Context for Module 11 QR Login System
 * Provides unified guest context for Widget SDK integration
 */
export type GuestContext = {
  guestId: string
  hotelId: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  language: string
  vipStatus: string
  loyaltyTier?: string | null
  loyaltyPoints: number
  preferences?: Record<string, unknown> | null
  permissions: {
    canAccessServices: boolean
    canRequestService: boolean
    canViewBill: boolean
    canOrderFood: boolean
    canRequestHousekeeping: boolean
  }
}

/**
 * Stay Context for current guest check-in
 * Provides details about the active stay
 */
export type StayContext = {
  stayId: string
  guestId: string
  hotelId: string
  roomId: string
  roomNumber: string
  checkInTime: Date
  checkOutTime: Date
  numberOfNights: number
  isActive: boolean
  status: 'CHECKED_IN' | 'CHECKED_OUT'
}

// Old QR token types removed - replaced by Universal QR Login System (Module 11)

/**
 * Module 11: Universal QR Login System Types
 */

export type UniversalQRTokenPayload = {
  hotelId: string
  token: string
  expiresAt: Date
  isActive: boolean
  createdBy: string
}

export type UserTemporarySessionPayload = {
  id: string
  qrTokenId: string
  hotelId: string
  userId: string
  role: 'guest' | 'staff' | 'supervisor' | 'manager' | 'admin'
  userEmail?: string
  createdAt: Date
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  isUsed: boolean
  usedAt?: Date
}

export type QRValidationPayload = {
  success: boolean
  sessionId?: string
  role?: 'guest' | 'staff' | 'supervisor' | 'manager' | 'admin'
  expiresAt?: string
  redirectUrl?: string
  error?: string
}

export type QRGenerationResponse = {
  success: boolean
  qrTokenId?: string
  loginUrl?: string
  expiresAt?: string
  qrCode?: {
    png: string
    svg: string
  }
  error?: string
}