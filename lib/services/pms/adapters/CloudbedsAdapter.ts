/**
 * Cloudbeds PMS Adapter - Phase 9
 * Real implementation for Cloudbeds REST API with OAuth 2.0
 * 
 * Cloudbeds API Documentation: https://hotels.cloudbeds.com/api/docs/
 * Authentication: OAuth 2.0 (Authorization Code Flow)
 * Rate Limit: 60 requests/minute
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
  ExternalFolio,
  RateLimitConfig,
  PMSError
} from './PMSAdapterInterface'

/**
 * Cloudbeds API base URL
 */
const CLOUDBEDS_API_BASE_URL = 'https://hotels.cloudbeds.com/api/v1.2'
const CLOUDBEDS_OAUTH_URL = 'https://hotels.cloudbeds.com/api/v1.1/oauth'

/**
 * Cloudbeds-specific types
 */
interface CloudbedsProperty {
  propertyID: string
  propertyName: string
  propertyTimezone: string
  propertyCurrencyCode: string
}

interface CloudbedsRoom {
  roomID: string
  roomName: string
  roomTypeID: string
  roomTypeName: string
  roomBlocked: boolean
  roomStatus: 'clean' | 'dirty' | 'inspected' | 'outoforder'
  maxGuests: number
}

interface CloudbedsRoomType {
  roomTypeID: string
  roomTypeName: string
  roomTypeNameShort: string
  maxGuests: number
  roomTypeDescription: string
}

interface CloudbedsReservation {
  reservationID: string
  guestID: string
  guestName: string
  guestEmail: string
  guestPhone: string
  roomID?: string
  roomName?: string
  status: 'confirmed' | 'not_confirmed' | 'canceled' | 'checked_in' | 'checked_out' | 'no_show'
  startDate: string
  endDate: string
  adults: number
  children: number
  balance: number
}

interface CloudbedsGuest {
  guestID: string
  guestFirstName: string
  guestLastName: string
  guestEmail: string
  guestPhone: string
  guestCountry: string
  guestZip: string
  guestAddress: string
  guestCity: string
}

/**
 * Cloudbeds PMS Adapter Implementation
 */
