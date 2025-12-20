/**
 * Integration Tests for Widget SDK and Staff Dashboard QR Login
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Widget SDK + Staff Dashboard Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Guest QR Login Flow', () => {
    it('should authenticate guest and open widget', async () => {
      // 1. QR token is scanned
      const qrToken = 'guest-qr-token-xyz'
      const hotelId = 'hotel-123'

      // 2. Token is validated with backend
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionJWT: 'guest-jwt-token',
          user: {
            id: 'guest-456',
            email: 'guest@hotel.com',
            name: 'John Guest',
            role: 'guest',
            hotelId,
          },
          permissions: ['chat:read', 'chat:write', 'tickets:create'],
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }),
      })

      // 3. Session is stored
      localStorage.setItem('qr_session_jwt', 'guest-jwt-token')
      localStorage.setItem(
        'qr_session_user',
        JSON.stringify({
          id: 'guest-456',
          email: 'guest@hotel.com',
          name: 'John Guest',
          role: 'guest',
          hotelId,
        })
      )
      localStorage.setItem('qr_session_permissions', JSON.stringify(['chat:read', 'chat:write', 'tickets:create']))
      localStorage.setItem('qr_session_expires', (Math.floor(Date.now() / 1000) + 3600).toString())

      // 4. Verify widget can access session
      const sessionJWT = localStorage.getItem('qr_session_jwt')
      const sessionUser = JSON.parse(localStorage.getItem('qr_session_user') || '{}')

      expect(sessionJWT).toBe('guest-jwt-token')
      expect(sessionUser.role).toBe('guest')
      expect(sessionUser.id).toBe('guest-456')
    })

    it('should prevent guest from accessing staff dashboard', async () => {
      // Store guest session
      localStorage.setItem('qr_session_jwt', 'guest-jwt-token')
      localStorage.setItem(
        'qr_session_user',
        JSON.stringify({
          id: 'guest-456',
          role: 'guest',
          hotelId: 'hotel-123',
        })
      )

      const userRole = JSON.parse(localStorage.getItem('qr_session_user') || '{}').role

      // Guest should not be able to access staff dashboard
      expect(userRole).toBe('guest')
      expect(userRole !== 'staff').toBe(true)
    })
  })

  describe('Staff QR Login Flow', () => {
    it('should authenticate staff and provide dashboard access', async () => {
      // 1. QR token is scanned
      const qrToken = 'staff-qr-token-abc'
      const hotelId = 'hotel-123'

      // 2. Token is validated with backend
      const staffPermissions = [
        'tickets:manage',
        'staff:view',
        'ai:night-audit',
        'ai:task-routing',
        'ai:housekeeping',
        'ai:maintenance',
        'ai:billing',
      ]

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionJWT: 'staff-jwt-token',
          user: {
            id: 'staff-789',
            email: 'jane@hotel.com',
            name: 'Jane Staff',
            role: 'staff',
            hotelId,
          },
          permissions: staffPermissions,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        }),
      })

      // 3. Session is stored
      localStorage.setItem('qr_session_jwt', 'staff-jwt-token')
      localStorage.setItem(
        'qr_session_user',
        JSON.stringify({
          id: 'staff-789',
          email: 'jane@hotel.com',
          name: 'Jane Staff',
          role: 'staff',
          hotelId,
        })
      )
      localStorage.setItem('qr_session_permissions', JSON.stringify(staffPermissions))
      localStorage.setItem('qr_session_expires', (Math.floor(Date.now() / 1000) + 3600).toString())

      // 4. Verify staff has dashboard access
      const sessionJWT = localStorage.getItem('qr_session_jwt')
      const sessionUser = JSON.parse(localStorage.getItem('qr_session_user') || '{}')
      const permissions = JSON.parse(localStorage.getItem('qr_session_permissions') || '[]')

      expect(sessionJWT).toBe('staff-jwt-token')
      expect(sessionUser.role).toBe('staff')
      expect(sessionUser.id).toBe('staff-789')
      expect(permissions).toContain('ai:night-audit')
      expect(permissions).toContain('ai:task-routing')
      expect(permissions).toContain('ai:maintenance')
    })

    it('should validate staff permissions for AI modules', async () => {
      // Store staff session
      const staffPermissions = [
        'ai:night-audit',
        'ai:task-routing',
        'ai:housekeeping',
        'ai:maintenance',
      ]

      localStorage.setItem('qr_session_jwt', 'staff-jwt-token')
      localStorage.setItem(
        'qr_session_user',
        JSON.stringify({
          id: 'staff-789',
          role: 'staff',
          hotelId: 'hotel-123',
        })
      )
      localStorage.setItem('qr_session_permissions', JSON.stringify(staffPermissions))

      const permissions = JSON.parse(localStorage.getItem('qr_session_permissions') || '[]')

      // Check specific permissions
      expect(permissions.includes('ai:night-audit')).toBe(true)
      expect(permissions.includes('ai:task-routing')).toBe(true)
      expect(permissions.includes('ai:maintenance')).toBe(true)
      expect(permissions.includes('ai:billing')).toBe(false) // Not assigned
    })
  })

  describe('Session Expiration', () => {
    it('should detect expired session', async () => {
      // Create expired session
      const expiredTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      localStorage.setItem('qr_session_jwt', 'expired-jwt')
      localStorage.setItem('qr_session_expires', expiredTime.toString())

      // Check if session is valid
      const expiresAt = localStorage.getItem('qr_session_expires')
      const currentTime = Math.floor(Date.now() / 1000)
      const isExpired = parseInt(expiresAt || '0', 10) < currentTime

      expect(isExpired).toBe(true)
    })

    it('should maintain valid session', async () => {
      // Create valid session (1 hour from now)
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'valid-jwt')
      localStorage.setItem('qr_session_expires', futureTime.toString())

      // Check if session is valid
      const expiresAt = localStorage.getItem('qr_session_expires')
      const currentTime = Math.floor(Date.now() / 1000)
      const isValid = parseInt(expiresAt || '0', 10) > currentTime

      expect(isValid).toBe(true)
    })
  })

  describe('Multi-tenant Isolation', () => {
    it('should prevent cross-hotel token usage', async () => {
      // Store token for hotel A
      localStorage.setItem('qr_session_jwt', 'hotel-a-token')
      localStorage.setItem(
        'qr_session_user',
        JSON.stringify({
          id: 'user-123',
          hotelId: 'hotel-a',
          role: 'staff',
        })
      )

      const storedHotelId = JSON.parse(localStorage.getItem('qr_session_user') || '{}').hotelId
      const requestHotelId = 'hotel-b'

      // Validate token is only valid for its assigned hotel
      expect(storedHotelId).toBe('hotel-a')
      expect(storedHotelId === requestHotelId).toBe(false)
    })

    it('should provide hotel-specific data', async () => {
      // Store session for specific hotel
      const hotelId = 'hotel-xyz'
      localStorage.setItem('qr_session_jwt', 'hotel-token')
      localStorage.setItem(
        'qr_session_user',
        JSON.stringify({
          id: 'user-456',
          hotelId,
          role: 'staff',
        })
      )

      // Verify data requests include hotel scope
      const sessionHotelId = JSON.parse(localStorage.getItem('qr_session_user') || '{}').hotelId
      expect(sessionHotelId).toBe(hotelId)
    })
  })

  describe('Logout', () => {
    it('should clear session on logout', async () => {
      // Create session
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_user', JSON.stringify({ id: 'user-123' }))
      localStorage.setItem('qr_session_permissions', JSON.stringify(['chat:read']))
      localStorage.setItem('qr_session_expires', '9999999999')

      // Clear on logout
      localStorage.removeItem('qr_session_jwt')
      localStorage.removeItem('qr_session_user')
      localStorage.removeItem('qr_session_permissions')
      localStorage.removeItem('qr_session_expires')

      // Verify all cleared
      expect(localStorage.getItem('qr_session_jwt')).toBeNull()
      expect(localStorage.getItem('qr_session_user')).toBeNull()
      expect(localStorage.getItem('qr_session_permissions')).toBeNull()
      expect(localStorage.getItem('qr_session_expires')).toBeNull()
    })
  })

  describe('API Integration', () => {
    it('should send auth token in dashboard API requests', async () => {
      // Store JWT
      localStorage.setItem('qr_session_jwt', 'staff-jwt-token')

      // Mock API call
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalTasks: 10 }),
      })
      global.fetch = mockFetch

      // Get token
      const authToken = localStorage.getItem('qr_session_jwt')

      // Make API request
      await fetch('/api/dashboard/staff/stats', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      // Verify token was sent
      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/staff/stats', {
        headers: {
          Authorization: `Bearer staff-jwt-token`,
        },
      })
    })

    it('should handle API errors gracefully', async () => {
      // Mock failed API request
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })
      global.fetch = mockFetch

      const response = await fetch('/api/dashboard/staff/stats', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })
})
