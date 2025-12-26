/**
 * Guest Context Adapter
 * Module 11: QR Guest Login System
 * 
 * Provides unified guest context factory for Widget SDK integration
 * Converts database Guest and Stay records to GuestContext type
 */

import { GuestContext, StayContext } from '../types'

// Stub type for Guest model
type Guest = {
  id: string
  stays: Array<{
    id: string
    status: string
    checkOutTime: Date
    room: any
  }>
  [key: string]: any
}

/**
 * Create unified guest context from database records
 * Used by Widget SDK to get authenticated guest information
 */
export function createGuestContext(
  guest: Guest,
  hotelId: string,
  options?: {
    includeActiveStayOnly?: boolean
    permissions?: Record<string, boolean>
  }
): GuestContext {
  const activeStay = guest.stays.find(
    stay =>
      stay.status === 'CHECKED_IN' &&
      stay.checkOutTime > new Date()
  )

  // Determine permissions based on active stay and other factors
  const hasActiveStay = !!activeStay
  const permissions = options?.permissions || {
    canAccessServices: hasActiveStay,
    canRequestService: hasActiveStay,
    canViewBill: hasActiveStay,
    canOrderFood: hasActiveStay,
    canRequestHousekeeping: hasActiveStay
  }

  return {
    guestId: guest.id,
    hotelId,
    firstName: guest.firstName,
    lastName: guest.lastName,
    email: guest.email,
    phone: guest.phone,
    language: guest.language || 'en',
    vipStatus: guest.vipStatus || 'REGULAR',
    loyaltyTier: guest.loyaltyTier,
    loyaltyPoints: guest.loyaltyPoints || 0,
    preferences: guest.preferences as Record<string, unknown> | null,
    permissions: {
      canAccessServices: permissions.canAccessServices || false,
      canRequestService: permissions.canRequestService || false,
      canViewBill: permissions.canViewBill || false,
      canOrderFood: permissions.canOrderFood || false,
      canRequestHousekeeping: permissions.canRequestHousekeeping || false,
    }
  }
}

// Stub type for Stay model
type Stay = {
  id: string
  guestId: string
  hotelId: string
  roomId: string
  checkInTime: Date
  checkOutTime: Date
  numberOfNights: number
  status: string
  room: {
    number: string
  }
  [key: string]: any
}

/**
 * Create stay context from database records
 * Provides information about current guest stay
 */
export function createStayContext(stay: Stay): StayContext {
  const isActive = stay.status === 'CHECKED_IN'

  return {
    stayId: stay.id,
    guestId: stay.guestId,
    hotelId: stay.hotelId,
    roomId: stay.roomId,
    roomNumber: stay.room.number,
    checkInTime: stay.checkInTime,
    checkOutTime: stay.checkOutTime,
    numberOfNights: stay.numberOfNights,
    isActive,
    status: stay.status === 'CHECKED_IN' ? 'CHECKED_IN' : 'CHECKED_OUT'
  }
}

/**
 * Combine guest and stay context for complete widget context
 * Used during QR login flow to get all necessary information
 */
export function createUnifiedContext(
  guest: Guest,
  hotelId: string
): { guest: GuestContext; stay: StayContext | null } {
  const activeStay = guest.stays.find(
    stay =>
      stay.status === 'CHECKED_IN' &&
      stay.checkOutTime > new Date()
  )

  return {
    guest: createGuestContext(guest, hotelId),
    stay: activeStay ? createStayContext(activeStay as Stay) : null
  }
}

/**
 * Enrich guest context with additional widget-specific information
 * Adds permissions, settings, and preferences for widget display
 */
export function enrichGuestContextForWidget(
  context: GuestContext,
  additionalData?: {
    activeTickets?: number
    pendingRequests?: number
    billBalance?: number
    lastVisitDate?: Date
  }
): GuestContext & Record<string, unknown> {
  return {
    ...context,
    widget: {
      activeTickets: additionalData?.activeTickets || 0,
      pendingRequests: additionalData?.pendingRequests || 0,
      billBalance: additionalData?.billBalance || 0,
      lastVisitDate: additionalData?.lastVisitDate || null,
      preferences: {
        language: context.language,
        fontSize: (context.preferences as any)?.fontSize || 'medium',
        theme: (context.preferences as any)?.theme || 'light'
      }
    }
  }
}

/**
 * Validate guest context for QR login
 * Ensures guest has active stay and valid permissions
 */
export function validateGuestContextForQRLogin(
  context: GuestContext
): { valid: boolean; reason?: string } {
  if (!context.permissions.canAccessServices) {
    return {
      valid: false,
      reason: 'Guest does not have active stay'
    }
  }

  if (!context.guestId || !context.hotelId) {
    return {
      valid: false,
      reason: 'Missing required guest information'
    }
  }

  return { valid: true }
}
