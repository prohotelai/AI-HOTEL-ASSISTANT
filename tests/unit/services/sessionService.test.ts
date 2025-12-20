/**
 * Session Service Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createSession,
  validateSession,
  rotateSession,
  invalidateSession,
  invalidateAllUserSessions,
  cleanupExpiredSessions,
  getUserActiveSessions,
  verifySessionOwnership
} from '@/lib/services/session/sessionService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}))

describe('Session Service', () => {
  const mockUserId = 'user-123'
  const mockHotelId = 'hotel-456'
  const mockSessionMetadata = {
    userAgent: 'Mozilla/5.0',
    ipAddress: '192.168.1.1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a new session with tokens', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        hotelId: mockHotelId,
        role: 'GUEST',
        tokenHash: 'hash123',
        userAgent: mockSessionMetadata.userAgent,
        ipAddress: mockSessionMetadata.ipAddress,
        ipRange: '192.168.1',
        deviceFingerprint: 'fp123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isActive: true,
        lastActivity: new Date(),
        tokenReuses: 0,
        suspiciousFlags: [],
        refreshTokens: [
          {
            id: 'refresh-123',
            sessionId: 'session-123',
            tokenHash: 'refresh-hash',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            revokedAt: null,
            rotatedAt: null,
            nextTokenHash: null
          }
        ]
      }

      vi.mocked(prisma.session.create).mockResolvedValue(mockSession as any)

      const result = await createSession({
        userId: mockUserId,
        hotelId: mockHotelId,
        role: 'GUEST',
        userAgent: mockSessionMetadata.userAgent,
        ipAddress: mockSessionMetadata.ipAddress
      })

      expect(result.sessionId).toBe('session-123')
      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.session).toBeDefined()
    })
  })

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        hotelId: mockHotelId,
        role: 'GUEST',
        isActive: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        deviceFingerprint: 'fp123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        tokenReuses: 0,
        suspiciousFlags: [],
        lastActivity: new Date()
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.session.update).mockResolvedValue(mockSession as any)

      const result = await validateSession('test-token', mockSessionMetadata)

      expect(result.valid).toBe(true)
      expect(result.userId).toBe(mockUserId)
      expect(result.sessionId).toBe('session-123')
    })

    it('should reject expired session', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        hotelId: mockHotelId,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000) // Expired
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.session.update).mockResolvedValue({ ...mockSession, isActive: false } as any)

      const result = await validateSession('test-token', mockSessionMetadata)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should reject inactive session', async () => {
      const mockSession = {
        id: 'session-123',
        isActive: false
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any)

      const result = await validateSession('test-token', mockSessionMetadata)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('inactive')
    })
  })

  describe('invalidateSession', () => {
    it('should mark session as inactive', async () => {
      const sessionId = 'session-123'
      
      vi.mocked(prisma.session.update).mockResolvedValue({
        id: sessionId,
        isActive: false
      } as any)
      
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 2 })

      const result = await invalidateSession(sessionId)

      expect(result.sessionId).toBe(sessionId)
      expect(result.invalidatedAt).toBeDefined()
    })
  })

  describe('invalidateAllUserSessions', () => {
    it('should invalidate all user sessions', async () => {
      const sessions = [
        { id: 'session-1' },
        { id: 'session-2' }
      ]

      vi.mocked(prisma.session.findMany).mockResolvedValue(sessions as any)
      vi.mocked(prisma.session.update)
        .mockResolvedValueOnce({ id: 'session-1', isActive: false } as any)
        .mockResolvedValueOnce({ id: 'session-2', isActive: false } as any)
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 4 })

      const result = await invalidateAllUserSessions(mockUserId)

      expect(result.invalidatedCount).toBe(2)
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should delete expired refresh tokens and mark expired sessions', async () => {
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 5 })
      vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 3 })

      const result = await cleanupExpiredSessions()

      expect(result.deletedRefreshTokens).toBe(5)
      expect(result.inactivatedSessions).toBe(3)
    })
  })

  describe('getUserActiveSessions', () => {
    it('should return active sessions for user', async () => {
      const activeSessions = [
        {
          id: 'session-1',
          userAgent: 'Firefox',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
          lastActivity: new Date()
        },
        {
          id: 'session-2',
          userAgent: 'Chrome',
          ipAddress: '10.0.0.1',
          createdAt: new Date(),
          lastActivity: new Date()
        }
      ]

      vi.mocked(prisma.session.findMany).mockResolvedValue(activeSessions as any)

      const result = await getUserActiveSessions(mockUserId, mockHotelId)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('session-1')
    })
  })

  describe('verifySessionOwnership', () => {
    it('should verify session belongs to user and hotel', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        hotelId: mockHotelId
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any)

      const result = await verifySessionOwnership('session-123', mockUserId, mockHotelId)

      expect(result).toBe(true)
    })

    it('should reject session with different userId', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'other-user',
        hotelId: mockHotelId
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any)

      const result = await verifySessionOwnership('session-123', mockUserId, mockHotelId)

      expect(result).toBe(false)
    })

    it('should reject session with different hotelId', async () => {
      const mockSession = {
        id: 'session-123',
        userId: mockUserId,
        hotelId: 'other-hotel'
      }

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any)

      const result = await verifySessionOwnership('session-123', mockUserId, mockHotelId)

      expect(result).toBe(false)
    })
  })
})
