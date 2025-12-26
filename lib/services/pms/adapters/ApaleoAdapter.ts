/**
 * Apaleo PMS Adapter - Phase 9 Block 3
 * Real implementation for Apaleo REST API with OAuth 2.0
 * 
 * Apaleo API Documentation: https://api.apaleo.com
 * Authentication: OAuth 2.0 (Authorization Code Flow + Client Credentials)
 * Rate Limit: 120 requests/minute
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
  ExternalFolioCharge,
  ExternalFolioPayment,
  RateLimitConfig,
  PMSError
} from './PMSAdapterInterface'

/**
 * Apaleo API base URLs
 */
const APALEO_API_BASE_URL = 'https://api.apaleo.com'
const APALEO_OAUTH_URL = 'https://identity.apaleo.com/connect/token'
const APALEO_AUTH_URL = 'https://identity.apaleo.com/connect/authorize'

/**
 * Apaleo-specific types
 */
interface ApaleoProperty {
  id: string
  code: string
  name: string
  description: string
  currencyCode: string
  timeZone: string
}

interface ApaleoUnit {
  id: string
  name: string
  description: string
  unitGroupId: string
  status: 'Clean' | 'CleanToBeInspected' | 'Dirty' | 'OutOfService' | 'OutOfOrder'
  condition: 'Ok' | 'CleaningNeeded' | 'RepairNeeded'
  maxPersons: number
}

interface ApaleoUnitGroup {
  id: string
  code: string
  name: string
  description: string
  maxPersons: number
  rank: number
}

interface ApaleoReservation {
  id: string
  bookingId: string
  blockId?: string
  status: 'Confirmed' | 'InHouse' | 'CheckedOut' | 'Canceled' | 'NoShow'
  primaryGuest: {
    id: string
    title?: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  unitGroupId: string
  unitId?: string
  arrival: string
  departure: string
  adults: number
  childrenAges: number[]
  totalGrossAmount: {
    amount: number
    currency: string
  }
}

interface ApaleoGuest {
  id: string
  title?: string
  gender?: 'Male' | 'Female' | 'Other'
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: {
    addressLine1?: string
    postalCode?: string
    city?: string
    countryCode?: string
  }
  nationalityCountryCode?: string
  birthDate?: string
}

interface ApaleoFolio {
  id: string
  reservationId: string
  guestId?: string
  debitor: {
    id: string
    name: string
  }
  charges: Array<{
    id: string
    date: string
    name: string
    amount: {
      amount: number
      currency: string
    }
    quantity: number
  }>
  payments: Array<{
    id: string
    date: string
    method: string
    amount: {
      amount: number
      currency: string
    }
  }>
  balance: {
    amount: number
    currency: string
  }
  isClosed: boolean
}

/**
 * Apaleo PMS Adapter Implementation
 */
export class ApaleoAdapter extends BasePMSAdapter {
  readonly vendor = PMSVendor.APALEO
  readonly authType = PMSAuthType.OAUTH2
  readonly supportsWebhooks = true
  readonly supportsRealTimeSync = true
  readonly rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: 120,
    maxRequestsPerHour: 7200,
    retryAfterMs: 60000
  }

  private client: AxiosInstance | null = null
  private currentAccessToken: string | null = null
  private storedRefreshToken: string | null = null
  private tokenExpiry: Date | null = null
  private requestCount = 0
  private requestCountResetTime = Date.now()

