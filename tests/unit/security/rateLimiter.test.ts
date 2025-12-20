/**
 * Rate Limiting Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  checkRateLimitMultiple,
  resetRateLimit,
  getRateLimitStatus,
  cleanupRateLimitEntries,
  getRateLimitConfig,
  DEFAULT_RATE_LIMITS
} from '@/lib/security/rateLimiter'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    rateLimitEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}))

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should create new rate limit entry on first request', async () => {
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(null)
      
      const mockEntry = {
        id: 'entry-1',
        identifier: '192.168.1.1',
        endpoint: '/api/auth/login',
        attempts: 1,
        lastAttempt: new Date(),
        resetAt: new Date(Date.now() + 60000)
      }
      
      vi.mocked(prisma.rateLimitEntry.create).mockResolvedValue(mockEntry as any)
      vi.mocked(prisma.rateLimitEntry.update).mockResolvedValue(mockEntry as any)

      const result = await checkRateLimit('192.168.1.1', '/api/auth/login')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
      expect(result.resetAt).toBeDefined()
    })

    it('should increment attempt counter', async () => {
      const now = new Date()
      const resetAt = new Date(now.getTime() + 60000)
      
      const mockEntry = {
        id: 'entry-1',
        identifier: '192.168.1.1',
        endpoint: '/api/auth/login',
        attempts: 3,
        lastAttempt: now,
        resetAt: resetAt
      }
      
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(mockEntry as any)
      vi.mocked(prisma.rateLimitEntry.update).mockResolvedValue(mockEntry as any)

      const result = await checkRateLimit('192.168.1.1', '/api/auth/login')

      expect(result.allowed).toBe(true)
      expect(result.resetAt).toEqual(resetAt)
    })

    it('should block request when limit exceeded', async () => {
      const now = new Date()
      const resetAt = new Date(now.getTime() + 10000)
      
      const mockEntry = {
        id: 'entry-1',
        identifier: '192.168.1.1',
        endpoint: '/api/auth/login',
        attempts: 5, // At or exceeding limit
        lastAttempt: now,
        resetAt: resetAt
      }
      
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(mockEntry as any)
      vi.mocked(prisma.rateLimitEntry.update).mockResolvedValue(mockEntry as any)

      const result = await checkRateLimit('192.168.1.1', '/api/auth/login')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeDefined()
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('should reset after window expires', async () => {
      const now = new Date()
      const expiredResetAt = new Date(now.getTime() - 1000) // Expired window
      
      const mockEntry = {
        id: 'entry-1',
        identifier: '192.168.1.1',
        endpoint: '/api/auth/login',
        attempts: 10,
        lastAttempt: new Date(now.getTime() - 120000),
        resetAt: expiredResetAt
      }
      
      const resetEntry = {
        ...mockEntry,
        attempts: 1,
        lastAttempt: now,
        resetAt: new Date(now.getTime() + 60000)
      }
      
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(mockEntry as any)
      vi.mocked(prisma.rateLimitEntry.update).mockResolvedValue(resetEntry as any)

      const result = await checkRateLimit('192.168.1.1', '/api/auth/login')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })
  })

  describe('checkRateLimitMultiple', () => {
    it('should return most restrictive limit', async () => {
      const allowedEntry = {
        id: '1',
        identifier: '192.168.1.1',
        endpoint: '/api/auth/login',
        attempts: 2,
        lastAttempt: new Date(),
        resetAt: new Date(Date.now() + 60000)
      }
      
      const restrictedEntry = {
        id: '2',
        identifier: 'user@example.com',
        endpoint: '/api/auth/login',
        attempts: 5,
        lastAttempt: new Date(),
        resetAt: new Date(Date.now() + 20000)
      }

      vi.mocked(prisma.rateLimitEntry.findUnique)
        .mockResolvedValueOnce(allowedEntry as any)
        .mockResolvedValueOnce(restrictedEntry as any)

      vi.mocked(prisma.rateLimitEntry.update)
        .mockResolvedValueOnce(allowedEntry as any)
        .mockResolvedValueOnce({ ...restrictedEntry, attempts: 6 } as any)

      const result = await checkRateLimitMultiple(
        ['192.168.1.1', 'user@example.com'],
        '/api/auth/login'
      )

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('resetRateLimit', () => {
    it('should reset attempts to zero', async () => {
      vi.mocked(prisma.rateLimitEntry.updateMany).mockResolvedValue({ count: 1 })

      await resetRateLimit('192.168.1.1', '/api/auth/login')

      expect(prisma.rateLimitEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            identifier: '192.168.1.1',
            endpoint: '/api/auth/login'
          },
          data: {
            attempts: 0,
            resetAt: expect.any(Date)
          }
        })
      )
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      const mockEntry = {
        id: 'entry-1',
        identifier: '192.168.1.1',
        endpoint: '/api/auth/login',
        attempts: 3,
        lastAttempt: new Date(),
        resetAt: new Date(Date.now() + 30000)
      }
      
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(mockEntry as any)

      const result = await getRateLimitStatus('192.168.1.1', '/api/auth/login')

      expect(result.identifier).toBe('192.168.1.1')
      expect(result.endpoint).toBe('/api/auth/login')
      expect(result.attempts).toBe(3)
      expect(result.remaining).toBe(2) // 5 max - 3 used
    })

    it('should return default status for non-existent entry', async () => {
      vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(null)

      const result = await getRateLimitStatus('192.168.1.1', '/api/auth/login')

      expect(result.attempts).toBe(0)
      expect(result.remaining).toBe(5) // Default limit
    })
  })

  describe('cleanupRateLimitEntries', () => {
    it('should delete old entries', async () => {
      vi.mocked(prisma.rateLimitEntry.deleteMany).mockResolvedValue({ count: 10 })

      const result = await cleanupRateLimitEntries()

      expect(result.deletedCount).toBe(10)
      expect(result.cutoffDate).toBeDefined()
    })
  })

  describe('getRateLimitConfig', () => {
    it('should return default config for known endpoint', () => {
      const config = getRateLimitConfig('/api/auth/login')

      expect(config.endpoint).toBe('/api/auth/login')
      expect(config.maxAttempts).toBe(5)
      expect(config.windowMs).toBe(60 * 1000)
    })

    it('should return fallback config for unknown endpoint', () => {
      const config = getRateLimitConfig('/api/unknown')

      expect(config.maxAttempts).toBe(10)
      expect(config.windowMs).toBe(60 * 1000)
    })
  })

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have all required endpoints configured', () => {
      expect(DEFAULT_RATE_LIMITS.LOGIN).toBeDefined()
      expect(DEFAULT_RATE_LIMITS.QR_VALIDATE).toBeDefined()
      expect(DEFAULT_RATE_LIMITS.MAGIC_LINK).toBeDefined()
      expect(DEFAULT_RATE_LIMITS.PASSWORD_RESET).toBeDefined()
      expect(DEFAULT_RATE_LIMITS.WIDGET_REQUEST).toBeDefined()
    })

    it('should have correct limits for each endpoint', () => {
      expect(DEFAULT_RATE_LIMITS.LOGIN.maxAttempts).toBe(5)
      expect(DEFAULT_RATE_LIMITS.QR_VALIDATE.maxAttempts).toBe(3)
      expect(DEFAULT_RATE_LIMITS.MAGIC_LINK.maxAttempts).toBe(5)
      expect(DEFAULT_RATE_LIMITS.PASSWORD_RESET.maxAttempts).toBe(3)
    })
  })
})
