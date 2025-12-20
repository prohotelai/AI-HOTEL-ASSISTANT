/**
 * Opera Cloud PMS Adapter - Phase 9
 * Real implementation for Oracle Opera Cloud REST API
 * 
 * Opera Cloud API Documentation: https://docs.oracle.com/en/industries/hospitality/opera-cloud/
 * Authentication: OAuth 2.0 + x-app-key header
 * Rate Limit: 100 requests/minute
 */

import axios, { AxiosInstance } from 'axios'
import {
  BasePMSAdapter,
  PMSVendor,
  PMSAuthType,
  PMSConnectionConfig,
  PMSConnectionTestResult,
  ExternalRoom,
  ExternalRoomType,
  ExternalBooking,
  ExternalGuest,
  RateLimitConfig,
  PMSError
} from './PMSAdapterInterface'

/**
 * Opera Cloud API base URL
 */
const OPERA_API_BASE_URL = 'https://operacloud.oracleindustry.com/ocis/rest'
const OPERA_OAUTH_URL = 'https://operacloud.oracleindustry.com/oauth/v1'

/**
 * Opera-specific types
 */
interface OperaHotelInfo {
  hotelId: string
  hotelCode: string
  hotelName: string
  chainCode: string
}

interface OperaRoom {
  roomId: string
  roomNumber: string
  roomType: string
  roomTypeDescription: string
  roomStatus: 'CLEAN' | 'DIRTY' | 'OUT_OF_ORDER' | 'OUT_OF_SERVICE'
  frontOfficeStatus: 'VACANT' | 'OCCUPIED' | 'RESERVED'
  housekeepingStatus: 'CLEAN' | 'DIRTY' | 'INSPECTED'
  maxOccupancy: number
  features: string[]
}

interface OperaRoomType {
  roomType: string
  description: string
  shortDescription: string
  maxOccupancy: number
  pseudoRoom: boolean
  category: string
}

interface OperaReservation {
  reservationId: string
  confirmationNumber: string
  reservationStatus: 'RESERVED' | 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
  guestId: string
  guestName: {
    firstName: string
    lastName: string
    title?: string
  }
  roomId?: string
  roomNumber?: string
  roomType: string
  arrivalDate: string
  departureDate: string
  actualArrival?: string
  actualDeparture?: string
  adults: number
  children: number
  balance: {
    amount: number
    currency: string
  }
  guaranteeCode?: string
}

interface OperaProfile {
  profileId: string
  profileType: 'GUEST' | 'COMPANY' | 'GROUP'
  firstName?: string
  lastName?: string
  title?: string
  email?: string
  phone?: string
  nationality?: string
  birthDate?: string
  addresses: Array<{
    addressType: string
    address1?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }>
  vipStatus?: string
  membershipLevel?: string
}

/**
 * Opera Cloud PMS Adapter Implementation
 */