  /**
   * Get OAuth authorization URL for user consent
   */
  static getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    state: string,
    scope?: string
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: scope || 'reservations.read reservations.manage inventory.read folios.read folios.manage'
    })
    return `${APALEO_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens (Authorization Code Flow)
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    try {
      const response = await axios.post(
        APALEO_OAUTH_URL,
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
      console.error('[Apaleo] OAuth token exchange failed:', error)
      throw new Error(`OAuth token exchange failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get access token using Client Credentials Flow (for app-only access)
   */
  static async getClientCredentialsToken(
    clientId: string,
    clientSecret: string,
    scope?: string
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const response = await axios.post(
        APALEO_OAUTH_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: scope || 'reservations.read inventory.read'
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
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    } catch (error) {
      console.error('[Apaleo] Client credentials token failed:', error)
      throw new Error(`Client credentials token failed: ${(error as Error).message}`)
    }
  }

  /**
   * Initialize Apaleo API client
   */
  private initializeClient(config: PMSConnectionConfig): void {
    if (!config.accessToken) {
      throw new Error('Apaleo requires an access token')
    }

    this.currentAccessToken = config.accessToken
    this.storedRefreshToken = config.refreshToken || null
    this.tokenExpiry = config.tokenExpiresAt || null

    this.client = axios.create({
      baseURL: config.endpoint || APALEO_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.currentAccessToken}`
      },
      timeout: 30000
    })

    // Request interceptor for rate limiting and token refresh
    this.client.interceptors.request.use(async (requestConfig) => {
      // Check if token needs refresh
      if (this.tokenExpiry && new Date() >= new Date(this.tokenExpiry.getTime() - 300000)) {
        console.warn('[Apaleo] Token expiring soon, should refresh before request')
      }

      await this.enforceRateLimit()
      
      // Update authorization header if token changed
      if (requestConfig.headers && this.currentAccessToken) {
        requestConfig.headers['Authorization'] = `Bearer ${this.currentAccessToken}`
      }
      
      return requestConfig
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const pmsError: PMSError = {
          entityType: 'Connection',
          operation: 'READ',
          errorCode: error.response?.status?.toString() || 'UNKNOWN',
          errorMessage: error.response?.data?.message || error.message,
          timestamp: new Date(),
          retryable: error.response?.status >= 500
        }

        // Handle 401 Unauthorized (token expired)
        if (error.response?.status === 401) {
          pmsError.errorCode = 'TOKEN_EXPIRED'
          pmsError.errorMessage = 'Access token expired, refresh required'
        }

        throw pmsError
      }
    )
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceReset = now - this.requestCountResetTime

    if (timeSinceReset >= 60000) {
      this.requestCount = 0
      this.requestCountResetTime = now
    }

    if (this.requestCount >= this.rateLimit.maxRequestsPerMinute) {
      const waitTime = 60000 - timeSinceReset
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.requestCountResetTime = Date.now()
    }

    this.requestCount++
  }

  /**
   * Refresh OAuth access token
   */
  async refreshToken(config: PMSConnectionConfig): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: Date
  }> {
    if (!this.storedRefreshToken && !config.refreshToken) {
      throw new Error('No refresh token available')
    }

    const refreshToken = this.storedRefreshToken || config.refreshToken!

    try {
      const response = await axios.post(
        APALEO_OAUTH_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId!,
          client_secret: config.clientSecret!
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      const data = response.data
      const result = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }

      // Update internal state
      this.currentAccessToken = result.accessToken
      this.storedRefreshToken = result.refreshToken
      this.tokenExpiry = result.expiresAt

      return result
    } catch (error) {
      console.error('[Apaleo] Token refresh failed:', error)
      throw new Error(`Token refresh failed: ${(error as Error).message}`)
    }
  }

  /**
   * Test connection to Apaleo PMS
   */
  async testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult> {
    if (!config.accessToken) {
      throw new Error('Apaleo requires an access token')
    }

    try {
      this.initializeClient(config)

      const propertyId = config.metadata?.propertyId || config.hotelId

      const response = await this.client!.get(`/inventory/v1/properties/${propertyId}`)
      const property: ApaleoProperty = response.data

      return {
        success: true,
        message: `Connected to Apaleo - ${property.name}`,
        details: {
          hotelInfo: {
            name: property.name,
            propertyId: property.id
          },
          features: ['OAuth2', 'REST API', 'Real-time sync']
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        errors: [error.message]
      }
    }
  }

  /**
   * Connect to Apaleo PMS
   */
  async connect(config: PMSConnectionConfig): Promise<void> {
    this.initializeClient(config)

    // Proactively refresh token if expiring soon
    if (this.tokenExpiry && new Date() >= new Date(this.tokenExpiry.getTime() - 300000)) {
      if (this.storedRefreshToken || config.refreshToken) {
        try {
          await this.refreshToken(config)
        } catch (error) {
          console.error('[Apaleo] Failed to refresh token on connect:', error)
        }
      }
    }

    const testResult = await this.testConnection(config)
    if (!testResult.success) {
      throw new Error(`Failed to connect to Apaleo: ${testResult.message}`)
    }
  }

  /**
   * Disconnect from Apaleo PMS
   */
  async disconnect(hotelId: string): Promise<void> {
    this.client = null
    this.currentAccessToken = null
    this.storedRefreshToken = null
    this.tokenExpiry = null
    this.requestCount = 0
  }

  /**
   * Sync rooms (units) from Apaleo
   */
  async syncRooms(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoom[]> {
    try {
      const propertyId = config.metadata?.propertyId || hotelId

      const response = await this.client!.get(`/inventory/v1/units`, {
        params: { propertyId }
      })

      const units: ApaleoUnit[] = response.data.units || []

      return units.map((unit: ApaleoUnit) => ({
        externalId: unit.id,
        roomNumber: unit.name,
        roomTypeId: unit.unitGroupId,
        status: this.mapRoomStatus(unit.status),
        isActive: unit.status !== 'OutOfService',
        maxOccupancy: unit.maxPersons,
        metadata: {
          apaleoStatus: unit.status,
          condition: unit.condition,
          description: unit.description
        }
      }))
    } catch (error: any) {
      const statusCode = error.response?.status?.toString() || error.errorCode || 'UNKNOWN'
      const pmsError: PMSError = {
        entityType: 'Connection',
        operation: 'READ',
        errorCode: statusCode,
        errorMessage: error.response?.data?.message || error.message,
        timestamp: new Date(),
        retryable: error.response?.status ? error.response.status >= 500 : false
      }

      if (error.response?.status === 401) {
        pmsError.errorCode = 'TOKEN_EXPIRED'
        pmsError.errorMessage = 'Access token expired, refresh required'
      }

      throw pmsError
    }
  }

  /**
   * Sync room types (unit groups) from Apaleo
   */
  async syncRoomTypes(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoomType[]> {
    const propertyId = config.metadata?.propertyId || hotelId

    const response = await this.client!.get(`/inventory/v1/unit-groups`, {
      params: { propertyId }
    })

    const unitGroups: ApaleoUnitGroup[] = response.data.unitGroups || []

    return unitGroups.map((group: ApaleoUnitGroup) => ({
      externalId: group.id,
      code: group.code,
      name: group.name,
      description: group.description,
      maxAdults: group.maxPersons,
      maxChildren: 0,
      metadata: {
        rank: group.rank
      }
    }))
  }

  /**
   * Sync bookings (reservations) from Apaleo
   */
  async syncBookings(
    hotelId: string,
    config: PMSConnectionConfig,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ExternalBooking[]> {
    const propertyId = config.metadata?.propertyId || hotelId

    const params: any = { propertyIds: propertyId }
    if (dateFrom) params.from = dateFrom.toISOString().split('T')[0]
    if (dateTo) params.to = dateTo.toISOString().split('T')[0]

    const response = await this.client!.get(`/booking/v1/reservations`, {
      params
    })

    const reservations: ApaleoReservation[] = response.data.reservations || []

    return reservations.map((reservation: ApaleoReservation) => ({
      externalId: reservation.id,
      confirmationNumber: reservation.bookingId,
      guestId: reservation.primaryGuest.id,
      roomId: reservation.unitId,
      roomTypeId: reservation.unitGroupId,
      status: this.mapBookingStatus(reservation.status),
      checkInDate: new Date(reservation.arrival),
      checkOutDate: new Date(reservation.departure),
      numberOfGuests: reservation.adults + reservation.childrenAges.length,
      adults: reservation.adults,
      children: reservation.childrenAges.length,
      totalAmount: reservation.totalGrossAmount.amount,
      currency: reservation.totalGrossAmount.currency,
      metadata: {
        bookingId: reservation.bookingId,
        blockId: reservation.blockId,
        childrenAges: reservation.childrenAges,
        apaleoStatus: reservation.status
      }
    }))
  }

  /**
   * Sync guests from Apaleo
   */
  async syncGuests(hotelId: string, config: PMSConnectionConfig): Promise<ExternalGuest[]> {
    const propertyId = config.metadata?.propertyId || hotelId

    // Apaleo doesn't have a direct "list all guests" endpoint
    // We get guests through reservations
    const bookings = await this.syncBookings(hotelId, config)
    
    const guestMap = new Map<string, ExternalGuest>()

    for (const booking of bookings) {
      if (booking.guestId && !guestMap.has(booking.guestId)) {
        try {
          const response = await this.client!.get(`/booking/v1/accounts/${booking.guestId}`)
          const guest: ApaleoGuest = response.data

          guestMap.set(booking.guestId, {
            externalId: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            nationality: guest.nationalityCountryCode,
            dateOfBirth: guest.birthDate ? new Date(guest.birthDate) : undefined,
            metadata: {
              title: guest.title,
              gender: guest.gender,
              address: guest.address
            }
          })
        } catch (error) {
          console.error(`[Apaleo] Failed to fetch guest ${booking.guestId}:`, error)
        }
      }
    }

    return Array.from(guestMap.values())
  }

  /**
   * Sync folios from Apaleo
   */
  async syncFolios(hotelId: string, config: PMSConnectionConfig): Promise<ExternalFolio[]> {
    const propertyId = config.metadata?.propertyId || hotelId

    const response = await this.client!.get(`/finance/v1/folios`, {
      params: { propertyId }
    })

    const folios: ApaleoFolio[] = response.data.folios || []

    return folios.map((folio: ApaleoFolio) => ({
      externalId: folio.id,
      bookingId: folio.reservationId,
      guestId: folio.guestId || 'unknown',
      status: folio.isClosed ? 'CLOSED' as const : 'OPEN' as const,
      balance: folio.balance.amount,
      currency: folio.balance.currency,
      charges: folio.charges.map(charge => ({
        externalId: charge.id,
        folioId: folio.id,
        chargedAt: new Date(charge.date),
        description: charge.name,
        amount: charge.amount.amount,
        currency: charge.amount.currency
      })),
      payments: folio.payments.map(payment => ({
        externalId: payment.id,
        folioId: folio.id,
        paidAt: new Date(payment.date),
        method: this.mapPaymentMethod(payment.method),
        amount: payment.amount.amount,
        currency: payment.amount.currency
      })),
      openedAt: new Date()
    }))
  }

  /**
   * Create booking (reservation) in Apaleo
   */
  async createBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    booking: ExternalBooking
  ): Promise<string> {
    const propertyId = config.metadata?.propertyId || hotelId

    const adults = booking.metadata?.adults ?? booking.numberOfGuests ?? 1
    const children = booking.metadata?.children ?? 0
    const roomTypeId = booking.metadata?.roomTypeId || booking.roomId

    const payload = {
      propertyId,
      arrival: booking.checkInDate.toISOString().split('T')[0],
      departure: booking.checkOutDate.toISOString().split('T')[0],
      adults,
      childrenAges: children ? new Array(children).fill(0) : [],
      channelCode: 'Direct',
      primaryGuest: {
        title: booking.metadata?.title || 'Mr',
        firstName: booking.metadata?.firstName || 'Guest',
        lastName: booking.metadata?.lastName || 'Guest',
        email: booking.metadata?.email,
        phone: booking.metadata?.phone
      },
      unitGroupId: roomTypeId,
      timeSlices: [
        {
          from: booking.checkInDate.toISOString().split('T')[0],
          to: booking.checkOutDate.toISOString().split('T')[0],
          unitGroupId: roomTypeId,
          ratePlanId: booking.metadata?.ratePlanId || 'BAR'
        }
      ]
    }

    const response = await this.client!.post('/booking/v1/reservations', payload)
    return response.data.id
  }

  /**
   * Update booking (reservation) in Apaleo using JSON Patch
   */
  async updateBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    externalId: string,
    booking: Partial<ExternalBooking>
  ): Promise<void> {
    const patches: any[] = []

    if (booking.checkInDate) {
      patches.push({
        op: 'replace',
        path: '/arrival',
        value: booking.checkInDate.toISOString().split('T')[0]
      })
    }

    if (booking.checkOutDate) {
      patches.push({
        op: 'replace',
        path: '/departure',
        value: booking.checkOutDate.toISOString().split('T')[0]
      })
    }

    if (booking.metadata?.adults) {
      patches.push({
        op: 'replace',
        path: '/adults',
        value: booking.metadata.adults
      })
    }

    if (booking.roomId) {
      patches.push({
        op: 'replace',
        path: '/unitId',
        value: booking.roomId
      })
    }

    if (patches.length > 0) {
      await this.client!.patch(`/booking/v1/reservations/${externalId}`, patches, {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      })
    }
  }

  /**
   * Cancel booking (reservation) in Apaleo
   */
  async cancelBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    externalId: string
  ): Promise<void> {
    await this.client!.put(`/booking/v1/reservations/${externalId}/cancel`)
  }

  /**
   * Check in guest in Apaleo
   */
  async checkIn(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string,
    roomId: string
  ): Promise<void> {
    await this.client!.put(`/booking/v1/reservations/${bookingId}/check-in`, {
      unitId: roomId
    })
  }

  /**
   * Check out guest in Apaleo
   */
  async checkOut(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string
  ): Promise<void> {
    await this.client!.put(`/booking/v1/reservations/${bookingId}/check-out`)
  }

  /**
   * Post charge to folio in Apaleo
   */
  async postCharge(
    hotelId: string,
    config: PMSConnectionConfig,
    folioId: string,
    charge: Omit<ExternalFolioCharge, 'externalId' | 'folioId'>
  ): Promise<string> {
    const response = await this.client!.post(`/finance/v1/folios/${folioId}/charges`, {
      name: charge.description,
      amount: {
        amount: charge.amount,
        currency: charge.currency || 'USD'
      },
      quantity: 1,
      date: charge.chargedAt.toISOString().split('T')[0]
    })

    return response.data.id
  }

  /**
   * Post payment to folio in Apaleo
   */
  async postPayment(
    hotelId: string,
    config: PMSConnectionConfig,
    folioId: string,
    payment: Omit<ExternalFolioPayment, 'externalId' | 'folioId'>
  ): Promise<string> {
    const response = await this.client!.post(`/finance/v1/folios/${folioId}/payments`, {
      method: this.mapPaymentMethodToApaleo(payment.method),
      amount: {
        amount: payment.amount,
        currency: payment.currency || 'USD'
      },
      date: payment.paidAt.toISOString().split('T')[0]
    })

    return response.data.id
  }

  /**
   * Update room status in Apaleo
   */
  async updateRoomStatus(
    hotelId: string,
    config: PMSConnectionConfig,
    roomId: string,
    status: ExternalRoom['status']
  ): Promise<void> {
    await this.client!.patch(`/inventory/v1/units/${roomId}`, [
      {
        op: 'replace',
        path: '/status',
        value: this.mapRoomStatusToApaleo(status)
      }
    ], {
      headers: {
        'Content-Type': 'application/json-patch+json'
      }
    })
  }

  /**
   * Assign room to reservation in Apaleo
   */
  async assignRoom(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string,
    roomId: string
  ): Promise<void> {
    await this.client!.put(`/booking/v1/reservations/${bookingId}/assign`, {
      unitId: roomId
    })
  }

  /**
   * Verify webhook signature (Apaleo uses custom header)
   */
  verifyWebhook(payload: any, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    const expectedSignature = hmac.digest('hex')
    return signature === expectedSignature
  }

  /**
   * Map Apaleo room status to standard status
   */
  private mapRoomStatus(apaleoStatus: ApaleoUnit['status']): ExternalRoom['status'] {
    const statusMap: Record<ApaleoUnit['status'], ExternalRoom['status']> = {
      'Clean': 'AVAILABLE',
      'CleanToBeInspected': 'AVAILABLE',
      'Dirty': 'DIRTY',
      'OutOfService': 'OUT_OF_ORDER',
      'OutOfOrder': 'OUT_OF_ORDER'
    }
    return statusMap[apaleoStatus] || 'DIRTY'
  }

  /**
   * Map standard room status to Apaleo status
   */
  private mapRoomStatusToApaleo(status: ExternalRoom['status']): ApaleoUnit['status'] {
    const statusMap: Record<ExternalRoom['status'], ApaleoUnit['status']> = {
      'AVAILABLE': 'Clean',
      'OCCUPIED': 'Dirty',
      'DIRTY': 'Dirty',
      'MAINTENANCE': 'OutOfService',
      'OUT_OF_ORDER': 'OutOfOrder'
    }
    return statusMap[status] || 'Dirty'
  }

  /**
   * Map Apaleo reservation status to standard status
   */
  private mapBookingStatus(apaleoStatus: ApaleoReservation['status']): ExternalBooking['status'] {
    const statusMap: Record<ApaleoReservation['status'], ExternalBooking['status']> = {
      'Confirmed': 'CONFIRMED',
      'InHouse': 'CHECKED_IN',
      'CheckedOut': 'CHECKED_OUT',
      'Canceled': 'CANCELED',
      'NoShow': 'NO_SHOW'
    }
    return statusMap[apaleoStatus] || 'CONFIRMED'
  }

  /**
   * Map payment method to standard format
   */
  private mapPaymentMethod(method: string): ExternalFolioPayment['method'] {
    const methodMap: Record<string, ExternalFolioPayment['method']> = {
      'Cash': 'CASH',
      'CreditCard': 'CARD',
      'DebitCard': 'CARD',
      'BankTransfer': 'TRANSFER',
      'Invoice': 'OTHER'
    }
    return methodMap[method] || 'OTHER'
  }

  /**
   * Map standard payment method to Apaleo format
   */
  private mapPaymentMethodToApaleo(method: ExternalFolioPayment['method']): string {
    const methodMap: Record<ExternalFolioPayment['method'], string> = {
      'CASH': 'Cash',
      'CARD': 'CreditCard',
      'TRANSFER': 'BankTransfer',
      'OTHER': 'Invoice'
    }
    return methodMap[method] || 'Cash'
  }
}
