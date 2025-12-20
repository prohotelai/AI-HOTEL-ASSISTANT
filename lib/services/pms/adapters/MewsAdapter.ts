/**
 * Mews PMS Adapter - Phase 9
 * Real implementation for Mews Systems REST API
 * 
 * Mews API Documentation: https://mews-systems.gitbook.io/connector-api/
 * Authentication: Token-based (clientToken + accessToken)
 * Rate Limit: 300 requests/minute
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
  ExternalHousekeepingTask,
  RateLimitConfig,
  PMSError
} from './PMSAdapterInterface'

/**
 * Mews API base URL
 */
const MEWS_API_BASE_URL = 'https://api.mews.com'

/**
 * Mews-specific types
 */
interface MewsServiceResponse {
  Services: Array<{
    Id: string
    Name: string
    IsActive: boolean
  }>
}

interface MewsResourceCategory {
  Id: string
  Names: Record<string, string>
  Capacity: number
  Description?: Record<string, string>
}

interface MewsResource {
  Id: string
  Name: string
  ResourceCategoryId: string
  FloorNumber?: number
  State: 'Clean' | 'Dirty' | 'OutOfOrder' | 'OutOfService'
  IsActive: boolean
}

interface MewsReservation {
  Id: string
  Number: string
  State: 'Confirmed' | 'Started' | 'Processed' | 'Canceled' | 'Optional'
  CustomerId: string
  AssignedResourceId?: string
  StartUtc: string
  EndUtc: string
  ActualStartUtc?: string
  ActualEndUtc?: string
  AdultCount: number
  ChildCount: number
  TotalAmount?: {
    Currency: string
    Net: number
    Gross: number
  }
}

interface MewsCustomer {
  Id: string
  FirstName: string
  LastName: string
  Title?: string
  Email?: string
  Phone?: string
  NationalityCode?: string
  BirthDate?: string
  Classifications: string[]
  Options: string[]
}

interface MewsAccountingItem {
  Id: string
  AccountId: string
  Amount: {
    Currency: string
    Net: number
    Tax: number
    Gross: number
  }
  Name: string
  ConsumptionUtc: string
  ClosedUtc?: string
  Type: 'Payment' | 'ServiceRevenue' | 'ProductRevenue'
}

/**
 * Mews PMS Adapter Implementation
 */
