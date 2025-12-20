/**
 * PMS Adapter Interface - Phase 9
 * Comprehensive interface for all external PMS integrations
 * 
 * This interface ensures consistent CRUD operations across all PMS vendors
 * while maintaining multi-tenant isolation and RBAC enforcement.
 */

import { Prisma } from '@prisma/client'

/**
 * Supported PMS vendors
 */
export enum PMSVendor {
  OPERA = 'OPERA',           // Oracle Opera Cloud
  MEWS = 'MEWS',             // Mews Systems
  CLOUDBEDS = 'CLOUDBEDS',   // Cloudbeds
  PROTEL = 'PROTEL',         // Protel hotelsoftware
  APALEO = 'APALEO',         // Apaleo
  CUSTOM = 'CUSTOM'          // Custom integration
}

/**
 * Authentication type for PMS
 */
export enum PMSAuthType {
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  BASIC_AUTH = 'BASIC_AUTH',
  TOKEN = 'TOKEN'
}

/**
 * Connection status
 */
export enum PMSConnectionStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED',
  SYNCING = 'SYNCING'
}

/**
 * Sync operation type
 */
export enum SyncOperationType {
  FULL = 'FULL',           // Complete data sync
  INCREMENTAL = 'INCREMENTAL',  // Only changed data
  REALTIME = 'REALTIME'    // Webhook-driven real-time updates
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
  EXTERNAL_WINS = 'EXTERNAL_WINS',  // External PMS data takes precedence
  INTERNAL_WINS = 'INTERNAL_WINS',  // SaaS PMS data takes precedence
  MANUAL = 'MANUAL',                // Require manual resolution
  LATEST_WINS = 'LATEST_WINS'       // Most recent timestamp wins
}

/**
 * Connection configuration for adapter
 */
export interface PMSConnectionConfig {
  hotelId: string
  vendor: PMSVendor
  authType: PMSAuthType
  endpoint?: string
  apiKey?: string
  clientId?: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  version?: string
  metadata?: Record<string, any>
}

/**
 * Connection test result
 */
export interface PMSConnectionTestResult {
  success: boolean
  message: string
  details?: {
    version?: string
    features?: string[]
    limitations?: string[]
    hotelInfo?: {
      name?: string
      propertyId?: string
      roomCount?: number
    }
  }
  errors?: string[]
  suggestions?: string[]
}

/**
 * Sync result with detailed statistics
 */
export interface PMSSyncResult {
  success: boolean
  operationType: SyncOperationType
  startedAt: Date
  completedAt: Date
  duration: number // milliseconds
  stats: {
    rooms?: { created: number; updated: number; deleted: number; failed: number }
    roomTypes?: { created: number; updated: number; deleted: number; failed: number }
    bookings?: { created: number; updated: number; deleted: number; failed: number }
    guests?: { created: number; updated: number; deleted: number; failed: number }
    folios?: { created: number; updated: number; deleted: number; failed: number }
    housekeeping?: { created: number; updated: number; deleted: number; failed: number }
    maintenance?: { created: number; updated: number; deleted: number; failed: number }
  }
  conflicts?: PMSConflict[]
  errors?: PMSError[]
}

/**
 * Data conflict between external and internal PMS
 */
export interface PMSConflict {
  entityType: 'Room' | 'Booking' | 'Guest' | 'Folio' | 'RoomType'
  entityId: string
  externalId: string
  field: string
  externalValue: any
  internalValue: any
  resolution: ConflictResolution
  resolvedValue?: any
  resolvedAt?: Date
  resolvedBy?: string
}

/**
 * Sync error details
 */
export interface PMSError {
  entityType: string
  entityId?: string
  externalId?: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ'
  errorCode?: string
  errorMessage: string
  timestamp: Date
  retryable: boolean
  retryCount?: number
}

/**
 * Room data from external PMS
 */
export interface ExternalRoom {
  externalId: string
  roomNumber: string
  roomTypeId: string
  floor?: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'MAINTENANCE' | 'OUT_OF_ORDER'
  isActive: boolean
  features?: string[]
  maxOccupancy?: number
  metadata?: Record<string, any>
}

/**
 * Room type data from external PMS
 */
export interface ExternalRoomType {
  externalId: string
  name: string
  code?: string
  description?: string
  maxOccupancy?: number
  baseRate?: number
  currency?: string
  amenities?: string[]
  metadata?: Record<string, any>
}

