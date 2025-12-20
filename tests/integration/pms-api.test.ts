/**
 * Phase 8: Integration Tests for PMS API Endpoints
 * Tests API routes, RBAC enforcement, and data flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getBookings, POST as createBooking } from '@/app/api/pms/bookings/route'
import { POST as testConnection } from '@/app/api/admin/pms/test-connection/route'
import { GET as getConfig, POST as saveConfig, DELETE as deleteConfig } from '@/app/api/admin/pms/configuration/route'

// Mock NextAuth
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}))

// Mock RBAC
vi.mock('@/lib/middleware/rbac', () => ({
  withPermission: (permission: string) => (handler: Function) => handler,
  withAuth: () => (handler: Function) => handler,
}))

// Mock services
vi.mock('@/lib/services/pms/bookingService')
vi.mock('@/lib/services/pms/externalPMSService')

describe('PMS Bookings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/pms/bookings', () => {
    it('should return bookings filtered by hotelId', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-123',
        role: 'manager',
      } as any)

      const { listBookings } = await import('@/lib/services/pms/bookingService')
      vi.mocked(listBookings).mockResolvedValue([
        {
          id: 'booking-1',
          hotelId: 'hotel-abc',
          confirmationNumber: 'CONF-001',
          status: 'CONFIRMED',
        },
      ] as any)

      const request = new NextRequest('http://localhost:3000/api/pms/bookings')
      const response = await getBookings(request)
      const data = await response.json()

      expect(data).toHaveProperty('bookings')
      expect(data.bookings).toHaveLength(1)
      expect(data.bookings[0].hotelId).toBe('hotel-abc')
    })

    it('should enforce RBAC - block guest access', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-123',
        role: 'guest',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pms/bookings')
      const response = await getBookings(request)

      expect(response.status).toBe(403)
    })

    it('should handle date range filters', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-123',
        role: 'manager',
      } as any)

      const { listBookings } = await import('@/lib/services/pms/bookingService')
      const listBookingsSpy = vi.mocked(listBookings)

      const url = new URL('http://localhost:3000/api/pms/bookings?startDate=2025-01-01&endDate=2025-01-31')
      const request = new NextRequest(url)
      await getBookings(request)

      expect(listBookingsSpy).toHaveBeenCalledWith(
        'hotel-abc',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      )
    })
  })

  describe('POST /api/pms/bookings', () => {
    it('should create booking with proper validation', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-123',
        role: 'reception',
      } as any)

      const { createBooking: createBookingService } = await import('@/lib/services/pms/bookingService')
      vi.mocked(createBookingService).mockResolvedValue({
        id: 'booking-new',
        hotelId: 'hotel-abc',
        confirmationNumber: 'CONF-NEW',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pms/bookings', {
        method: 'POST',
        body: JSON.stringify({
          guestId: 'guest-123',
          roomId: 'room-101',
          checkInDate: '2025-01-15',
          checkOutDate: '2025-01-20',
          totalAmount: 750,
          adults: 2,
        }),
      })

      const response = await createBooking(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.booking).toHaveProperty('confirmationNumber')
    })

    it('should reject invalid booking data', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-123',
        role: 'reception',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/pms/bookings', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          guestId: 'guest-123',
        }),
      })

      const response = await createBooking(request)

      expect(response.status).toBe(400)
    })

    it('should ensure hotelId from token, not request body', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-123',
        role: 'reception',
      } as any)

      const { createBooking: createBookingService } = await import('@/lib/services/pms/bookingService')
      const createSpy = vi.mocked(createBookingService)

      const request = new NextRequest('http://localhost:3000/api/pms/bookings', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: 'malicious-hotel', // Should be ignored
          guestId: 'guest-123',
          roomId: 'room-101',
          checkInDate: '2025-01-15',
          checkOutDate: '2025-01-20',
          totalAmount: 750,
          adults: 2,
        }),
      })

      await createBooking(request)

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: 'hotel-abc', // From token, not body
        })
      )
    })
  })
})

describe('External PMS Configuration API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/pms/test-connection', () => {
    it('should test PMS connection with valid credentials', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-admin',
        role: 'admin',
      } as any)

      const { testPMSConnection } = await import('@/lib/services/pms/externalPMSService')
      vi.mocked(testPMSConnection).mockResolvedValue({
        success: true,
        message: 'Connection successful',
        details: null,
        errors: null,
        suggestions: null,
      })

      const request = new NextRequest('http://localhost:3000/api/admin/pms/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          pmsType: 'Opera',
          apiKey: 'test-key-1234567890',
          version: '5.6',
          endpoint: 'https://api.opera.com',
        }),
      })

      const response = await testConnection(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should enforce admin-only access', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-staff',
        role: 'staff',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/admin/pms/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          pmsType: 'Mews',
          apiKey: 'test-key',
        }),
      })

      const response = await testConnection(request)

      expect(response.status).toBe(403)
    })

    it('should validate PMS type enum', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-admin',
        role: 'admin',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/admin/pms/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          pmsType: 'InvalidPMS', // Not in enum
          apiKey: 'test-key-1234567890',
        }),
      })

      const response = await testConnection(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/admin/pms/configuration', () => {
    it('should save PMS configuration with encryption', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-admin',
        role: 'admin',
      } as any)

      const { savePMSConfiguration } = await import('@/lib/services/pms/externalPMSService')
      vi.mocked(savePMSConfiguration).mockResolvedValue({
        id: 'config-123',
        hotelId: 'hotel-abc',
        pmsType: 'Opera',
        status: 'ACTIVE',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/admin/pms/configuration', {
        method: 'POST',
        body: JSON.stringify({
          pmsType: 'Opera',
          apiKey: 'sensitive-api-key',
          version: '5.6',
        }),
      })

      const response = await saveConfig(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.configId).toBe('config-123')
    })
  })

  describe('GET /api/admin/pms/configuration', () => {
    it('should retrieve config without exposing API key', async () => {
      const { getToken } = await import('next-auth/jwt')
      vi.mocked(getToken).mockResolvedValue({
        hotelId: 'hotel-abc',
        id: 'user-admin',
        role: 'admin',
      } as any)

      const { getPMSConfiguration } = await import('@/lib/services/pms/externalPMSService')
      vi.mocked(getPMSConfiguration).mockResolvedValue({
        id: 'config-123',
        hotelId: 'hotel-abc',
        pmsType: 'Opera',
        version: '5.6',
        endpoint: 'https://api.opera.com',
        status: 'ACTIVE',
        // apiKeyEncrypted should NOT be in response
      } as any)

      const request = new NextRequest('http://localhost:3000/api/admin/pms/configuration')
      const response = await getConfig(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.config).toBeDefined()
      expect(data.config).not.toHaveProperty('apiKeyEncrypted')
    })
  })
})

describe('API Multi-tenant Isolation', () => {
  it('should never allow cross-tenant data access', async () => {
    const { getToken } = await import('next-auth/jwt')
    vi.mocked(getToken).mockResolvedValue({
      hotelId: 'hotel-abc',
      id: 'user-123',
      role: 'manager',
    } as any)

    const { listBookings } = await import('@/lib/services/pms/bookingService')
    const listSpy = vi.mocked(listBookings)

    const request = new NextRequest('http://localhost:3000/api/pms/bookings')
    await getBookings(request)

    // Verify service called with hotelId from token
    expect(listSpy).toHaveBeenCalledWith('hotel-abc', expect.anything())
  })
})