export class OperaAdapter extends BasePMSAdapter {
  readonly vendor = PMSVendor.OPERA
  readonly authType = PMSAuthType.OAUTH2
  readonly supportsWebhooks = true
  readonly supportsRealTimeSync = true
  readonly rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 6000,
    retryAfterMs: 60000
  }

  private client: AxiosInstance | null = null
  private requestCount = 0
  private requestCountResetTime = Date.now()

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'hotel.reservation.read hotel.reservation.write hotel.room.read hotel.profile.read'
    })
    return `${OPERA_OAUTH_URL}/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    try {
      const response = await axios.post(`${OPERA_OAUTH_URL}/tokens`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      const data = response.data
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    } catch (error) {
      console.error('[Opera] OAuth token exchange failed:', error)
      throw new Error(`OAuth token exchange failed: ${(error as Error).message}`)
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(config: PMSConnectionConfig): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: Date
  }> {
    if (!config.refreshToken || !config.clientId || !config.clientSecret) {
      throw new Error('Refresh token, clientId, and clientSecret required for token refresh')
    }

    try {
      const response = await axios.post(`${OPERA_OAUTH_URL}/tokens`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      const data = response.data
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    } catch (error) {
      console.error('[Opera] Token refresh failed:', error)
      throw new Error(`Token refresh failed: ${(error as Error).message}`)
    }
  }

  /**
   * Initialize Opera API client
   */
  private initializeClient(config: PMSConnectionConfig): void {
    if (!config.accessToken || !config.apiKey) {
      throw new Error('Opera requires both OAuth accessToken and x-app-key')
    }

    this.client = axios.create({
      baseURL: config.endpoint || OPERA_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
        'x-app-key': config.apiKey
      },
      timeout: 30000
    })

    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit()
      return config
    })

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.warn('[Opera] Access token expired, refresh required')
          throw new Error('Access token expired - refresh required')
        }

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60
          console.warn(`[Opera] Rate limit exceeded, retrying after ${retryAfter}s`)
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          return this.client!.request(error.config)
        }

        throw error
      }
    )
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    
    if (now - this.requestCountResetTime > 60000) {
      this.requestCount = 0
      this.requestCountResetTime = now
    }

    if (this.requestCount >= this.rateLimit.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.requestCountResetTime)
      if (waitTime > 0) {
        console.log(`[Opera] Rate limit reached, waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.requestCount = 0
        this.requestCountResetTime = Date.now()
      }
    }

    this.requestCount++
  }

  /**
   * Test connection to Opera Cloud API
   */
  async testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult> {
    try {
      this.initializeClient(config)

      // Test with hotel info call
      const response = await this.client!.get('/hotels')
      const hotels: OperaHotelInfo[] = response.data.hotels || []

      if (!hotels || hotels.length === 0) {
        return {
          success: false,
          message: 'No hotels found in Opera Cloud instance',
          errors: ['Unable to retrieve hotel information'],
          suggestions: [
            'Verify OAuth token has hotel access',
            'Check if x-app-key is valid',
            'Ensure hotel is active in Opera Cloud',
            'Contact Oracle support'
          ]
        }
      }

      const hotel = hotels[0]

      return {
        success: true,
        message: 'Successfully connected to Opera Cloud PMS',
        details: {
          version: 'Opera Cloud OCIS REST API',
          features: [
            'Real-time reservation management',
            'Guest profile sync',
            'Room and rate management',
            'Housekeeping automation',
            'Event-driven webhooks',
            'Enterprise-grade security'
          ],
          limitations: [
            'Rate limit: 100 requests/minute',
            'Requires x-app-key header for all requests',
            'Some operations require specific permissions',
            'OAuth token expires (refresh required)'
          ],
          hotelInfo: {
            name: hotel.hotelName,
            propertyId: hotel.hotelCode
          }
        }
      }
    } catch (error) {
      console.error('[Opera] Connection test failed:', error)

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Authentication failed',
            errors: ['Invalid OAuth access token or x-app-key'],
            suggestions: [
              'Re-authenticate using OAuth flow',
              'Verify x-app-key is correct and not expired',
              'Check if OAuth token has not expired',
              'Refresh access token using refresh_token',
              'Verify OAuth scopes include required permissions'
            ]
          }
        }

        if (error.response?.status === 403) {
          return {
            success: false,
            message: 'Access denied',
            errors: ['Insufficient permissions for this hotel'],
            suggestions: [
              'Verify OAuth scopes include hotel access',
              'Check if user has permissions for this property',
              'Ensure x-app-key is associated with correct hotel',
              'Contact Oracle support for permission issues'
            ]
          }
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Cannot reach Opera Cloud API',
            errors: ['Network connection failed'],
            suggestions: [
              'Check internet connectivity',
              'Verify firewall allows outbound HTTPS to operacloud.oracleindustry.com',
              'Check Opera Cloud API status',
              'Verify endpoint URL is correct'
            ]
          }
        }
      }

      return {
        success: false,
        message: 'Connection test failed',
        errors: [(error as Error).message],
        suggestions: [
          'Verify OAuth access token and x-app-key are valid',
          'Check Opera Cloud API status',
          'Contact support with error details'
        ]
      }
    }
  }

  /**
   * Connect to Opera Cloud (initialize client)
   */
  async connect(config: PMSConnectionConfig): Promise<void> {
    this.initializeClient(config)
    console.log(`[Opera] Connected for hotel ${config.hotelId}`)
  }

  /**
   * Disconnect from Opera Cloud
   */
  async disconnect(hotelId: string): Promise<void> {
    this.client = null
    this.requestCount = 0
    console.log(`[Opera] Disconnected for hotel ${hotelId}`)
  }

  /**
   * Sync rooms from Opera Cloud
   */
  async syncRooms(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoom[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const response = await this.client!.get('/rooms', {
        params: {
          hotelId: config.metadata?.hotelCode || hotelId
        }
      })

      const rooms: OperaRoom[] = response.data.rooms || []

      return rooms.map(room => ({
        externalId: room.roomId,
        roomNumber: room.roomNumber,
        roomTypeId: room.roomType,
        status: this.mapOperaRoomStatus(room.frontOfficeStatus, room.housekeepingStatus),
        isActive: room.roomStatus !== 'OUT_OF_SERVICE',
        maxOccupancy: room.maxOccupancy,
        features: room.features || [],
        metadata: {
          operaRoomStatus: room.roomStatus,
          operaFrontOfficeStatus: room.frontOfficeStatus,
          operaHousekeepingStatus: room.housekeepingStatus,
          roomTypeDescription: room.roomTypeDescription
        }
      }))
    } catch (error) {
      console.error('[Opera] Failed to sync rooms:', error)
      throw this.handleSyncError('Room', 'READ', error)
    }
  }

  /**
   * Sync room types from Opera Cloud
   */
  async syncRoomTypes(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoomType[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const response = await this.client!.get('/roomTypes', {
        params: {
          hotelId: config.metadata?.hotelCode || hotelId
        }
      })

      const roomTypes: OperaRoomType[] = response.data.roomTypes || []

      return roomTypes
        .filter(rt => !rt.pseudoRoom) // Exclude pseudo rooms
        .map(roomType => ({
          externalId: roomType.roomType,
          name: roomType.description,
          code: roomType.shortDescription,
          description: roomType.description,
          maxOccupancy: roomType.maxOccupancy,
          amenities: [],
          metadata: {
            operaCategory: roomType.category,
            operaPseudoRoom: roomType.pseudoRoom
          }
        }))
    } catch (error) {
      console.error('[Opera] Failed to sync room types:', error)
      throw this.handleSyncError('RoomType', 'READ', error)
    }
  }

  /**
   * Sync bookings from Opera Cloud
   */
  async syncBookings(
    hotelId: string,
    config: PMSConnectionConfig,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ExternalBooking[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const params: any = {
        hotelId: config.metadata?.hotelCode || hotelId,
        arrivalDateStart: dateFrom?.toISOString().split('T')[0] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        arrivalDateEnd: dateTo?.toISOString().split('T')[0] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      const response = await this.client!.get('/reservations', { params })
      const reservations: OperaReservation[] = response.data.reservations || []

      return reservations.map(reservation => ({
        externalId: reservation.reservationId,
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        confirmationNumber: reservation.confirmationNumber,
        status: this.mapOperaReservationStatus(reservation.reservationStatus),
        checkInDate: new Date(reservation.arrivalDate),
        checkOutDate: new Date(reservation.departureDate),
        actualCheckIn: reservation.actualArrival ? new Date(reservation.actualArrival) : undefined,
        actualCheckOut: reservation.actualDeparture ? new Date(reservation.actualDeparture) : undefined,
        numberOfGuests: reservation.adults + reservation.children,
        totalAmount: Math.abs(reservation.balance.amount),
        currency: reservation.balance.currency,
        metadata: {
          operaStatus: reservation.reservationStatus,
          roomType: reservation.roomType,
          roomNumber: reservation.roomNumber,
          adults: reservation.adults,
          children: reservation.children,
          guaranteeCode: reservation.guaranteeCode
        }
      }))
    } catch (error) {
      console.error('[Opera] Failed to sync bookings:', error)
      throw this.handleSyncError('Booking', 'READ', error)
    }
  }

  /**
   * Sync guests from Opera Cloud
   */
  async syncGuests(hotelId: string, config: PMSConnectionConfig): Promise<ExternalGuest[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const response = await this.client!.get('/profiles', {
        params: {
          hotelId: config.metadata?.hotelCode || hotelId,
          profileType: 'GUEST'
        }
      })

      const profiles: OperaProfile[] = response.data.profiles || []

      return profiles.map(profile => {
        const address = profile.addresses?.[0] || {}
        
        return {
          externalId: profile.profileId,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email,
          phone: profile.phone,
          nationality: profile.nationality,
          dateOfBirth: profile.birthDate ? new Date(profile.birthDate) : undefined,
          address: address.address1,
          city: address.city,
          country: address.country,
          postalCode: address.postalCode,
          vipStatus: !!profile.vipStatus,
          preferences: [],
          metadata: {
            operaTitle: profile.title,
            operaVipStatus: profile.vipStatus,
            operaMembershipLevel: profile.membershipLevel
          }
        }
      })
    } catch (error) {
      console.error('[Opera] Failed to sync guests:', error)
      throw this.handleSyncError('Guest', 'READ', error)
    }
  }

  /**
   * Create booking in Opera Cloud
   */
  async createBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    booking: ExternalBooking
  ): Promise<string> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const response = await this.client!.post('/reservations', {
        hotelId: config.metadata?.hotelCode || hotelId,
        guestId: booking.guestId,
        roomType: booking.roomId,
        arrivalDate: booking.checkInDate.toISOString().split('T')[0],
        departureDate: booking.checkOutDate.toISOString().split('T')[0],
        adults: booking.numberOfGuests,
        children: 0,
        guaranteeCode: 'CC' // Credit card guarantee
      })

      return response.data.reservationId || response.data.confirmationNumber || ''
    } catch (error) {
      console.error('[Opera] Failed to create booking:', error)
      throw this.handleSyncError('Booking', 'CREATE', error)
    }
  }

  /**
   * Update booking in Opera Cloud
   */
  async updateBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    externalId: string,
    booking: Partial<ExternalBooking>
  ): Promise<void> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const updateData: any = {
        reservationId: externalId
      }

      if (booking.checkInDate) updateData.arrivalDate = booking.checkInDate.toISOString().split('T')[0]
      if (booking.checkOutDate) updateData.departureDate = booking.checkOutDate.toISOString().split('T')[0]
      if (booking.roomId) updateData.roomId = booking.roomId
      if (booking.status) updateData.status = this.mapToOperaReservationStatus(booking.status)

      await this.client!.put(`/reservations/${externalId}`, updateData)
    } catch (error) {
      console.error('[Opera] Failed to update booking:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Cancel booking in Opera Cloud
   */
  async cancelBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    externalId: string
  ): Promise<void> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      await this.client!.put(`/reservations/${externalId}`, {
        status: 'CANCELLED',
        cancellationDate: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('[Opera] Failed to cancel booking:', error)
      throw this.handleSyncError('Booking', 'DELETE', error)
    }
  }

  /**
   * Check in guest in Opera Cloud
   */
  async checkIn(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string,
    roomId: string
  ): Promise<void> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      await this.client!.post(`/reservations/${bookingId}/checkIn`, {
        roomId,
        checkInDate: new Date().toISOString()
      })
    } catch (error) {
      console.error('[Opera] Failed to check in:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Check out guest in Opera Cloud
   */
  async checkOut(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string
  ): Promise<void> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      await this.client!.post(`/reservations/${bookingId}/checkOut`, {
        checkOutDate: new Date().toISOString()
      })
    } catch (error) {
      console.error('[Opera] Failed to check out:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Update room status in Opera Cloud
   */
  async updateRoomStatus(
    hotelId: string,
    config: PMSConnectionConfig,
    roomId: string,
    status: ExternalRoom['status']
  ): Promise<void> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      await this.client!.put(`/rooms/${roomId}`, {
        housekeepingStatus: this.mapToOperaHousekeepingStatus(status)
      })
    } catch (error) {
      console.error('[Opera] Failed to update room status:', error)
      throw this.handleSyncError('Room', 'UPDATE', error)
    }
  }

  /**
   * Map Opera room status to standard status
   */
  private mapOperaRoomStatus(
    frontOfficeStatus: OperaRoom['frontOfficeStatus'],
    housekeepingStatus: OperaRoom['housekeepingStatus']
  ): ExternalRoom['status'] {
    if (frontOfficeStatus === 'OCCUPIED') return 'OCCUPIED'
    if (housekeepingStatus === 'DIRTY') return 'DIRTY'
    if (housekeepingStatus === 'CLEAN' || housekeepingStatus === 'INSPECTED') return 'AVAILABLE'
    return 'AVAILABLE'
  }

  /**
   * Map standard status to Opera housekeeping status
   */
  private mapToOperaHousekeepingStatus(status: ExternalRoom['status']): OperaRoom['housekeepingStatus'] {
    switch (status) {
      case 'AVAILABLE':
        return 'CLEAN'
      case 'DIRTY':
        return 'DIRTY'
      case 'OCCUPIED':
        return 'DIRTY'
      default:
        return 'CLEAN'
    }
  }

  /**
   * Map Opera reservation status to standard status
   */
  private mapOperaReservationStatus(status: OperaReservation['reservationStatus']): ExternalBooking['status'] {
    switch (status) {
      case 'RESERVED':
        return 'CONFIRMED'
      case 'IN_HOUSE':
        return 'CHECKED_IN'
      case 'CHECKED_OUT':
        return 'CHECKED_OUT'
      case 'CANCELLED':
        return 'CANCELED'
      case 'NO_SHOW':
        return 'NO_SHOW'
      default:
        return 'CONFIRMED'
    }
  }

  /**
   * Map standard status to Opera reservation status
   */
  private mapToOperaReservationStatus(status: ExternalBooking['status']): OperaReservation['reservationStatus'] {
    switch (status) {
      case 'CONFIRMED':
        return 'RESERVED'
      case 'CHECKED_IN':
        return 'IN_HOUSE'
      case 'CHECKED_OUT':
        return 'CHECKED_OUT'
      case 'CANCELED':
        return 'CANCELLED'
      case 'NO_SHOW':
        return 'NO_SHOW'
      default:
        return 'RESERVED'
    }
  }

  /**
   * Handle sync errors with proper error structure
   */
  private handleSyncError(entityType: string, operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ', error: any): Error {
    const pmsError: PMSError = {
      entityType,
      operation,
      errorMessage: error.message || 'Unknown error',
      timestamp: new Date(),
      retryable: error.response?.status !== 401 && error.response?.status !== 403,
      errorCode: error.response?.status?.toString()
    }

    this.handleError(pmsError)
    return new Error(`Opera ${operation} ${entityType} failed: ${pmsError.errorMessage}`)
  }
}
