/**
 * AI Access Layer
 * 
 * SAFETY: Central aggregation point for all AI-PMS interactions
 * - Enforces hotel scoping
 * - Applies field masking
 * - Validates RBAC
 * - NO direct Prisma access
 */

import {
  getBookingsForAI,
  getBookingByIdForAI,
  getTodayArrivalsForAI,
  getTodayDeparturesForAI,
  BookingReadModel
} from './read-models/booking.read'

import {
  getGuestForAI,
  searchGuestsForAI,
  getVIPGuestsForAI,
  GuestReadModel
} from './read-models/guest.read'

import {
  getRoomForAI,
  getRoomsForAI,
  getAvailableRoomsForAI,
  getRoomStatusSummaryForAI,
  RoomReadModel
} from './read-models/room.read'

import {
  getFolioForAI,
  getOpenFoliosForAI,
  getUnpaidFoliosForAI,
  getFolioStatsForAI,
  FolioReadModel
} from './read-models/folio.read'

import {
  guardAIRead,
  AIContext,
  AIPermission,
  validateAIContext
} from './guards/aiPermissionGuard'

/**
 * AI Access Layer - Central Interface
 * All AI read operations MUST go through this layer
 */
export class AIAccessLayer {
  /**
   * Get booking information
   */
  static async getBooking(
    context: AIContext,
    bookingId: string
  ): Promise<BookingReadModel | null> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_BOOKINGS,
      () => getBookingByIdForAI(context.hotelId, bookingId)
    )
  }

  /**
   * Get today's arrivals
   */
  static async getTodayArrivals(context: AIContext): Promise<BookingReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_BOOKINGS,
      () => getTodayArrivalsForAI(context.hotelId)
    )
  }

  /**
   * Get today's departures
   */
  static async getTodayDepartures(context: AIContext): Promise<BookingReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_BOOKINGS,
      () => getTodayDeparturesForAI(context.hotelId)
    )
  }

  /**
   * Get guest information (with optional PII/financial masking)
   */
  static async getGuest(
    context: AIContext,
    guestId: string,
    options: {
      includePII?: boolean
      includeFinancials?: boolean
    } = {}
  ): Promise<GuestReadModel | null> {
    validateAIContext(context)
    
    // Check permissions for sensitive data
    const permission = options.includePII || options.includeFinancials
      ? AIPermission.READ_GUESTS_PII
      : AIPermission.READ_GUESTS
    
    return guardAIRead(
      context,
      permission,
      () => getGuestForAI(context.hotelId, guestId, options)
    )
  }

  /**
   * Search guests
   */
  static async searchGuests(
    context: AIContext,
    query: string,
    options: { includePII?: boolean; limit?: number } = {}
  ): Promise<GuestReadModel[]> {
    validateAIContext(context)
    
    const permission = options.includePII
      ? AIPermission.READ_GUESTS_PII
      : AIPermission.READ_GUESTS
    
    return guardAIRead(
      context,
      permission,
      () => searchGuestsForAI(context.hotelId, query, options)
    )
  }

  /**
   * Get VIP guests
   */
  static async getVIPGuests(context: AIContext): Promise<GuestReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_GUESTS,
      () => getVIPGuestsForAI(context.hotelId)
    )
  }

  /**
   * Get room information
   */
  static async getRoom(
    context: AIContext,
    roomId: string,
    options: { includePricing?: boolean } = {}
  ): Promise<RoomReadModel | null> {
    validateAIContext(context)
    
    const permission = options.includePricing
      ? AIPermission.READ_ROOMS_PRICING
      : AIPermission.READ_ROOMS
    
    return guardAIRead(
      context,
      permission,
      () => getRoomForAI(context.hotelId, roomId, options)
    )
  }

  /**
   * Get all rooms with filters
   */
  static async getRooms(
    context: AIContext,
    filters: any = {}
  ): Promise<RoomReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_ROOMS,
      () => getRoomsForAI(context.hotelId, filters)
    )
  }

  /**
   * Get available rooms for date range
   */
  static async getAvailableRooms(
    context: AIContext,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<RoomReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_ROOMS,
      () => getAvailableRoomsForAI(context.hotelId, checkInDate, checkOutDate)
    )
  }

  /**
   * Get room status summary
   */
  static async getRoomStatusSummary(context: AIContext) {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_ROOMS,
      () => getRoomStatusSummaryForAI(context.hotelId)
    )
  }

  /**
   * Get folio information (read-only)
   */
  static async getFolio(
    context: AIContext,
    folioId: string
  ): Promise<FolioReadModel | null> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_FOLIOS,
      () => getFolioForAI(context.hotelId, folioId)
    )
  }

  /**
   * Get open folios
   */
  static async getOpenFolios(context: AIContext): Promise<FolioReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_FOLIOS,
      () => getOpenFoliosForAI(context.hotelId)
    )
  }

  /**
   * Get unpaid folios
   */
  static async getUnpaidFolios(context: AIContext): Promise<FolioReadModel[]> {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_FOLIOS,
      () => getUnpaidFoliosForAI(context.hotelId)
    )
  }

  /**
   * Get folio statistics
   */
  static async getFolioStats(context: AIContext) {
    validateAIContext(context)
    
    return guardAIRead(
      context,
      AIPermission.READ_FOLIOS,
      () => getFolioStatsForAI(context.hotelId)
    )
  }

  /**
   * Get aggregated dashboard data (single call for AI)
   */
  static async getDashboardSummary(context: AIContext) {
    validateAIContext(context)
    
    // This runs multiple reads in parallel
    const [arrivals, departures, roomStats, folioStats, vipGuests] = await Promise.all([
      this.getTodayArrivals(context),
      this.getTodayDepartures(context),
      this.getRoomStatusSummary(context),
      this.getFolioStats(context),
      this.getVIPGuests(context)
    ])

    return {
      arrivals,
      departures,
      roomStats,
      folioStats,
      vipGuests
    }
  }
}

/**
 * Export singleton instance
 */
export const aiAccessLayer = AIAccessLayer
