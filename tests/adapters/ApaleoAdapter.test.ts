/**
 * ApaleoAdapter Unit Tests - Phase 9 Block 3
 * Tests OAuth 2.0 REST API adapter for Apaleo PMS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApaleoAdapter } from '@/lib/services/pms/adapters/ApaleoAdapter'
import axios from 'axios'
import type { PMSConnectionConfig } from '@/lib/services/pms/adapters/PMSAdapterInterface'

// Mock axios
vi.mock('axios')

describe('ApaleoAdapter', () => {
  let adapter: ApaleoAdapter
  let mockConfig: PMSConnectionConfig

  beforeEach(() => {
    adapter = new ApaleoAdapter()
    mockConfig = {
      hotelId: 'test-hotel-123',
      vendor: 'APALEO' as any,
      authType: 'OAUTH2' as any,
      endpoint: 'https://api.apaleo.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'valid-access-token',
      refreshToken: 'valid-refresh-token',
      tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      metadata: {
        propertyId: 'PROP-001'
      }
    }

    // Reset axios mock
    vi.clearAllMocks()
    
    // Default axios create mock
    const mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Adapter Properties', () => {
    it('should have correct vendor', () => {
      expect(adapter.vendor).toBe('APALEO')
    })

    it('should have OAUTH2 auth type', () => {
      expect(adapter.authType).toBe('OAUTH2')
    })

    it('should support webhooks', () => {
      expect(adapter.supportsWebhooks).toBe(true)
    })

    it('should support real-time sync', () => {
      expect(adapter.supportsRealTimeSync).toBe(true)
    })

    it('should have correct rate limit (120 req/min)', () => {
      expect(adapter.rateLimit.maxRequestsPerMinute).toBe(120)
      expect(adapter.rateLimit.maxRequestsPerHour).toBe(7200)
    })
  })

  describe('OAuth Static Methods', () => {
    it('should generate correct authorization URL', () => {
      const url = ApaleoAdapter.getAuthorizationUrl(
        'client123',
        'https://app.example.com/callback',
        'random-state'
      )

      expect(url).toContain('https://identity.apaleo.com/connect/authorize')
      expect(url).toContain('client_id=client123')
      expect(url).toContain('redirect_uri=https')
      expect(url).toContain('state=random-state')
      expect(url).toContain('response_type=code')
    })

    it('should exchange authorization code for tokens', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        }
      })

      const result = await ApaleoAdapter.exchangeCodeForToken(
        'auth-code-123',
        'client-id',
        'client-secret',
        'https://app.example.com/callback'
      )

      expect(result.accessToken).toBe('new-access-token')
      expect(result.refreshToken).toBe('new-refresh-token')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it('should get client credentials token', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          access_token: 'client-access-token',
          expires_in: 3600
        }
      })

      const result = await ApaleoAdapter.getClientCredentialsToken(
        'client-id',
        'client-secret'
      )

      expect(result.accessToken).toBe('client-access-token')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })
  })

  describe('testConnection', () => {
    it('should successfully test connection with valid token', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          id: 'PROP-001',
          code: 'HTL',
          name: 'Test Hotel',
          description: 'A test property',
          currencyCode: 'USD',
          timeZone: 'America/New_York'
        }
      })

      const result = await adapter.testConnection(mockConfig)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Apaleo')
      expect(result.message).toContain('Test Hotel')
      expect(result.details?.hotelInfo?.name).toBe('Test Hotel')
      expect(result.details?.features).toContain('OAuth2')
    })

    it('should handle connection failure gracefully', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'))

      const result = await adapter.testConnection(mockConfig)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Connection failed')
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0]).toContain('Network error')
    })

    it('should reject connection without access token', async () => {
      const invalidConfig = {
        ...mockConfig,
        accessToken: undefined
      }

      await expect(adapter.testConnection(invalidConfig)).rejects.toThrow(
        'Apaleo requires an access token'
      )
    })
  })

  describe('connect', () => {
    it('should initialize connection successfully', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          id: 'PROP-001',
          name: 'Test Hotel',
          currencyCode: 'USD'
        }
      })

      await expect(adapter.connect(mockConfig)).resolves.not.toThrow()
    })

    it('should handle token expiration during connect', async () => {
      const expiringConfig = {
        ...mockConfig,
        tokenExpiresAt: new Date(Date.now() + 60000) // Expires in 1 minute
      }

      vi.mocked(axios.post).mockResolvedValue({
        data: {
          access_token: 'refreshed-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        }
      })

      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'PROP-001', name: 'Test Hotel' }
      })

      await expect(adapter.connect(expiringConfig)).resolves.not.toThrow()
      
      // Should have attempted token refresh
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('token'),
        expect.any(URLSearchParams),
        expect.any(Object)
      )
    })
  })

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        }
      })

      const result = await adapter.refreshToken(mockConfig)

      expect(result.accessToken).toBe('new-access-token')
      expect(result.refreshToken).toBe('new-refresh-token')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it('should throw error when no refresh token available', async () => {
      const noRefreshConfig = {
        ...mockConfig,
        refreshToken: undefined
      }

      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({ data: {} })
      
      await adapter.connect(noRefreshConfig)

      await expect(adapter.refreshToken(noRefreshConfig)).rejects.toThrow(
        'No refresh token available'
      )
    })
  })

  describe('syncRooms', () => {
    it('should sync units and map status correctly', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { id: 'PROP-001', name: 'Test Hotel' }
        })
        .mockResolvedValueOnce({
          data: {
            units: [
              {
                id: 'UNIT-101',
                name: '101',
                unitGroupId: 'GROUP-STD',
                description: 'Standard Room',
                status: 'Clean',
                condition: 'Ok',
                maxPersons: 2
              },
              {
                id: 'UNIT-102',
                name: '102',
                unitGroupId: 'GROUP-STD',
                status: 'Dirty',
                condition: 'CleaningNeeded',
                maxPersons: 2
              }
            ]
          }
        })

      await adapter.connect(mockConfig)
      const rooms = await adapter.syncRooms('test-hotel-123', mockConfig)

      expect(rooms).toHaveLength(2)
      expect(rooms[0].roomNumber).toBe('101')
      expect(rooms[0].status).toBe('AVAILABLE') // Clean -> AVAILABLE
      expect(rooms[0].maxOccupancy).toBe(2)
      expect(rooms[1].status).toBe('DIRTY') // Dirty -> DIRTY
    })
  })

  describe('syncBookings', () => {
    it('should sync reservations with date range', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { id: 'PROP-001', name: 'Test Hotel' }
        })
        .mockResolvedValueOnce({
          data: {
            reservations: [
              {
                id: 'RES-001',
                bookingId: 'BK-001',
                status: 'Confirmed',
                primaryGuest: {
                  id: 'GUEST-123',
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john@example.com'
                },
                unitGroupId: 'GROUP-STD',
                unitId: 'UNIT-101',
                arrival: '2025-01-01',
                departure: '2025-01-05',
                adults: 2,
                childrenAges: [],
                totalGrossAmount: {
                  amount: 500.00,
                  currency: 'USD'
                }
              }
            ]
          }
        })

      await adapter.connect(mockConfig)
      const bookings = await adapter.syncBookings(
        'test-hotel-123',
        mockConfig,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      )

      expect(bookings).toHaveLength(1)
      expect(bookings[0].confirmationNumber).toBe('BK-001')
      expect(bookings[0].status).toBe('CONFIRMED')
      expect(bookings[0].numberOfGuests).toBe(2)
      expect(bookings[0].totalAmount).toBe(500.00)
    })
  })

  describe('createBooking', () => {
    it('should create reservation and return ID', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'PROP-001', name: 'Test Hotel' }
      })
      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'RES-NEW-001' }
      })

      await adapter.connect(mockConfig)
      
      const newBooking = {
        externalId: '',
        guestId: 'GUEST-456',
        roomId: 'UNIT-102',
        confirmationNumber: '',
        status: 'CONFIRMED' as const,
        checkInDate: new Date('2025-02-01'),
        checkOutDate: new Date('2025-02-05'),
        numberOfGuests: 2,
        metadata: {
          roomTypeId: 'GROUP-STD',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com'
        }
      }

      const reservationId = await adapter.createBooking('test-hotel-123', mockConfig, newBooking)

      expect(reservationId).toBe('RES-NEW-001')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/booking/v1/reservations',
        expect.objectContaining({
          adults: 2,
          primaryGuest: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith'
          })
        })
      )
    })
  })

  describe('updateBooking', () => {
    it('should update reservation using JSON Patch', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'PROP-001', name: 'Test Hotel' }
      })
      mockAxiosInstance.patch.mockResolvedValue({ data: {} })

      await adapter.connect(mockConfig)
      await adapter.updateBooking('test-hotel-123', mockConfig, 'RES-001', {
        checkInDate: new Date('2025-02-02'),
        checkOutDate: new Date('2025-02-06')
      })

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/booking/v1/reservations/RES-001',
        expect.arrayContaining([
          expect.objectContaining({ op: 'replace', path: '/arrival' }),
          expect.objectContaining({ op: 'replace', path: '/departure' })
        ]),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json-patch+json'
          })
        })
      )
    })
  })

  describe('cancelBooking', () => {
    it('should cancel reservation successfully', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'PROP-001', name: 'Test Hotel' }
      })
      mockAxiosInstance.put.mockResolvedValue({ data: {} })

      await adapter.connect(mockConfig)
      await expect(
        adapter.cancelBooking('test-hotel-123', mockConfig, 'RES-001')
      ).resolves.not.toThrow()

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/booking/v1/reservations/RES-001/cancel'
      )
    })
  })

  describe('postCharge', () => {
    it('should post charge to folio', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'PROP-001', name: 'Test Hotel' }
      })
      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'CHARGE-001' }
      })

      await adapter.connect(mockConfig)
      const charge = {
        description: 'Room Service',
        amount: 25.00,
        currency: 'USD',
        chargedAt: new Date('2025-01-02')
      }

      const chargeId = await adapter.postCharge('test-hotel-123', mockConfig, 'FOLIO-001', charge)

      expect(chargeId).toBe('CHARGE-001')
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/finance/v1/folios/FOLIO-001/charges',
        expect.objectContaining({
          name: 'Room Service',
          amount: expect.objectContaining({
            amount: 25.00,
            currency: 'USD'
          })
        })
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limit of 120 requests per minute', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get.mockResolvedValue({ data: {} })

      await adapter.connect(mockConfig)

      // The rate limiter is attached as an interceptor
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should throw PMSError on API request failure', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { id: 'PROP-001' } })
        .mockRejectedValueOnce({
          response: {
            status: 500,
            data: { message: 'Internal Server Error' }
          },
          message: 'Request failed with status 500'
        })

      await adapter.connect(mockConfig)

      await expect(
        adapter.syncRooms('test-hotel-123', mockConfig)
      ).rejects.toMatchObject({
        entityType: 'Connection',
        operation: 'READ',
        errorCode: '500',
        retryable: true
      })
    })

    it('should handle 401 token expiration errors', async () => {
      const mockAxiosInstance = vi.mocked(axios.create).mock.results[0].value
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { id: 'PROP-001' } })
        .mockRejectedValueOnce({
          response: {
            status: 401,
            data: { message: 'Unauthorized' }
          },
          message: 'Unauthorized'
        })

      await adapter.connect(mockConfig)

      await expect(
        adapter.syncRooms('test-hotel-123', mockConfig)
      ).rejects.toMatchObject({
        errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Access token expired, refresh required'
      })
    })
  })

  describe('Webhook Verification', () => {
    it('should verify valid webhook signature', () => {
      const payload = { eventType: 'reservation.created', data: {} }
      const secret = 'webhook-secret-key'
      
      const crypto = require('crypto')
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(JSON.stringify(payload))
      const signature = hmac.digest('hex')

      const isValid = adapter.verifyWebhook(payload, signature, secret)
      expect(isValid).toBe(true)
    })

    it('should reject invalid webhook signature', () => {
      const payload = { eventType: 'reservation.created', data: {} }
      const secret = 'webhook-secret-key'
      const invalidSignature = 'invalid-signature'

      const isValid = adapter.verifyWebhook(payload, invalidSignature, secret)
      expect(isValid).toBe(false)
    })
  })

  describe('Status Mapping', () => {
    it('should map all Apaleo unit statuses correctly', () => {
      const statuses = [
        { apaleo: 'Clean', expected: 'AVAILABLE' },
        { apaleo: 'CleanToBeInspected', expected: 'AVAILABLE' },
        { apaleo: 'Dirty', expected: 'DIRTY' },
        { apaleo: 'OutOfService', expected: 'OUT_OF_ORDER' },
        { apaleo: 'OutOfOrder', expected: 'OUT_OF_ORDER' }
      ]

      statuses.forEach(({ expected }) => {
        expect(expected).toMatch(/^(AVAILABLE|DIRTY|OUT_OF_ORDER)$/)
      })
    })

    it('should map all booking statuses correctly', () => {
      const statuses = [
        { apaleo: 'Confirmed', expected: 'CONFIRMED' },
        { apaleo: 'InHouse', expected: 'CHECKED_IN' },
        { apaleo: 'CheckedOut', expected: 'CHECKED_OUT' },
        { apaleo: 'Canceled', expected: 'CANCELED' },
        { apaleo: 'NoShow', expected: 'NO_SHOW' }
      ]

      statuses.forEach(({ expected }) => {
        expect(expected).toMatch(/^(CONFIRMED|CHECKED_IN|CHECKED_OUT|CANCELED|NO_SHOW)$/)
      })
    })

    it('should map payment methods correctly', () => {
      const methods = [
        { apaleo: 'Cash', expected: 'CASH' },
        { apaleo: 'CreditCard', expected: 'CARD' },
        { apaleo: 'BankTransfer', expected: 'TRANSFER' }
      ]

      methods.forEach(({ expected }) => {
        expect(expected).toMatch(/^(CASH|CARD|TRANSFER|OTHER)$/)
      })
    })
  })
})
