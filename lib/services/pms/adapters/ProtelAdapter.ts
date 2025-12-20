/**
 * Protel PMS Adapter - Phase 9 Block 3
 * Real implementation for Protel SOAP/XML API
 * 
 * Protel API Documentation: SOAP-based XML interface
 * Authentication: Basic Auth (username/password)
 * Rate Limit: 60 requests/minute
 */

import axios, { AxiosInstance } from 'axios'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
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
 * Protel SOAP namespace
 */
const PROTEL_SOAP_NS = 'http://www.protel.net/webservice/'

/**
 * Protel-specific types
 */
interface ProtelSystemInfo {
  Version: string
  HotelId: string
  HotelName: string
}

interface ProtelRoom {
  RoomNumber: string
  RoomTypeCode: string
  FloorNumber?: number
  Status: 'Clean' | 'Dirty' | 'OutOfOrder' | 'OutOfService' | 'Inspected'
  IsActive: boolean
  MaxOccupancy?: number
}

interface ProtelRoomType {
  Code: string
  Name: string
  Description?: string
  MaxAdults: number
  MaxChildren: number
  BasePrice?: number
}

interface ProtelReservation {
  ReservationNo: string
  Status: 'Confirmed' | 'InHouse' | 'CheckedOut' | 'Canceled' | 'NoShow'
  GuestId: string
  RoomNumber?: string
  ArrivalDate: string
  DepartureDate: string
  Adults: number
  Children: number
  TotalAmount?: number
}

interface ProtelGuest {
  GuestId: string
  FirstName: string
  LastName: string
  Title?: string
  Email?: string
  Phone?: string
  Nationality?: string
  DateOfBirth?: string
}

interface ProtelFolio {
  FolioNo: string
  ReservationNo: string
  GuestId: string
  Balance: number
  Currency: string
  IsClosed: boolean
}

interface ProtelCharge {
  ChargeId: string
  FolioNo: string
  Date: string
  Description: string
  Amount: number
  Quantity: number
}

/**
 * Protel PMS Adapter Implementation
 */
export class ProtelAdapter extends BasePMSAdapter {
  readonly vendor = PMSVendor.PROTEL
  readonly authType = PMSAuthType.BASIC_AUTH
  readonly supportsWebhooks = true
  readonly supportsRealTimeSync = false
  readonly rateLimit: RateLimitConfig = {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 3600,
    retryAfterMs: 60000
  }

  private client: AxiosInstance | null = null
  private xmlParser: XMLParser
  private xmlBuilder: XMLBuilder
  private requestCount = 0
  private requestCountResetTime = Date.now()

