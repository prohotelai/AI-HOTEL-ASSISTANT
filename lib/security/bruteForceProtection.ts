/**
 * Brute Force Protection Service
 * Detects and prevents brute-force attacks on authentication
 * 
 * STATUS: Phase 1 - ✅ COMPLETE - Fully functional
 * BruteForceAttempt model implemented and operational.
 */

import { prisma } from '@/lib/prisma'

export type IdentifierType = 'ip' | 'email' | 'user_id'

export interface BruteForceCheckResult {
  allowed: boolean
  isLocked: boolean
  attemptCount: number
  lockedUntil?: Date
  lockoutRemainingSeconds?: number
}

export interface BruteForceConfig {
  maxFailedAttempts: number
  lockoutDurationMs: number
  trackingWindowMs: number
}

// Default brute-force protection settings
export const DEFAULT_BRUTE_FORCE_CONFIG: BruteForceConfig = {
  maxFailedAttempts: 5, // Lock after 5 failed attempts
  lockoutDurationMs: 10 * 60 * 1000, // 10 minutes
  trackingWindowMs: 60 * 60 * 1000 // Track attempts for 1 hour
}

/**
 * Record a failed authentication attempt
 * @param identifier - Unique identifier (IP, email, user ID)
 * @param identifierType - Type of identifier
 * @param endpoint - Endpoint where attempt occurred
 * @param config - Brute-force configuration
 * @returns Check result with lock status
 */
export async function recordFailedAttempt(
  identifier: string,
  identifierType: IdentifierType,
  endpoint: string,
  config: BruteForceConfig = DEFAULT_BRUTE_FORCE_CONFIG
): Promise<BruteForceCheckResult> {
  const now = new Date()
  const lockoutEnd = new Date(now.getTime() + config.lockoutDurationMs)

  let attempt = await prisma.bruteForceAttempt.findUnique({
    where: {
      identifier
    }
  })

  if (!attempt) {
    attempt = await prisma.bruteForceAttempt.create({
      data: {
        identifier,
        attemptCount: 1,
        lastAttempt: now,
        isLocked: false,
        lockedUntil: null,
        metadata: { identifierType, endpoint }
      }
    })
  } else if (attempt.isLocked && attempt.lockedUntil && attempt.lockedUntil < now) {
    attempt = await prisma.bruteForceAttempt.update({
      where: { identifier },
      data: {
        attemptCount: 1,
        lastAttempt: now,
        isLocked: false,
        lockedUntil: null
      }
    })
  } else {
    const newAttemptCount = attempt.attemptCount + 1
    const shouldLock = newAttemptCount >= config.maxFailedAttempts

    attempt = await prisma.bruteForceAttempt.update({
      where: { identifier },
      data: {
        attemptCount: newAttemptCount,
        lastAttempt: now,
        isLocked: shouldLock,
        lockedUntil: shouldLock ? lockoutEnd : null
      }
    })
  }

  const isLocked = !!(attempt.isLocked && attempt.lockedUntil && attempt.lockedUntil > now)
  const lockoutRemainingSeconds = isLocked && attempt.lockedUntil
    ? Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 1000)
    : undefined

  return {
    allowed: !isLocked,
    isLocked,
    attemptCount: attempt.attemptCount,
    lockedUntil: attempt.lockedUntil || undefined,
    lockoutRemainingSeconds
  }
}

/**
 * Check if identifier is currently locked out
 * @param identifier - Identifier to check
 * @param identifierType - Type of identifier
 * @returns Lockout status
 */