export class CloudbedsAdapter extends BasePMSAdapter {
  readonly vendor = PMSVendor.CLOUDBEDS
  readonly authType = PMSAuthType.OAUTH2
  readonly supportsWebhooks = true
  readonly supportsRealTimeSync = false
  readonly rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 3000,
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
      scope: 'read:reservation write:reservation read:guest write:guest read:room write:room'
    })
    return `${CLOUDBEDS_OAUTH_URL}/authorize?${params.toString()}`
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
      const response = await axios.post(`${CLOUDBEDS_OAUTH_URL}/token`, {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })

      const data = response.data
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    } catch (error) {
      console.error('[Cloudbeds] OAuth token exchange failed:', error)
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
      const response = await axios.post(`${CLOUDBEDS_OAUTH_URL}/token`, {
        grant_type: 'refresh_token',
        refresh_token: config.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })

      const data = response.data
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    } catch (error) {
      console.error('[Cloudbeds] Token refresh failed:', error)
      throw new Error(`Token refresh failed: ${(error as Error).message}`)
    }
  }

  /**
   * Initialize Cloudbeds API client
   */
  private initializeClient(config: PMSConnectionConfig): void {
    if (!config.accessToken) {
      throw new Error('Cloudbeds requires OAuth accessToken')
    }

    this.client = axios.create({
      baseURL: config.endpoint || CLOUDBEDS_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`
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
          // Token expired, needs refresh
          console.warn('[Cloudbeds] Access token expired, refresh required')
          throw new Error('Access token expired - refresh required')
        }

        if (error.response?.status === 429) {
          // Rate limit exceeded
          const retryAfter = error.response.headers['retry-after'] || 60
          console.warn(`[Cloudbeds] Rate limit exceeded, retrying after ${retryAfter}s`)
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
    
    // Reset counter every minute
    if (now - this.requestCountResetTime > 60000) {
      this.requestCount = 0
      this.requestCountResetTime = now
    }

    // Wait if rate limit reached
    if (this.requestCount >= this.rateLimit.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.requestCountResetTime)
      if (waitTime > 0) {
        console.log(`[Cloudbeds] Rate limit reached, waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.requestCount = 0
        this.requestCountResetTime = Date.now()
      }
    }

    this.requestCount++
  }

  /**
   * Test connection to Cloudbeds API
   */
  async testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult> {
    try {
      this.initializeClient(config)

      // Test with getHotel call
      const response = await this.client!.get('/getHotel')
      const property: CloudbedsProperty = response.data.data

      if (!property) {
        return {
          success: false,
          message: 'No property data returned',
          errors: ['Unable to retrieve property information'],
          suggestions: [
            'Verify OAuth token has property access',
            'Check if property is active in Cloudbeds',
            'Contact Cloudbeds support'
          ]
        }
      }

      return {
        success: true,
        message: 'Successfully connected to Cloudbeds PMS',
        details: {
          version: 'API v1.2',
          features: [
            'Reservation management',
            'Guest profile sync',
            'Room status updates',
            'Availability management',
            'Webhook support for real-time updates'
          ],
          limitations: [
            'Rate limit: 60 requests/minute',
            'OAuth token expires (refresh required)',
            'Some advanced features require higher plan'
          ],
          hotelInfo: {
            name: property.propertyName,
            propertyId: property.propertyID
          }
        }
      }
    } catch (error) {
      console.error('[Cloudbeds] Connection test failed:', error)

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Authentication failed',
            errors: ['Invalid or expired OAuth access token'],
            suggestions: [
              'Re-authenticate using OAuth flow',
              'Verify OAuth token has not expired',
              'Check if token has necessary scopes',
              'Refresh access token using refresh_token'
            ]
          }
        }

        if (error.response?.status === 403) {
          return {
            success: false,
            message: 'Access denied',
            errors: ['Insufficient permissions for this property'],
            suggestions: [
              'Verify OAuth scopes include required permissions',
              'Check if user has access to this property',
              'Contact Cloudbeds support for permission issues'
            ]
          }
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Cannot reach Cloudbeds API',
            errors: ['Network connection failed'],
            suggestions: [
              'Check internet connectivity',
              'Verify firewall allows outbound HTTPS to hotels.cloudbeds.com',
              'Check Cloudbeds API status'
            ]
          }
        }
      }

      return {
        success: false,
        message: 'Connection test failed',
        errors: [(error as Error).message],
        suggestions: [
          'Verify OAuth access token is valid',
          'Check Cloudbeds API status',
          'Contact support with error details'
        ]
      }
    }
  }

  /**
   * Connect to Cloudbeds (initialize client)
   */
  async connect(config: PMSConnectionConfig): Promise<void> {
    this.initializeClient(config)
    console.log(`[Cloudbeds] Connected for hotel ${config.hotelId}`)
  }

  /**
   * Disconnect from Cloudbeds
   */
  async disconnect(hotelId: string): Promise<void> {
    this.client = null
    this.requestCount = 0
    console.log(`[Cloudbeds] Disconnected for hotel ${hotelId}`)
  }

  /**
   * Sync rooms from Cloudbeds
   */
  async syncRooms(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoom[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const response = await this.client!.get('/getRooms')
      const rooms: CloudbedsRoom[] = response.data.data || []

      return rooms.map(room => ({
        externalId: room.roomID,
        roomNumber: room.roomName,
        roomTypeId: room.roomTypeID,
        status: this.mapCloudbedsRoomStatus(room.roomStatus),
        isActive: !room.roomBlocked,
        maxOccupancy: room.maxGuests,
        features: [],
        metadata: {
          cloudbedsStatus: room.roomStatus,
          roomTypeName: room.roomTypeName
        }
      }))
    } catch (error) {
      console.error('[Cloudbeds] Failed to sync rooms:', error)
      throw this.handleSyncError('Room', 'READ', error)
    }
  }

  /**
   * Sync room types from Cloudbeds
   */
  async syncRoomTypes(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoomType[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      const response = await this.client!.get('/getRoomTypes')
      const roomTypes: CloudbedsRoomType[] = response.data.data || []

      return roomTypes.map(roomType => ({
        externalId: roomType.roomTypeID,
        name: roomType.roomTypeName,
        code: roomType.roomTypeNameShort,
        description: roomType.roomTypeDescription,
        maxOccupancy: roomType.maxGuests,
        amenities: [],
        metadata: {
          cloudbedsShortName: roomType.roomTypeNameShort
        }
      }))
    } catch (error) {
      console.error('[Cloudbeds] Failed to sync room types:', error)
      throw this.handleSyncError('RoomType', 'READ', error)
    }
  }

  /**
   * Sync bookings from Cloudbeds
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
      const params: any = {}
      if (dateFrom) params.start_date = dateFrom.toISOString().split('T')[0]
      if (dateTo) params.end_date = dateTo.toISOString().split('T')[0]

      const response = await this.client!.get('/getReservations', { params })
      const reservations: CloudbedsReservation[] = response.data.data || []

      return reservations.map(reservation => ({
        externalId: reservation.reservationID,
        guestId: reservation.guestID,
        roomId: reservation.roomID,
        confirmationNumber: reservation.reservationID,
        status: this.mapCloudbedsReservationStatus(reservation.status),
        checkInDate: new Date(reservation.startDate),
        checkOutDate: new Date(reservation.endDate),
        numberOfGuests: reservation.adults + reservation.children,
        totalAmount: Math.abs(reservation.balance),
        metadata: {
          cloudbedsStatus: reservation.status,
          adults: reservation.adults,
          children: reservation.children,
          roomName: reservation.roomName
        }
      }))
    } catch (error) {
      console.error('[Cloudbeds] Failed to sync bookings:', error)
      throw this.handleSyncError('Booking', 'READ', error)
    }
  }

  /**
   * Sync guests from Cloudbeds
   */
  async syncGuests(hotelId: string, config: PMSConnectionConfig): Promise<ExternalGuest[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      // Cloudbeds doesn't have a dedicated getGuests endpoint
      // Guests are typically fetched with reservations
      const response = await this.client!.get('/getReservations')
      const reservations: CloudbedsReservation[] = response.data.data || []

      // Extract unique guests from reservations
      const guestsMap = new Map<string, ExternalGuest>()

      for (const reservation of reservations) {
        if (!guestsMap.has(reservation.guestID)) {
          const nameParts = reservation.guestName.split(' ')
          guestsMap.set(reservation.guestID, {
            externalId: reservation.guestID,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: reservation.guestEmail,
            phone: reservation.guestPhone,
            metadata: {
              cloudbedsGuestId: reservation.guestID
            }
          })
        }
      }

      return Array.from(guestsMap.values())
    } catch (error) {
      console.error('[Cloudbeds] Failed to sync guests:', error)
      throw this.handleSyncError('Guest', 'READ', error)
    }
  }

  /**
   * Create booking in Cloudbeds
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
      const response = await this.client!.post('/postReservation', {
        startDate: booking.checkInDate.toISOString().split('T')[0],
        endDate: booking.checkOutDate.toISOString().split('T')[0],
        roomTypeID: booking.roomId,
        adults: booking.numberOfGuests,
        children: 0,
        guestFirstName: 'Guest', // Will be updated with real guest data
        guestLastName: 'Guest',
        guestEmail: ''
      })

      return response.data.reservationID || ''
    } catch (error) {
      console.error('[Cloudbeds] Failed to create booking:', error)
      throw this.handleSyncError('Booking', 'CREATE', error)
    }
  }

  /**
   * Update booking in Cloudbeds
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
        reservationID: externalId
      }

      if (booking.checkInDate) updateData.startDate = booking.checkInDate.toISOString().split('T')[0]
      if (booking.checkOutDate) updateData.endDate = booking.checkOutDate.toISOString().split('T')[0]
      if (booking.status) updateData.status = this.mapToCloudbedsReservationStatus(booking.status)

      await this.client!.put('/putReservation', updateData)
    } catch (error) {
      console.error('[Cloudbeds] Failed to update booking:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Cancel booking in Cloudbeds
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
      await this.client!.put('/putReservation', {
        reservationID: externalId,
        status: 'canceled'
      })
    } catch (error) {
      console.error('[Cloudbeds] Failed to cancel booking:', error)
      throw this.handleSyncError('Booking', 'DELETE', error)
    }
  }

  /**
   * Check in guest in Cloudbeds
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
      await this.client!.post('/postCheckIn', {
        reservationID: bookingId
      })
    } catch (error) {
      console.error('[Cloudbeds] Failed to check in:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Check out guest in Cloudbeds
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
      await this.client!.post('/postCheckOut', {
        reservationID: bookingId
      })
    } catch (error) {
      console.error('[Cloudbeds] Failed to check out:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Update room status in Cloudbeds
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
      await this.client!.put('/putRoom', {
        roomID: roomId,
        roomStatus: this.mapToCloudbedsRoomStatus(status)
      })
    } catch (error) {
      console.error('[Cloudbeds] Failed to update room status:', error)
      throw this.handleSyncError('Room', 'UPDATE', error)
    }
  }

  /**
   * Map Cloudbeds room status to standard status
   */
  private mapCloudbedsRoomStatus(status: CloudbedsRoom['roomStatus']): ExternalRoom['status'] {
    switch (status) {
      case 'clean':
      case 'inspected':
        return 'AVAILABLE'
      case 'dirty':
        return 'DIRTY'
      case 'outoforder':
        return 'OUT_OF_ORDER'
      default:
        return 'AVAILABLE'
    }
  }

  /**
   * Map standard status to Cloudbeds room status
   */
  private mapToCloudbedsRoomStatus(status: ExternalRoom['status']): CloudbedsRoom['roomStatus'] {
    switch (status) {
      case 'AVAILABLE':
        return 'clean'
      case 'DIRTY':
        return 'dirty'
      case 'OUT_OF_ORDER':
      case 'MAINTENANCE':
        return 'outoforder'
      default:
        return 'clean'
    }
  }

  /**
   * Map Cloudbeds reservation status to standard status
   */
  private mapCloudbedsReservationStatus(status: CloudbedsReservation['status']): ExternalBooking['status'] {
    switch (status) {
      case 'confirmed':
      case 'not_confirmed':
        return 'CONFIRMED'
      case 'checked_in':
        return 'CHECKED_IN'
      case 'checked_out':
        return 'CHECKED_OUT'
      case 'canceled':
        return 'CANCELED'
      case 'no_show':
        return 'NO_SHOW'
      default:
        return 'CONFIRMED'
    }
  }

  /**
   * Map standard status to Cloudbeds reservation status
   */
  private mapToCloudbedsReservationStatus(status: ExternalBooking['status']): CloudbedsReservation['status'] {
    switch (status) {
      case 'CONFIRMED':
        return 'confirmed'
      case 'CHECKED_IN':
        return 'checked_in'
      case 'CHECKED_OUT':
        return 'checked_out'
      case 'CANCELED':
        return 'canceled'
      case 'NO_SHOW':
        return 'no_show'
      default:
        return 'confirmed'
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
    return new Error(`Cloudbeds ${operation} ${entityType} failed: ${pmsError.errorMessage}`)
  }
}
