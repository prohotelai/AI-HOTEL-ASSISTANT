/**
 * Brute Force Protection Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordFailedAttempt,
  checkBruteForceStatus,
  clearFailedAttempts,
  manuallyUnlock,
  getBruteForceHistory,
  getLockedIdentifiers,
  cleanupBruteForceRecords
} from '@/lib/security/bruteForceProtection'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bruteForceAttempt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

describe('Brute Force Protection', () => {
  const testIP = '192.168.1.1'
  const testEmail = 'user@example.com'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordFailedAttempt', () => {
    it('should create new record on first failed attempt', async () => {
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(null)
      
      const mockRecord = {
        id: '1',
        identifier: testIP,
        identifierType: 'ip' as const,
        failedAttempts: 1,
        lastAttempt: new Date(),
        isLocked: false,
        lockedUntil: null,
        endpoint: '/api/auth/login'
      }
      
      vi.mocked(prisma.bruteForceAttempt.create).mockResolvedValue(mockRecord as any)

      const result = await recordFailedAttempt(testIP, 'ip', '/api/auth/login')

      expect(result.allowed).toBe(true)
      expect(result.isLocked).toBe(false)
      expect(result.attemptCount).toBe(1)
    })

    it('should increment failed attempts', async () => {
      const mockRecord = {
        id: '1',
        identifier: testIP,
        identifierType: 'ip' as const,
        failedAttempts: 3,
        lastAttempt: new Date(),
        isLocked: false,
        lockedUntil: null,
        endpoint: '/api/auth/login'
      }
      
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(mockRecord as any)
      
      const updatedRecord = { ...mockRecord, failedAttempts: 4 }
      vi.mocked(prisma.bruteForceAttempt.update).mockResolvedValue(updatedRecord as any)

      const result = await recordFailedAttempt(testIP, 'ip', '/api/auth/login')

      expect(result.attemptCount).toBe(4)
    })

    it('should lock after max attempts exceeded', async () => {
      const mockRecord = {
        id: '1',
        identifier: testIP,
        identifierType: 'ip' as const,
        failedAttempts: 4,
        lastAttempt: new Date(),
        isLocked: false,
        lockedUntil: null,
        endpoint: '/api/auth/login'
      }
      
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(mockRecord as any)
      
      const now = new Date()
      const lockedUntil = new Date(now.getTime() + 10 * 60 * 1000)
      
      const lockedRecord = {
        ...mockRecord,
        failedAttempts: 5,
        isLocked: true,
        lockedUntil: lockedUntil,
        lastAttempt: now
      }
      
      vi.mocked(prisma.bruteForceAttempt.update).mockResolvedValue(lockedRecord as any)

      const result = await recordFailedAttempt(testIP, 'ip', '/api/auth/login')

      expect(result.allowed).toBe(false)
      expect(result.isLocked).toBe(true)
      expect(result.lockoutRemainingSeconds).toBeDefined()
      expect(result.lockoutRemainingSeconds).toBeGreaterThan(0)
    })

    it('should reset after lockout expires', async () => {
      const now = new Date()
      const expiredLockout = new Date(now.getTime() - 1000)
      
      const mockRecord = {
        id: '1',
        identifier: testIP,
        identifierType: 'ip' as const,
        failedAttempts: 5,
        lastAttempt: new Date(now.getTime() - 700000),
        isLocked: true,
        lockedUntil: expiredLockout,
        endpoint: '/api/auth/login'
      }
      
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(mockRecord as any)
      
      const resetRecord = {
        ...mockRecord,
        failedAttempts: 1,
        isLocked: false,
        lockedUntil: null,
        lastAttempt: now
      }
      
      vi.mocked(prisma.bruteForceAttempt.update).mockResolvedValue(resetRecord as any)

      const result = await recordFailedAttempt(testIP, 'ip', '/api/auth/login')

      expect(result.allowed).toBe(true)
      expect(result.isLocked).toBe(false)
    })
  })

  describe('checkBruteForceStatus', () => {
    it('should return allowed status for no record', async () => {
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(null)

      const result = await checkBruteForceStatus(testIP, 'ip')

      expect(result.allowed).toBe(true)
      expect(result.isLocked).toBe(false)
      expect(result.attemptCount).toBe(0)
    })

    it('should return locked status for active lockout', async () => {
      const now = new Date()
      const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000)
      
      const mockRecord = {
        id: '1',
        identifier: testIP,
        identifierType: 'ip' as const,
        failedAttempts: 5,
        lastAttempt: now,
        isLocked: true,
        lockedUntil: lockedUntil,
        endpoint: '/api/auth/login'
      }
      
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(mockRecord as any)

      const result = await checkBruteForceStatus(testIP, 'ip')

      expect(result.allowed).toBe(false)
      expect(result.isLocked).toBe(true)
      expect(result.lockoutRemainingSeconds).toBeGreaterThan(0)
      expect(result.lockoutRemainingSeconds).toBeLessThanOrEqual(300)
    })
  })

  describe('clearFailedAttempts', () => {
    it('should reset attempts to zero', async () => {
      vi.mocked(prisma.bruteForceAttempt.updateMany).mockResolvedValue({ count: 1 })

      await clearFailedAttempts(testIP, 'ip')

      expect(prisma.bruteForceAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            identifier: testIP,
            identifierType: 'ip'
          },
          data: {
            failedAttempts: 0,
            lastAttempt: expect.any(Date),
            isLocked: false,
            lockedUntil: null
          }
        })
      )
    })
  })

  describe('manuallyUnlock', () => {
    it('should unlock a locked identifier', async () => {
      vi.mocked(prisma.bruteForceAttempt.updateMany).mockResolvedValue({ count: 1 })

      await manuallyUnlock(testIP, 'ip')

      expect(prisma.bruteForceAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            identifier: testIP,
            identifierType: 'ip'
          },
          data: {
            isLocked: false,
            lockedUntil: null
          }
        })
      )
    })
  })

  describe('getBruteForceHistory', () => {
    it('should return history for identifier', async () => {
      const now = new Date()
      const mockRecord = {
        id: '1',
        identifier: testIP,
        identifierType: 'ip' as const,
        failedAttempts: 3,
        lastAttempt: now,
        isLocked: false,
        lockedUntil: null,
        endpoint: '/api/auth/login'
      }
      
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(mockRecord as any)

      const result = await getBruteForceHistory(testIP, 'ip')

      expect(result.found).toBe(true)
      expect(result.failedAttempts).toBe(3)
      expect(result.identifier).toBe(testIP)
    })

    it('should return not found for missing record', async () => {
      vi.mocked(prisma.bruteForceAttempt.findUnique).mockResolvedValue(null)

      const result = await getBruteForceHistory(testIP, 'ip')

      expect(result.found).toBe(false)
    })
  })

  describe('getLockedIdentifiers', () => {
    it('should return all currently locked identifiers', async () => {
      const now = new Date()
      const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000)
      
      const mockLocked = [
        {
          identifier: '192.168.1.1',
          identifierType: 'ip' as const,
          failedAttempts: 5,
          lockedUntil: lockedUntil,
          endpoint: '/api/auth/login'
        },
        {
          identifier: 'attacker@example.com',
          identifierType: 'email' as const,
          failedAttempts: 6,
          lockedUntil: lockedUntil,
          endpoint: '/api/auth/login'
        }
      ]
      
      vi.mocked(prisma.bruteForceAttempt.findMany).mockResolvedValue(mockLocked as any)

      const result = await getLockedIdentifiers()

      expect(result).toHaveLength(2)
      expect(result[0].identifier).toBe('192.168.1.1')
    })

    it('should filter by identifier type', async () => {
      const now = new Date()
      const lockedUntil = new Date(now.getTime() + 5 * 60 * 1000)
      
      const mockLocked = [
        {
          identifier: '192.168.1.1',
          identifierType: 'ip' as const,
          failedAttempts: 5,
          lockedUntil: lockedUntil,
          endpoint: '/api/auth/login'
        }
      ]
      
      vi.mocked(prisma.bruteForceAttempt.findMany).mockResolvedValue(mockLocked as any)

      const result = await getLockedIdentifiers('ip')

      expect(result).toHaveLength(1)
    })
  })

  describe('cleanupBruteForceRecords', () => {
    it('should delete old records', async () => {
      vi.mocked(prisma.bruteForceAttempt.deleteMany).mockResolvedValue({ count: 15 })

      const result = await cleanupBruteForceRecords()

      expect(result.deletedCount).toBe(15)
      expect(result.cutoffDate).toBeDefined()
    })
  })
})