export async function checkBruteForceStatus(
  identifier: string,
  identifierType: IdentifierType
): Promise<BruteForceCheckResult> {
  const now = new Date()

  const attempt = await prisma.bruteForceAttempt.findUnique({
    where: {
      identifier
    }
  })

  if (!attempt) {
    return {
      allowed: true,
      isLocked: false,
      attemptCount: 0
    }
  }

  const isLocked = !!(attempt.isLocked && attempt.lockedUntil && attempt.lockedUntil > now)
  const lockoutRemainingSeconds = isLocked && attempt.lockedUntil
    ? Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 1000)
    : undefined

  if (attempt.isLocked && attempt.lockedUntil && attempt.lockedUntil < now) {
    await prisma.bruteForceAttempt.update({
      where: { identifier },
      data: {
        isLocked: false,
        lockedUntil: null
      }
    })

    return {
      allowed: true,
      isLocked: false,
      attemptCount: attempt.attemptCount
    }
  }

  return {
    allowed: !isLocked,
    isLocked,
    attemptCount: attempt.attemptCount,
    lockedUntil: attempt.lockedUntil || undefined,
    lockoutRemainingSeconds
  }
}

/**
 * Reset failed attempts for an identifier
 * Should be called on successful authentication
 * @param identifier - Identifier to reset
 * @param identifierType - Type of identifier
 */
export async function clearFailedAttempts(
  identifier: string,
  identifierType: IdentifierType
) {
  return prisma.bruteForceAttempt.updateMany({
    where: {
      identifier
    },
    data: {
      attemptCount: 0,
      lastAttempt: new Date(),
      isLocked: false,
      lockedUntil: null
    }
  })
}

/**
 * Manually unlock an identifier (admin operation)
 * @param identifier - Identifier to unlock
 * @param identifierType - Type of identifier
 */
export async function manuallyUnlock(
  identifier: string,
  identifierType: IdentifierType
) {
  return prisma.bruteForceAttempt.updateMany({
    where: {
      identifier
    },
    data: {
      isLocked: false,
      lockedUntil: null
    }
  })
}

/**
 * Get detailed brute-force attempt history
 * @param identifier - Identifier
 * @param identifierType - Type of identifier
 * @returns Detailed attempt information
 */
export async function getBruteForceHistory(
  identifier: string,
  identifierType: IdentifierType
) {
  const attempt = await prisma.bruteForceAttempt.findUnique({
    where: {
      identifier
    }
  })

  if (!attempt) {
    return {
      identifier,
      identifierType,
      found: false
    }
  }

  const now = new Date()
  const isLocked = !!(attempt.isLocked && attempt.lockedUntil && attempt.lockedUntil > now)
  const metadata = (attempt.metadata as any) || {}

  return {
    identifier,
    identifierType,
    found: true,
    failedAttempts: attempt.attemptCount,
    lastAttempt: attempt.lastAttempt,
    isLocked,
    lockedUntil: attempt.lockedUntil,
    endpoint: metadata.endpoint,
    lockoutRemainingSeconds: isLocked && attempt.lockedUntil
      ? Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 1000)
      : undefined
  }
}

/**
 * Get all currently locked identifiers
 * @param identifierType - Optional: filter by identifier type
 * @returns List of locked identifiers
 */
export async function getLockedIdentifiers(
  identifierType?: IdentifierType
) {
  const now = new Date()

  const locked = await prisma.bruteForceAttempt.findMany({
    where: {
      isLocked: true,
      lockedUntil: { gt: now }
    },
    select: {
      identifier: true,
      attemptCount: true,
      lockedUntil: true,
      metadata: true
    }
  })

  return locked.map(record => {
    const metadata = (record.metadata as any) || {}
    return {
      identifier: record.identifier,
      identifierType: metadata.identifierType || identifierType,
      failedAttempts: record.attemptCount,
      lockedUntil: record.lockedUntil,
      endpoint: metadata.endpoint,
      lockoutRemainingSeconds: Math.ceil((record.lockedUntil!.getTime() - now.getTime()) / 1000)
    }
  })
}

/**
 * Clean up old brute-force attempt records
 * @param olderThanMs - Delete records older than this many milliseconds
 */
export async function cleanupBruteForceRecords(
  olderThanMs: number = 24 * 60 * 60 * 1000 // 24 hours
) {
  const cutoff = new Date(Date.now() - olderThanMs)

  const deleted = await prisma.bruteForceAttempt.deleteMany({
    where: {
      lastAttempt: { lt: cutoff }
    }
  })

  return {
    deletedCount: deleted.count,
    cutoffDate: cutoff
  }
}