/**
 * Booking data from external PMS
 */
export interface ExternalBooking {
  externalId: string
  guestId: string
  roomId?: string
  confirmationNumber: string
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELED' | 'NO_SHOW'
  checkInDate: Date
  checkOutDate: Date
  actualCheckIn?: Date
  actualCheckOut?: Date
  numberOfGuests: number
  totalAmount?: number
  currency?: string
  specialRequests?: string
  metadata?: Record<string, any>
}

/**
 * Guest data from external PMS
 */
export interface ExternalGuest {
  externalId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  nationality?: string
  passportNumber?: string
  dateOfBirth?: Date
  address?: string
  city?: string
  country?: string
  postalCode?: string
  vipStatus?: boolean
  loyaltyNumber?: string
  preferences?: string[]
  metadata?: Record<string, any>
}

/**
 * Folio data from external PMS
 */
export interface ExternalFolio {
  externalId: string
  bookingId: string
  guestId: string
  status: 'OPEN' | 'CLOSED' | 'SETTLED'
  balance: number
  currency?: string
  charges?: ExternalFolioCharge[]
  payments?: ExternalFolioPayment[]
  openedAt: Date
  closedAt?: Date
  metadata?: Record<string, any>
}

/**
 * Folio charge from external PMS
 */
export interface ExternalFolioCharge {
  externalId: string
  folioId: string
  description: string
  amount: number
  currency?: string
  category?: string
  chargedAt: Date
  metadata?: Record<string, any>
}

/**
 * Folio payment from external PMS
 */
export interface ExternalFolioPayment {
  externalId: string
  folioId: string
  amount: number
  currency?: string
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
  paidAt: Date
  metadata?: Record<string, any>
}

/**
 * Housekeeping task from external PMS
 */
export interface ExternalHousekeepingTask {
  externalId: string
  roomId: string
  taskType: 'CHECKOUT_CLEAN' | 'DAILY_CLEAN' | 'DEEP_CLEAN' | 'TURNDOWN' | 'INSPECTION'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assignedTo?: string
  scheduledFor?: Date
  completedAt?: Date
  notes?: string
  metadata?: Record<string, any>
}

/**
 * Maintenance task from external PMS
 */
export interface ExternalMaintenanceTask {
  externalId: string
  roomId?: string
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assignedTo?: string
  reportedAt: Date
  completedAt?: Date
  metadata?: Record<string, any>
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequestsPerMinute: number
  maxRequestsPerHour?: number
  retryAfterMs?: number
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  enabled: boolean
  endpoint: string
  secret?: string
  events: string[]
}

/**
 * Complete PMS Adapter Interface
 * All methods are optional to allow partial implementations
 */
export interface PMSAdapterInterface {
  /**
   * Adapter metadata
   */
  readonly vendor: PMSVendor
  readonly authType: PMSAuthType
  readonly supportsWebhooks: boolean
  readonly supportsRealTimeSync: boolean
  readonly rateLimit: RateLimitConfig

