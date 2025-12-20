import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSession, createMockJWT, mockStaffUser, mockAdminUser, mockGuestUser } from '@/tests/helpers/authHelpers'

describe('Authentication Helpers', () => {
  describe('createMockSession', () => {
    it('should create a valid mock session with default values', () => {
      const session = createMockSession()

      expect(session).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.user?.email).toBe('test@example.com')
      expect(session.user?.role).toBe('STAFF')
      expect(session.user?.hotelId).toBe('hotel-1')
    })

    it('should override session properties', () => {
      const session = createMockSession({
        user: {
          email: 'custom@example.com',
          role: 'ADMIN',
        } as any,
      })

      expect(session.user?.email).toBe('custom@example.com')
      expect(session.user?.role).toBe('ADMIN')
    })

    it('should have a valid expiry date', () => {
      const session = createMockSession()
      const expiryDate = new Date(session.expires)

      expect(expiryDate.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('createMockJWT', () => {
    it('should create a valid JWT token', () => {
      const token = createMockJWT()

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should include default claims', () => {
      const token = createMockJWT()
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())

      expect(payload.sub).toBe('test-user-1')
      expect(payload.email).toBe('test@example.com')
      expect(payload.role).toBe('STAFF')
      expect(payload.hotelId).toBe('hotel-1')
    })

    it('should override claims', () => {
      const token = createMockJWT({ role: 'ADMIN', hotelId: 'hotel-2' })
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())

      expect(payload.role).toBe('ADMIN')
      expect(payload.hotelId).toBe('hotel-2')
    })
  })

  describe('Role-specific mock users', () => {
    it('should provide admin user fixture', () => {
      expect(mockAdminUser.role).toBe('ADMIN')
      expect(mockAdminUser.email).toBe('admin@example.com')
    })

    it('should provide staff user fixture', () => {
      expect(mockStaffUser.role).toBe('STAFF')
      expect(mockStaffUser.email).toBe('staff@example.com')
    })

    it('should provide guest user fixture', () => {
      expect(mockGuestUser.role).toBe('GUEST')
      expect(mockGuestUser.email).toBe('guest@example.com')
    })
  })
})

describe('Authentication Flows', () => {
  describe('Login Flow', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.user.email).toBe('test@example.com')
      expect(data.token).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should handle missing credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Magic Link Flow', () => {
    it('should send magic link to valid email', async () => {
      const response = await fetch('http://localhost:3000/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should validate email format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Session Management', () => {
    it('should maintain valid session', () => {
      const session = createMockSession()
      const now = Date.now()
      const expiryTime = new Date(session.expires).getTime()

      expect(expiryTime).toBeGreaterThan(now)
      expect(expiryTime - now).toBeGreaterThan(23 * 60 * 60 * 1000) // At least 23 hours
    })

    it('should detect expired session', () => {
      const expiredSession = createMockSession({
        expires: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      })

      const isExpired = new Date(expiredSession.expires).getTime() < Date.now()
      expect(isExpired).toBe(true)
    })
  })
})