  constructor() {
    super()
    
    // Initialize XML parser
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true
    })

    // Initialize XML builder
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true
    })
  }

  /**
   * Initialize Protel API client
   */
  private initializeClient(config: PMSConnectionConfig): void {
    const baseUrl = config.endpoint || 'https://api.protel.net/pms'
    const username = config.metadata?.username || config.apiKey || ''
    const password = config.metadata?.password || config.clientSecret || ''

    if (!username || !password) {
      throw new Error('Protel requires username and password for Basic Auth')
    }

    this.client = axios.create({
      baseURL: baseUrl,
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': PROTEL_SOAP_NS
      },
      timeout: 45000
    })

    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (requestConfig) => {
      await this.enforceRateLimit()
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
          errorMessage: error.message,
          timestamp: new Date(),
          retryable: error.response?.status >= 500
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
   * Build SOAP envelope
   */
  private buildSOAPEnvelope(method: string, params: Record<string, any>): string {
    const envelope = {
      'soap:Envelope': {
        '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
        '@_xmlns:prot': PROTEL_SOAP_NS,
        'soap:Header': {},
        'soap:Body': {
          [`prot:${method}`]: params
        }
      }
    }

    return this.xmlBuilder.build(envelope)
  }

  /**
   * Make SOAP request
   */
  private async soapRequest<T = any>(
    method: string,
    params: Record<string, any>,
    config: PMSConnectionConfig
  ): Promise<T> {
    if (!this.client) {
      this.initializeClient(config)
    }

    const soapEnvelope = this.buildSOAPEnvelope(method, params)

    try {
      const response = await this.client!.post('/soap', soapEnvelope)
      const parsed = this.xmlParser.parse(response.data)
      
      // Navigate SOAP response structure
      const body = parsed['soap:Envelope']?.['soap:Body']
      const result = body?.[`${method}Response`]?.[`${method}Result`]
      
      return result as T
    } catch (error: any) {
      const pmsError: PMSError = {
        entityType: 'SOAP',
        operation: 'READ',
        errorCode: 'SOAP_ERROR',
        errorMessage: `SOAP request failed: ${error.message}`,
        timestamp: new Date(),
        retryable: false
      }
      throw pmsError
    }
  }

  /**
   * Test connection to Protel PMS
   */
  async testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult> {
    try {
      this.initializeClient(config)

      const result = await this.soapRequest<ProtelSystemInfo>('GetSystemInfo', {
        HotelId: config.metadata?.hotelId || config.hotelId
      }, config)

      return {
        success: true,
        message: `Connected to Protel ${result.Version} - ${result.HotelName}`,
        details: {
          version: result.Version,
          hotelInfo: {
            name: result.HotelName,
            propertyId: result.HotelId
          }
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
   * Connect to Protel PMS
   */
  async connect(config: PMSConnectionConfig): Promise<void> {
    this.initializeClient(config)
    
    const testResult = await this.testConnection(config)
    if (!testResult.success) {
      throw new Error(`Failed to connect to Protel: ${testResult.message}`)
    }
  }

  /**
   * Disconnect from Protel PMS
   */
  async disconnect(hotelId: string): Promise<void> {
    this.client = null
    this.requestCount = 0
  }

  /**
   * Sync rooms from Protel
   */
  async syncRooms(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoom[]> {
    const result = await this.soapRequest<{ Room: ProtelRoom[] }>('GetRooms', {
      HotelId: config.metadata?.hotelId || hotelId
    }, config)

    const rooms = Array.isArray(result.Room) ? result.Room : [result.Room]

    return rooms.map((room: ProtelRoom) => ({
      externalId: room.RoomNumber,
      roomNumber: room.RoomNumber,
      roomTypeId: room.RoomTypeCode,
      floor: room.FloorNumber,
      status: this.mapRoomStatus(room.Status),
      isActive: room.IsActive,
      maxOccupancy: room.MaxOccupancy,
      metadata: {
        protelStatus: room.Status
      }
    }))
  }

  /**
   * Sync room types from Protel
   */
  async syncRoomTypes(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoomType[]> {
    const result = await this.soapRequest<{ RoomType: ProtelRoomType[] }>('GetRoomTypes', {
      HotelId: config.metadata?.hotelId || hotelId
    }, config)

    const roomTypes = Array.isArray(result.RoomType) ? result.RoomType : [result.RoomType]

    return roomTypes.map((type: ProtelRoomType) => ({
      externalId: type.Code,
      name: type.Name,
      description: type.Description,
      maxAdults: type.MaxAdults,
      maxChildren: type.MaxChildren,
      basePrice: type.BasePrice,
      metadata: {
        code: type.Code
      }
    }))
  }

  /**
   * Sync bookings from Protel
   */
  async syncBookings(
    hotelId: string,
    config: PMSConnectionConfig,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ExternalBooking[]> {
    const params: any = {
      HotelId: config.metadata?.hotelId || hotelId
    }

    if (dateFrom) {
      params.FromDate = dateFrom.toISOString().split('T')[0]
    }
    if (dateTo) {
      params.ToDate = dateTo.toISOString().split('T')[0]
    }

    const result = await this.soapRequest<{ Reservation: ProtelReservation[] }>(
      'GetReservations',
      params,
      config
    )

    const reservations = Array.isArray(result.Reservation) 
      ? result.Reservation 
      : [result.Reservation]

    return reservations.map((reservation: ProtelReservation) => ({
      externalId: reservation.ReservationNo,
      confirmationNumber: reservation.ReservationNo,
      guestId: reservation.GuestId,
      roomId: reservation.RoomNumber,
      status: this.mapBookingStatus(reservation.Status),
      checkInDate: new Date(reservation.ArrivalDate),
      checkOutDate: new Date(reservation.DepartureDate),
      numberOfGuests: reservation.Adults + reservation.Children,
      adults: reservation.Adults,
      children: reservation.Children,
      totalAmount: reservation.TotalAmount,
      metadata: {
        protelStatus: reservation.Status
      }
    }))
  }

  /**
   * Sync guests from Protel
   */
  async syncGuests(hotelId: string, config: PMSConnectionConfig): Promise<ExternalGuest[]> {
    const result = await this.soapRequest<{ Guest: ProtelGuest[] }>('GetGuests', {
      HotelId: config.metadata?.hotelId || hotelId
    }, config)

    const guests = Array.isArray(result.Guest) ? result.Guest : [result.Guest]

    return guests.map((guest: ProtelGuest) => ({
      externalId: guest.GuestId,
      firstName: guest.FirstName,
      lastName: guest.LastName,
      email: guest.Email || undefined,
      phone: guest.Phone || undefined,
      nationality: guest.Nationality || undefined,
      dateOfBirth: guest.DateOfBirth ? new Date(guest.DateOfBirth) : undefined,
      metadata: {
        title: guest.Title
      }
    }))
  }

  /**
   * Sync folios from Protel
   */
  async syncFolios(hotelId: string, config: PMSConnectionConfig): Promise<ExternalFolio[]> {
    const result = await this.soapRequest<{ Folio: ProtelFolio[] }>('GetFolios', {
      HotelId: config.metadata?.hotelId || hotelId
    }, config)

    const folios = Array.isArray(result.Folio) ? result.Folio : [result.Folio]

    return folios.map((folio: ProtelFolio) => ({
      externalId: folio.FolioNo,
      bookingId: folio.ReservationNo,
      guestId: folio.GuestId,
      status: folio.IsClosed ? 'CLOSED' as const : 'OPEN' as const,
      balance: folio.Balance,
      currency: folio.Currency,
      charges: [],
      payments: [],
      openedAt: new Date()
    }))
  }

  /**
   * Create booking in Protel
   */
  async createBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    booking: ExternalBooking
  ): Promise<string> {
    const params = {
      HotelId: config.metadata?.hotelId || hotelId,
      Reservation: {
        GuestId: booking.guestId,
        RoomNumber: booking.roomId,
        ArrivalDate: booking.checkInDate.toISOString().split('T')[0],
        DepartureDate: booking.checkOutDate.toISOString().split('T')[0],
        Adults: booking.metadata?.adults || Math.floor(booking.numberOfGuests * 0.8) || 1,
        Children: booking.metadata?.children || 0,
        Status: 'Confirmed'
      }
    }

    const result = await this.soapRequest<{ ReservationNo: string }>(
      'CreateReservation',
      params,
      config
    )

    return result.ReservationNo
  }

  /**
   * Update booking in Protel
   */
  async updateBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    externalId: string,
    booking: Partial<ExternalBooking>
  ): Promise<void> {
    const params: any = {
      HotelId: config.metadata?.hotelId || hotelId,
      ReservationNo: externalId,
      Reservation: {}
    }

    if (booking.roomId) params.Reservation.RoomNumber = booking.roomId
    if (booking.checkInDate) {
      params.Reservation.ArrivalDate = booking.checkInDate.toISOString().split('T')[0]
    }
    if (booking.checkOutDate) {
      params.Reservation.DepartureDate = booking.checkOutDate.toISOString().split('T')[0]
    }
    if (booking.metadata?.adults !== undefined) params.Reservation.Adults = booking.metadata.adults
    if (booking.metadata?.children !== undefined) params.Reservation.Children = booking.metadata.children
    if (booking.status) {
      params.Reservation.Status = this.mapBookingStatusToProtel(booking.status)
    }

    await this.soapRequest('UpdateReservation', params, config)
  }

  /**
   * Cancel booking in Protel
   */
  async cancelBooking(
    hotelId: string,
    config: PMSConnectionConfig,
    externalId: string
  ): Promise<void> {
    await this.soapRequest('CancelReservation', {
      HotelId: config.metadata?.hotelId || hotelId,
      ReservationNo: externalId
    }, config)
  }

  /**
   * Check in guest in Protel
   */
  async checkIn(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string,
    roomId: string
  ): Promise<void> {
    await this.soapRequest('CheckIn', {
      HotelId: config.metadata?.hotelId || hotelId,
      ReservationNo: bookingId,
      RoomNumber: roomId
    }, config)
  }

  /**
   * Check out guest in Protel
   */
  async checkOut(
    hotelId: string,
    config: PMSConnectionConfig,
    bookingId: string
  ): Promise<void> {
    await this.soapRequest('CheckOut', {
      HotelId: config.metadata?.hotelId || hotelId,
      ReservationNo: bookingId
    }, config)
  }

  /**
   * Post charge to folio in Protel
   */
  async postCharge(
    hotelId: string,
    config: PMSConnectionConfig,
    folioId: string,
    charge: Omit<ExternalFolioCharge, 'externalId' | 'folioId'>
  ): Promise<string> {
    const result = await this.soapRequest<{ ChargeId: string }>('PostCharge', {
      HotelId: config.metadata?.hotelId || hotelId,
      FolioNo: folioId,
      Charge: {
        Date: charge.chargedAt.toISOString().split('T')[0],
        Description: charge.description,
        Amount: charge.amount,
        Quantity: 1
      }
    }, config)

    return result.ChargeId
  }

  /**
   * Update room status in Protel
   */
  async updateRoomStatus(
    hotelId: string,
    config: PMSConnectionConfig,
    roomId: string,
    status: ExternalRoom['status']
  ): Promise<void> {
    await this.soapRequest('UpdateRoomStatus', {
      HotelId: config.metadata?.hotelId || hotelId,
      RoomNumber: roomId,
      Status: this.mapRoomStatusToProtel(status)
    }, config)
  }

  /**
   * Sync housekeeping tasks from Protel
   */
  async syncHousekeeping(
    hotelId: string,
    config: PMSConnectionConfig
  ): Promise<ExternalHousekeepingTask[]> {
    const result = await this.soapRequest<{ Task: any[] }>('GetHousekeepingTasks', {
      HotelId: config.metadata?.hotelId || hotelId
    }, config)

    const tasks = Array.isArray(result.Task) ? result.Task : [result.Task]

    return tasks.map((task: any) => ({
      externalId: task.TaskId,
      roomId: task.RoomNumber,
      taskType: this.mapHousekeepingTaskType(task.TaskType),
      status: task.Status,
      priority: task.Priority,
      assignedTo: task.AssignedTo,
      scheduledFor: task.DueDate ? new Date(task.DueDate) : undefined
    }))
  }

  /**
   * Verify webhook signature (Protel uses HMAC-SHA256)
   */
  verifyWebhook(payload: any, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    const expectedSignature = hmac.digest('hex')
    return signature === expectedSignature
  }

  /**
   * Map Protel room status to standard status
   */
  private mapRoomStatus(protelStatus: ProtelRoom['Status']): ExternalRoom['status'] {
    const statusMap: Record<ProtelRoom['Status'], ExternalRoom['status']> = {
      'Clean': 'AVAILABLE',
      'Dirty': 'DIRTY',
      'OutOfOrder': 'OUT_OF_ORDER',
      'OutOfService': 'OUT_OF_ORDER',
      'Inspected': 'AVAILABLE'
    }
    return statusMap[protelStatus] || 'DIRTY'
  }

  /**
   * Map standard room status to Protel status
   */
  private mapRoomStatusToProtel(status: ExternalRoom['status']): ProtelRoom['Status'] {
    const statusMap: Record<ExternalRoom['status'], ProtelRoom['Status']> = {
      'AVAILABLE': 'Clean',
      'OCCUPIED': 'Dirty',
      'DIRTY': 'Dirty',
      'MAINTENANCE': 'OutOfService',
      'OUT_OF_ORDER': 'OutOfOrder'
    }
    return statusMap[status] || 'Dirty'
  }

  /**
   * Map Protel booking status to standard status
   */
  private mapBookingStatus(protelStatus: ProtelReservation['Status']): ExternalBooking['status'] {
    const statusMap: Record<ProtelReservation['Status'], ExternalBooking['status']> = {
      'Confirmed': 'CONFIRMED',
      'InHouse': 'CHECKED_IN',
      'CheckedOut': 'CHECKED_OUT',
      'Canceled': 'CANCELED',
      'NoShow': 'NO_SHOW'
    }
    return statusMap[protelStatus] || 'CONFIRMED'
  }

  /**
   * Map standard booking status to Protel status
   */
  private mapBookingStatusToProtel(status: ExternalBooking['status']): ProtelReservation['Status'] {
    const statusMap: Record<ExternalBooking['status'], ProtelReservation['Status']> = {
      'CONFIRMED': 'Confirmed',
      'CHECKED_IN': 'InHouse',
      'CHECKED_OUT': 'CheckedOut',
      'CANCELED': 'Canceled',
      'NO_SHOW': 'NoShow'
    }
    return statusMap[status] || 'Confirmed'
  }

  /**
   * Map housekeeping task type
   */
  private mapHousekeepingTaskType(type: string): ExternalHousekeepingTask['taskType'] {
    const typeMap: Record<string, ExternalHousekeepingTask['taskType']> = {
      'Checkout': 'CHECKOUT_CLEAN',
      'Daily': 'DAILY_CLEAN',
      'Deep': 'DEEP_CLEAN',
      'Turndown': 'TURNDOWN',
      'Inspection': 'INSPECTION'
    }
    return typeMap[type] || 'DAILY_CLEAN'
  }
}