  /**
   * Connection management
   */
  testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult>
  connect(config: PMSConnectionConfig): Promise<void>
  disconnect(hotelId: string): Promise<void>
  refreshToken?(config: PMSConnectionConfig): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }>

  /**
   * Sync operations (READ from external PMS)
   */
  syncRooms?(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoom[]>
  syncRoomTypes?(hotelId: string, config: PMSConnectionConfig): Promise<ExternalRoomType[]>
  syncBookings?(hotelId: string, config: PMSConnectionConfig, dateFrom?: Date, dateTo?: Date): Promise<ExternalBooking[]>
  syncGuests?(hotelId: string, config: PMSConnectionConfig): Promise<ExternalGuest[]>
  syncFolios?(hotelId: string, config: PMSConnectionConfig): Promise<ExternalFolio[]>
  syncHousekeeping?(hotelId: string, config: PMSConnectionConfig): Promise<ExternalHousekeepingTask[]>
  syncMaintenance?(hotelId: string, config: PMSConnectionConfig): Promise<ExternalMaintenanceTask[]>

  /**
   * Write operations (WRITE to external PMS)
   */
  createBooking?(hotelId: string, config: PMSConnectionConfig, booking: ExternalBooking): Promise<string>
  updateBooking?(hotelId: string, config: PMSConnectionConfig, externalId: string, booking: Partial<ExternalBooking>): Promise<void>
  cancelBooking?(hotelId: string, config: PMSConnectionConfig, externalId: string): Promise<void>
  
  checkIn?(hotelId: string, config: PMSConnectionConfig, bookingId: string, roomId: string): Promise<void>
  checkOut?(hotelId: string, config: PMSConnectionConfig, bookingId: string): Promise<void>
  
  postCharge?(hotelId: string, config: PMSConnectionConfig, folioId: string, charge: Omit<ExternalFolioCharge, 'externalId' | 'folioId'>): Promise<string>
  postPayment?(hotelId: string, config: PMSConnectionConfig, folioId: string, payment: Omit<ExternalFolioPayment, 'externalId' | 'folioId'>): Promise<string>
  
  updateRoomStatus?(hotelId: string, config: PMSConnectionConfig, roomId: string, status: ExternalRoom['status']): Promise<void>
  assignRoom?(hotelId: string, config: PMSConnectionConfig, bookingId: string, roomId: string): Promise<void>

  /**
   * Webhook management
   */
  registerWebhook?(hotelId: string, config: PMSConnectionConfig, webhookConfig: WebhookConfig): Promise<string>
  unregisterWebhook?(hotelId: string, config: PMSConnectionConfig, webhookId: string): Promise<void>
  verifyWebhook?(payload: any, signature: string, secret: string): boolean

  /**
   * Conflict resolution
   */
  resolveConflict?(conflict: PMSConflict): Promise<any>

  /**
   * Error handling
   */
  handleError?(error: PMSError): Promise<void>
}

/**
 * Base adapter class with common functionality
 */
export abstract class BasePMSAdapter implements PMSAdapterInterface {
  abstract readonly vendor: PMSVendor
  abstract readonly authType: PMSAuthType
  abstract readonly supportsWebhooks: boolean
  abstract readonly supportsRealTimeSync: boolean
  abstract readonly rateLimit: RateLimitConfig

  abstract testConnection(config: PMSConnectionConfig): Promise<PMSConnectionTestResult>
  abstract connect(config: PMSConnectionConfig): Promise<void>
  abstract disconnect(hotelId: string): Promise<void>

  /**
   * Default error handler
   */
  async handleError(error: PMSError): Promise<void> {
    console.error(`[${this.vendor}] PMS Error:`, {
      entityType: error.entityType,
      entityId: error.entityId,
      operation: error.operation,
      message: error.errorMessage,
      retryable: error.retryable
    })

    // Log to audit system
    // TODO: Integrate with audit logger
  }

  /**
   * Default conflict resolver (EXTERNAL_WINS strategy)
   */
  async resolveConflict(conflict: PMSConflict): Promise<any> {
    console.warn(`[${this.vendor}] Conflict detected:`, {
      entityType: conflict.entityType,
      field: conflict.field,
      external: conflict.externalValue,
      internal: conflict.internalValue
    })

    // Default: external PMS wins
    return conflict.externalValue
  }

  /**
   * Rate limiting helper
   */
  protected async waitForRateLimit(requestCount: number): Promise<void> {
    if (requestCount >= this.rateLimit.maxRequestsPerMinute) {
      const waitTime = this.rateLimit.retryAfterMs || 60000
      console.log(`[${this.vendor}] Rate limit reached, waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  /**
   * Retry helper with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries - 1) {
          const delay = baseDelayMs * Math.pow(2, attempt)
          console.log(`[${this.vendor}] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Operation failed after retries')
  }
}

/**
 * Adapter registry for dynamic loading
 */
export class PMSAdapterRegistry {
  private static adapters: Map<PMSVendor, () => PMSAdapterInterface> = new Map()

  static register(vendor: PMSVendor, factory: () => PMSAdapterInterface): void {
    this.adapters.set(vendor, factory)
  }

  static get(vendor: PMSVendor): PMSAdapterInterface | null {
    const factory = this.adapters.get(vendor)
    return factory ? factory() : null
  }

  static getAll(): PMSVendor[] {
    return Array.from(this.adapters.keys())
  }

  static has(vendor: PMSVendor): boolean {
    return this.adapters.has(vendor)
  }
}
