/**
 * Unit Tests for QR Authentication Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QRAuthController, createQRAuth } from '../qrAuth'

describe('QRAuthController', () => {
  let qrAuth: QRAuthController
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()

    // Mock fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock

    qrAuth = createQRAuth({
      apiBaseUrl: 'http://localhost:3000',
      hotelId: 'hotel-123',
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onScanning: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('validateToken', () => {
    it('should successfully validate a token and store session data', async () => {
      const mockSessionData = {
        sessionJWT: 'jwt-token-123',
        user: {
          id: 'user-456',
          email: 'guest@example.com',
          name: 'John Guest',
          role: 'guest' as const,
          hotelId: 'hotel-123',
        },
        permissions: ['tickets:create', 'chat:read'],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const onSuccess = vi.fn()
      qrAuth = createQRAuth({
        apiBaseUrl: 'http://localhost:3000',
        hotelId: 'hotel-123',
        onSuccess,
      })

      await qrAuth.validateToken('qr-token-xyz')

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'qr-token-xyz', hotelId: 'hotel-123' }),
      })

      expect(localStorage.getItem('qr_session_jwt')).toBe('jwt-token-123')
      expect(localStorage.getItem('qr_session_user')).toBe(JSON.stringify(mockSessionData.user))
      expect(onSuccess).toHaveBeenCalledWith(mockSessionData)
    })

    it('should handle validation errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid token' }),
      })

      const onError = vi.fn()
      qrAuth = createQRAuth({
        apiBaseUrl: 'http://localhost:3000',
        hotelId: 'hotel-123',
        onError,
      })

      await qrAuth.validateToken('invalid-token')

      expect(onError).toHaveBeenCalled()
      expect(onError.mock.calls[0][0].code).toBe('TOKEN_VALIDATION_ERROR')
    })
  })

  describe('manualTokenEntry', () => {
    it('should reject empty token', async () => {
      const onError = vi.fn()
      qrAuth = createQRAuth({
        apiBaseUrl: 'http://localhost:3000',
        hotelId: 'hotel-123',
        onError,
      })

      await qrAuth.manualTokenEntry('   ')

      expect(onError).toHaveBeenCalled()
      expect(onError.mock.calls[0][0].code).toBe('EMPTY_TOKEN')
    })

    it('should validate non-empty token', async () => {
      const mockSessionData = {
        sessionJWT: 'jwt-token-123',
        user: {
          id: 'user-456',
          email: 'staff@example.com',
          name: 'Jane Staff',
          role: 'staff' as const,
          hotelId: 'hotel-123',
        },
        permissions: ['tickets:manage', 'staff:view'],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const onSuccess = vi.fn()
      qrAuth = createQRAuth({
        apiBaseUrl: 'http://localhost:3000',
        hotelId: 'hotel-123',
        onSuccess,
      })

      await qrAuth.manualTokenEntry('  valid-token  ')

      expect(fetchMock).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledWith(mockSessionData)
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no session exists', () => {
      expect(qrAuth.isAuthenticated()).toBe(false)
    })

    it('should return false when session is expired', () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_expires', expiredTime.toString())

      expect(qrAuth.isAuthenticated()).toBe(false)
    })

    it('should return true when valid session exists', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_expires', futureTime.toString())

      expect(qrAuth.isAuthenticated()).toBe(true)
    })
  })

  describe('getSession', () => {
    it('should return null when no session exists', () => {
      expect(qrAuth.getSession()).toBeNull()
    })

    it('should return session data when authenticated', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      const userData = { id: 'user-456', email: 'guest@example.com', name: 'John', role: 'guest' as const, hotelId: 'hotel-123' }
      const permissions = ['tickets:create']

      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_user', JSON.stringify(userData))
      localStorage.setItem('qr_session_permissions', JSON.stringify(permissions))
      localStorage.setItem('qr_session_expires', futureTime.toString())

      const session = qrAuth.getSession()

      expect(session).not.toBeNull()
      expect(session?.sessionJWT).toBe('jwt-token')
      expect(session?.user.id).toBe('user-456')
      expect(session?.permissions).toEqual(permissions)
    })

    it('should clear expired session', () => {
      const expiredTime = Math.floor(Date.now() / 1000) - 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_expires', expiredTime.toString())

      expect(qrAuth.getSession()).toBeNull()
      expect(localStorage.getItem('qr_session_jwt')).toBeNull()
    })
  })

  describe('hasPermission', () => {
    it('should return false when no session exists', () => {
      expect(qrAuth.hasPermission('tickets:create')).toBe(false)
    })

    it('should return true when user has permission', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_user', JSON.stringify({ id: 'user-456', email: 'guest@example.com', name: 'John', role: 'guest', hotelId: 'hotel-123' }))
      localStorage.setItem('qr_session_permissions', JSON.stringify(['tickets:create', 'chat:read']))
      localStorage.setItem('qr_session_expires', futureTime.toString())

      expect(qrAuth.hasPermission('tickets:create')).toBe(true)
    })

    it('should return false when user does not have permission', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_user', JSON.stringify({ id: 'user-456', email: 'guest@example.com', name: 'John', role: 'guest', hotelId: 'hotel-123' }))
      localStorage.setItem('qr_session_permissions', JSON.stringify(['chat:read']))
      localStorage.setItem('qr_session_expires', futureTime.toString())

      expect(qrAuth.hasPermission('tickets:create')).toBe(false)
    })
  })

  describe('getUserRole', () => {
    it('should return null when no session exists', () => {
      expect(qrAuth.getUserRole()).toBeNull()
    })

    it('should return user role when authenticated', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_user', JSON.stringify({ id: 'user-456', email: 'staff@example.com', name: 'Jane', role: 'staff', hotelId: 'hotel-123' }))
      localStorage.setItem('qr_session_expires', futureTime.toString())

      expect(qrAuth.getUserRole()).toBe('staff')
    })
  })

  describe('clearSession', () => {
    it('should clear all session data', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_user', JSON.stringify({ id: 'user-456' }))
      localStorage.setItem('qr_session_permissions', JSON.stringify(['tickets:create']))
      localStorage.setItem('qr_session_expires', futureTime.toString())

      qrAuth.clearSession()

      expect(localStorage.getItem('qr_session_jwt')).toBeNull()
      expect(localStorage.getItem('qr_session_user')).toBeNull()
      expect(localStorage.getItem('qr_session_permissions')).toBeNull()
      expect(localStorage.getItem('qr_session_expires')).toBeNull()
    })
  })

  describe('logout', () => {
    it('should clear session and stop scanning', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token')
      localStorage.setItem('qr_session_expires', futureTime.toString())

      qrAuth.logout()

      expect(localStorage.getItem('qr_session_jwt')).toBeNull()
      expect(qrAuth.isAuthenticated()).toBe(false)
    })
  })

  describe('getAuthToken', () => {
    it('should return null when not authenticated', () => {
      expect(qrAuth.getAuthToken()).toBeNull()
    })

    it('should return JWT when authenticated', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      localStorage.setItem('qr_session_jwt', 'jwt-token-xyz')
      localStorage.setItem('qr_session_expires', futureTime.toString())

      expect(qrAuth.getAuthToken()).toBe('jwt-token-xyz')
    })
  })
})