export class MewsAdapter extends BasePMSAdapter {
  readonly vendor = PMSVendor.MEWS
  readonly authType = PMSAuthType.TOKEN
  readonly supportsWebhooks = true
  readonly supportsRealTimeSync = true
  readonly rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: 300,
    maxRequestsPerHour: 15000,
    retryAfterMs: 60000
  }

  private client: AxiosInstance | null = null
  private requestCount = 0
  private requestCountResetTime = Date.now()

  /**
   * Initialize Mews API client
   */
  private initializeClient(config: PMSConnectionConfig): void {
    if (!config.clientId || !config.accessToken) {
      throw new Error('Mews requires both clientToken and accessToken')
    }

    this.client = axios.create({
      baseURL: config.endpoint || MEWS_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': config.clientId,
        'Access-Token': config.accessToken
      },
      timeout: 30000
    })

    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit()
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait and retry
          const retryAfter = error.response.headers['retry-after'] || 60
          console.warn(`[Mews] Rate limit exceeded, retrying after ${retryAfter}s`)
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
        console.log(`[Mews] Rate limit reached, waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.requestCount = 0
        this.requestCountResetTime = Date.now()
      }
    }

    this.requestCount++
  }

  /**
   * Test connection to Mews API
   */
  async testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult> {
    try {
      this.initializeClient(config)

      // Test with getServices call
      const response = await this.client!.post('/api/connector/v1/services/getAll', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken
      })

      const data: MewsServiceResponse = response.data

      if (!data.Services || data.Services.length === 0) {
        return {
          success: false,
          message: 'No services found - check if property is properly configured',
          errors: ['No services found in Mews property'],
          suggestions: [
            'Verify the property has at least one active service',
            'Check if tokens have access to this property',
            'Contact Mews support to configure services'
          ]
        }
      }

      const activeService = data.Services.find(s => s.IsActive)

      return {
        success: true,
        message: 'Successfully connected to Mews PMS',
        details: {
          version: 'Connector API v1',
          features: [
            'Real-time reservation sync',
            'Guest profile management',
            'Billing integration',
            'Housekeeping automation',
            'Webhook support for instant updates'
          ],
          limitations: [
            'Rate limit: 300 requests/minute',
            'Historical data limited to 2 years',
            'Some fields may require additional permissions'
          ],
          hotelInfo: {
            name: activeService?.Name,
            propertyId: activeService?.Id
          }
        }
      }
    } catch (error) {
      console.error('[Mews] Connection test failed:', error)
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Authentication failed',
            errors: ['Invalid ClientToken or AccessToken'],
            suggestions: [
              'Verify ClientToken and AccessToken are correct',
              'Check if tokens have not expired',
              'Ensure tokens have proper permissions',
              'Regenerate tokens in Mews Connector Integration settings'
            ]
          }
        }

        if (error.response?.status === 403) {
          return {
            success: false,
            message: 'Access denied',
            errors: ['Insufficient permissions'],
            suggestions: [
              'Verify tokens have Connector Integration permissions',
              'Check if IP whitelist is configured correctly',
              'Contact Mews support to grant necessary permissions'
            ]
          }
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Cannot reach Mews API',
            errors: ['Network connection failed'],
            suggestions: [
              'Check internet connectivity',
              'Verify firewall allows outbound HTTPS to api.mews.com',
              'Check if Mews API is experiencing downtime'
            ]
          }
        }
      }

      return {
        success: false,
        message: 'Connection test failed',
        errors: [(error as Error).message],
        suggestions: [
          'Verify all credentials are correct',
          'Check Mews API status at status.mews.com',
          'Contact support with error details'
        ]
      }
    }
  }

  /**
   * Connect to Mews (initialize client)
   */
  async connect(config: PMSConnectionConfig): Promise<void> {
    this.initializeClient(config)
    console.log(`[Mews] Connected for hotel ${config.hotelId}`)
  }

  /**
   * Disconnect from Mews
   */
  async disconnect(hotelId: string): Promise<void> {
    this.client = null
    this.requestCount = 0
    console.log(`[Mews] Disconnected for hotel ${hotelId}`)
  }

  /**
   * Sync rooms from Mews
   */
  async syncRooms(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoom[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      // Get all resources (rooms)
      const response = await this.client!.post('/api/connector/v1/resources/getAll', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        ServiceIds: [], // Empty = all services
        Extent: {
          Resources: true,
          ResourceCategories: false
        }
      })

      const resources: MewsResource[] = response.data.Resources || []

      return resources.map(resource => ({
        externalId: resource.Id,
        roomNumber: resource.Name,
        roomTypeId: resource.ResourceCategoryId,
        floor: resource.FloorNumber,
        status: this.mapMewsRoomStatus(resource.State),
        isActive: resource.IsActive,
        features: [],
        metadata: {
          mewsState: resource.State
        }
      }))
    } catch (error) {
      console.error('[Mews] Failed to sync rooms:', error)
      throw this.handleSyncError('Room', 'READ', error)
    }
  }

  /**
   * Sync room types from Mews
   */
  async syncRoomTypes(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoomType[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      // Get all resource categories (room types)
      const response = await this.client!.post('/api/connector/v1/resources/getAllResourceCategories', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken
      })

      const categories: MewsResourceCategory[] = response.data.ResourceCategories || []

      return categories.map(category => ({
        externalId: category.Id,
        name: category.Names['en-US'] || Object.values(category.Names)[0] || 'Unknown',
        code: category.Id.substring(0, 8),
        description: category.Description?.['en-US'] || category.Description?.[Object.keys(category.Description)[0]],
        maxOccupancy: category.Capacity,
        amenities: [],
        metadata: {
          mewsNames: category.Names,
          mewsDescription: category.Description
        }
      }))
    } catch (error) {
      console.error('[Mews] Failed to sync room types:', error)
      throw this.handleSyncError('RoomType', 'READ', error)
    }
  }

  /**
   * Sync bookings from Mews
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
      const startUtc = dateFrom?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const endUtc = dateTo?.toISOString() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      // Get all reservations in date range
      const response = await this.client!.post('/api/connector/v1/reservations/getAll', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        TimeFilter: {
          StartUtc: startUtc,
          EndUtc: endUtc
        },
        Extent: {
          Reservations: true,
          ReservationGroups: false,
          Customers: false
        }
      })

      const reservations: MewsReservation[] = response.data.Reservations || []

      return reservations.map(reservation => ({
        externalId: reservation.Id,
        guestId: reservation.CustomerId,
        roomId: reservation.AssignedResourceId,
        confirmationNumber: reservation.Number,
        status: this.mapMewsReservationStatus(reservation.State),
        checkInDate: new Date(reservation.StartUtc),
        checkOutDate: new Date(reservation.EndUtc),
        actualCheckIn: reservation.ActualStartUtc ? new Date(reservation.ActualStartUtc) : undefined,
        actualCheckOut: reservation.ActualEndUtc ? new Date(reservation.ActualEndUtc) : undefined,
        numberOfGuests: reservation.AdultCount + reservation.ChildCount,
        totalAmount: reservation.TotalAmount?.Gross,
        currency: reservation.TotalAmount?.Currency,
        metadata: {
          mewsState: reservation.State,
          adults: reservation.AdultCount,
          children: reservation.ChildCount
        }
      }))
    } catch (error) {
      console.error('[Mews] Failed to sync bookings:', error)
      throw this.handleSyncError('Booking', 'READ', error)
    }
  }

  /**
   * Sync guests from Mews
   */
  async syncGuests(hotelId: string, config: PMSConnectionConfig): Promise<ExternalGuest[]> {
    if (!this.client) {
      this.initializeClient(config)
    }

    try {
      // Get all customers (note: Mews has rate limits on customer queries)
      const response = await this.client!.post('/api/connector/v1/customers/getAll', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        Extent: {
          Customers: true,
          Addresses: false,
          Files: false
        }
      })

      const customers: MewsCustomer[] = response.data.Customers || []

      return customers.map(customer => ({
        externalId: customer.Id,
        firstName: customer.FirstName,
        lastName: customer.LastName,
        email: customer.Email,
        phone: customer.Phone,
        nationality: customer.NationalityCode,
        dateOfBirth: customer.BirthDate ? new Date(customer.BirthDate) : undefined,
        vipStatus: customer.Classifications.includes('VIP'),
        preferences: customer.Options || [],
        metadata: {
          mewsTitle: customer.Title,
          mewsClassifications: customer.Classifications
        }
      }))
    } catch (error) {
      console.error('[Mews] Failed to sync guests:', error)
      throw this.handleSyncError('Guest', 'READ', error)
    }
  }

  /**
   * Create booking in Mews
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
      const response = await this.client!.post('/api/connector/v1/reservations/addReservations', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        Reservations: [{
          StartUtc: booking.checkInDate.toISOString(),
          EndUtc: booking.checkOutDate.toISOString(),
          CustomerId: booking.guestId,
          ResourceId: booking.roomId,
          State: 'Confirmed',
          AdultCount: booking.numberOfGuests
        }]
      })

      const reservationIds = response.data.Reservations?.map((r: any) => r.Id) || []
      return reservationIds[0] || ''
    } catch (error) {
      console.error('[Mews] Failed to create booking:', error)
      throw this.handleSyncError('Booking', 'CREATE', error)
    }
  }

  /**
   * Update booking in Mews
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
      await this.client!.post('/api/connector/v1/reservations/updateReservation', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        ReservationId: externalId,
        StartUtc: booking.checkInDate?.toISOString(),
        EndUtc: booking.checkOutDate?.toISOString(),
        ResourceId: booking.roomId,
        State: booking.status ? this.mapToMewsReservationStatus(booking.status) : undefined
      })
    } catch (error) {
      console.error('[Mews] Failed to update booking:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Cancel booking in Mews
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
      await this.client!.post('/api/connector/v1/reservations/cancelReservation', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        ReservationId: externalId,
        ChargeCancellationFee: true
      })
    } catch (error) {
      console.error('[Mews] Failed to cancel booking:', error)
      throw this.handleSyncError('Booking', 'DELETE', error)
    }
  }

  /**
   * Check in guest in Mews
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
      await this.client!.post('/api/connector/v1/reservations/startReservation', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        ReservationId: bookingId
      })
    } catch (error) {
      console.error('[Mews] Failed to check in:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Check out guest in Mews
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
      await this.client!.post('/api/connector/v1/reservations/processReservation', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        ReservationId: bookingId,
        CloseBills: true
      })
    } catch (error) {
      console.error('[Mews] Failed to check out:', error)
      throw this.handleSyncError('Booking', 'UPDATE', error)
    }
  }

  /**
   * Update room status in Mews
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
      await this.client!.post('/api/connector/v1/resources/updateResourceState', {
        ClientToken: config.clientId,
        AccessToken: config.accessToken,
        ResourceId: roomId,
        State: this.mapToMewsRoomStatus(status)
      })
    } catch (error) {
      console.error('[Mews] Failed to update room status:', error)
      throw this.handleSyncError('Room', 'UPDATE', error)
    }
  }

  /**
   * Map Mews room state to standard status
   */
  private mapMewsRoomStatus(state: MewsResource['State']): ExternalRoom['status'] {
    switch (state) {
      case 'Clean':
        return 'AVAILABLE'
      case 'Dirty':
        return 'DIRTY'
      case 'OutOfOrder':
      case 'OutOfService':
        return 'OUT_OF_ORDER'
      default:
        return 'AVAILABLE'
    }
  }

  /**
   * Map standard status to Mews room state
   */
  private mapToMewsRoomStatus(status: ExternalRoom['status']): MewsResource['State'] {
    switch (status) {
      case 'AVAILABLE':
        return 'Clean'
      case 'DIRTY':
        return 'Dirty'
      case 'OUT_OF_ORDER':
      case 'MAINTENANCE':
        return 'OutOfOrder'
      default:
        return 'Clean'
    }
  }

  /**
   * Map Mews reservation state to standard status
   */
  private mapMewsReservationStatus(state: MewsReservation['State']): ExternalBooking['status'] {
    switch (state) {
      case 'Confirmed':
      case 'Optional':
        return 'CONFIRMED'
      case 'Started':
        return 'CHECKED_IN'
      case 'Processed':
        return 'CHECKED_OUT'
      case 'Canceled':
        return 'CANCELED'
      default:
        return 'CONFIRMED'
    }
  }

  /**
   * Map standard status to Mews reservation state
   */
  private mapToMewsReservationStatus(status: ExternalBooking['status']): MewsReservation['State'] {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed'
      case 'CHECKED_IN':
        return 'Started'
      case 'CHECKED_OUT':
        return 'Processed'
      case 'CANCELED':
        return 'Canceled'
      default:
        return 'Confirmed'
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
    return new Error(`Mews ${operation} ${entityType} failed: ${pmsError.errorMessage}`)
  }
}
