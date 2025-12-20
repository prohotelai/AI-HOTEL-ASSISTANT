/**
 * Session Management Integration Tests
 * Tests complete flows: login → token rotation → logout
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  createSession,
  validateSession,
  rotateSession,
  invalidateSession,
  cleanupExpiredSessions
} from '@/lib/services/session/sessionService'
import { checkRateLimit, resetRateLimit } from '@/lib/security/rateLimiter'
import { recordFailedAttempt, clearFailedAttempts } from '@/lib/security/bruteForceProtection'
import { detectSessionHijacking } from '@/lib/security/sessionHijackingPrevention'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma')

describe('Session Management Integration', () => {
  const testUser = {
    id: 'test-user-123',
    hotelId: 'test-hotel-456',
    role: 'GUEST'
  }

  const testMetadata = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    ipAddress: '192.168.1.100'
  }

  beforeAll(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe('Complete Login Flow', () => {
    it('should handle successful login with rate limiting and brute-force checks', async () => {
      // 1. Check rate limit
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.rateLimitEntry.create).mockResolvedValue({
        id: '1',
        identifier: testMetadata.ipAddress,
        endpoint: '/api/auth/login',
        attempts: 1,
        lastAttempt: new Date(),
        resetAt: new Date(Date.now() + 60000)
      } as any)
      vi.mocked(prisma.rateLimitEntry.update).mockResolvedValue({
        id: '1',
        identifier: testMetadata.ipAddress,
        endpoint: '/api/auth/login',
        attempts: 1,
        lastAttempt: new Date(),
        resetAt: new Date(Date.now() + 60000)
      } as any)

      const rateLimit = await checkRateLimit(testMetadata.ipAddress, '/api/auth/login')
      expect(rateLimit.allowed).toBe(true)

      // 2. Check brute-force status
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(null)
      const bruteForceStatus = await recordFailedAttempt(testMetadata.ipAddress, 'ip', '/api/auth/login')
      expect(bruteForceStatus.allowed).toBe(true)

      // 3. Create session on login
      const mockSession = {
        id: 'session-123',
        userId: testUser.id,
        hotelId: testUser.hotelId,
        role: testUser.role,
        tokenHash: 'hash123',
        userAgent: testMetadata.userAgent,
        ipAddress: testMetadata.ipAddress,
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

      const sessionResult = await createSession({
        userId: testUser.id,
        hotelId: testUser.hotelId,
        role: testUser.role,
        userAgent: testMetadata.userAgent,
        ipAddress: testMetadata.ipAddress
      })

      expect(sessionResult.sessionId).toBeDefined()
      expect(sessionResult.accessToken).toBeDefined()
      expect(sessionResult.refreshToken).toBeDefined()

      // 4. Clear failed attempts on successful login
      vi.mocked(prisma.bruteForceAttempt.updateMany).mockResolvedValue({ count: 1 })
      await clearFailedAttempts(testMetadata.ipAddress, 'ip')
    })

    it('should block login after 5 failed attempts', async () => {
      const ipAddress = '192.168.2.100'
      
      // Simulate 5 failed attempts
      for (let i = 1; i <= 5; i++) {
        vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValueOnce({
          id: '1',
          identifier: ipAddress,
          identifierType: 'ip',
          failedAttempts: i,
          lastAttempt: new Date(),
          isLocked: i === 5,
          lockedUntil: i === 5 ? new Date(Date.now() + 10 * 60 * 1000) : null,
          endpoint: '/api/auth/login'
        } as any)

        const now = new Date()
        const record = {
          id: '1',
          identifier: ipAddress,
          identifierType: 'ip',
          failedAttempts: i,
          lastAttempt: now,
          isLocked: i === 5,
          lockedUntil: i === 5 ? new Date(now.getTime() + 10 * 60 * 1000) : null,
          endpoint: '/api/auth/login'
        }

        if (i < 5) {
          vi.mocked(prisma.bruteForceAttempt.update).mockResolvedValueOnce(record as any)
        } else {
          vi.mocked(prisma.bruteForceAttempt.update).mockResolvedValueOnce({
            ...record,
            isLocked: true,
            lockedUntil: new Date(now.getTime() + 10 * 60 * 1000)
          } as any)
        }

        const result = await recordFailedAttempt(ipAddress, 'ip', '/api/auth/login')

        if (i < 5) {
          expect(result.allowed).toBe(true)
        } else {
          expect(result.allowed).toBe(false)
          expect(result.isLocked).toBe(true)
          expect(result.lockoutRemainingSeconds).toBeDefined()
        }
      }
    })
  })

  describe('Token Rotation Flow', () => {
    it('should rotate tokens and maintain session', async () => {
      // 1. Initial session exists
      const sessionId = 'session-123'
      const refreshToken = 'refresh-token-456'

      // 2. Call refresh endpoint
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'refresh-123',
        sessionId,
        tokenHash: 'refresh-hash',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        rotatedAt: null,
        nextTokenHash: null,
        session: {
          id: sessionId,
          userId: testUser.id,
          hotelId: testUser.hotelId,
          role: testUser.role,
          tokenHash: 'old-hash',
          userAgent: testMetadata.userAgent,
          ipAddress: testMetadata.ipAddress,
          ipRange: '192.168.1',
          deviceFingerprint: 'fp123',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          lastActivity: new Date(),
          isActive: true,
          tokenReuses: 0,
          suspiciousFlags: []
        }
      } as any)

      vi.mocked(prisma.refreshToken.update).mockResolvedValue({
        id: 'refresh-123',
        sessionId,
        tokenHash: 'refresh-hash',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        rotatedAt: new Date(),
        nextTokenHash: 'new-refresh-hash'
      } as any)

      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: 'refresh-124',
        sessionId,
        tokenHash: 'new-refresh-hash',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        rotatedAt: null,
        nextTokenHash: null
      } as any)

      vi.mocked(prisma.session.update).mockResolvedValue({
        id: sessionId,
        userId: testUser.id,
        hotelId: testUser.hotelId,
        role: testUser.role,
        tokenHash: 'new-hash',
        userAgent: testMetadata.userAgent,
        ipAddress: testMetadata.ipAddress,
        ipRange: '192.168.1',
        deviceFingerprint: 'fp123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        lastActivity: new Date(),
        isActive: true,
        tokenReuses: 1,
        suspiciousFlags: []
      } as any)

      // 3. Perform rotation
      const rotationResult = await rotateSession(refreshToken, testMetadata)

      expect(rotationResult.newAccessToken).toBeDefined()
      expect(rotationResult.newRefreshToken).toBeDefined()
      expect(rotationResult.newAccessTokenHash).toBeDefined()
      expect(rotationResult.newRefreshTokenHash).toBeDefined()
    })
  })

  describe('Session Hijacking Detection', () => {
    it('should detect IP range change', async () => {
      const storedMetadata = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.1'
      }

      const currentMetadata = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.2.1' // Different subnet
      }

      const result = detectSessionHijacking(currentMetadata, storedMetadata)

      expect(result.suspicious).toBe(true)
      expect(result.severity).toBeGreaterThanOrEqual('medium')
      expect(result.flags).toContain('DIFFERENT_IP_RANGE')
    })

    it('should detect User-Agent change', async () => {
      const storedMetadata = {
        userAgent: 'Firefox/120.0',
        ipAddress: '192.168.1.1'
      }

      const currentMetadata = {
        userAgent: 'Chrome/121.0',
        ipAddress: '192.168.1.1' // Same IP, different browser
      }

      const result = detectSessionHijacking(currentMetadata, storedMetadata)

      expect(result.suspicious).toBe(true)
      expect(result.flags).toContain('DIFFERENT_USER_AGENT')
    })

    it('should allow minor UA version changes', async () => {
      const storedMetadata = {
        userAgent: 'Firefox/120.0',
        ipAddress: '192.168.1.1'
      }

      const currentMetadata = {
        userAgent: 'Firefox/120.1', // Minor version change
        ipAddress: '192.168.1.1'
      }

      const result = detectSessionHijacking(currentMetadata, storedMetadata)

      expect(result.suspicious).toBe(false)
      expect(result.flags).not.toContain('DIFFERENT_USER_AGENT')
    })
  })

  describe('Session Cleanup', () => {
    it('should cleanup expired sessions and tokens', async () => {
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 5 })
      vi.mocked(prisma.session.updateMany).mockResolvedValue({ count: 2 })

      const result = await cleanupExpiredSessions()

      expect(result.deletedRefreshTokens).toBe(5)
      expect(result.inactivatedSessions).toBe(2)
      expect(result.timestamp).toBeDefined()
    })
  })

  describe('Logout Flow', () => {
    it('should invalidate session and revoke tokens', async () => {
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
})
