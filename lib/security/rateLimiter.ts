/**
 * Rate Limiting Service
 * Enforces per-endpoint rate limits to prevent abuse
 * 
 * STATUS: Phase 1 - ✅ COMPLETE - Fully functional
 * RateLimitEntry model implemented and operational.
 */

import { prisma } from '@/lib/prisma'

export interface RateLimitConfig {
  endpoint: string
  maxAttempts: number
  windowMs: number // Window duration in milliseconds
}

export interface RateLimitCheckResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfterSeconds?: number
}

// Default rate limit configurations
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  LOGIN: {
    endpoint: '/api/auth/login',
    maxAttempts: 5,
    windowMs: 60 * 1000 // 1 minute
  },
  QR_VALIDATE: {
    endpoint: '/api/qr/validate',
    maxAttempts: 3,
    windowMs: 60 * 1000 // 1 minute
  },
  QR_GENERATE: {
    endpoint: '/api/qr/generate',
    maxAttempts: 10,
    windowMs: 60 * 1000 // 1 minute
  },
  MAGIC_LINK: {
    endpoint: '/api/auth/magic-link',
    maxAttempts: 5,
    windowMs: 60 * 1000 // 1 minute
  },
  PASSWORD_RESET: {
    endpoint: '/api/auth/password-reset',
    maxAttempts: 3,
    windowMs: 60 * 1000 // 1 minute
  },
  WIDGET_REQUEST: {
    endpoint: '/api/widget',
    maxAttempts: 100,
    windowMs: 60 * 1000 // 1 minute
  },
  CHAT_MESSAGE: {
    endpoint: '/api/chat',
    maxAttempts: 30,
    windowMs: 60 * 1000 // 1 minute
  }
}

/**
 * Check if request is within rate limit
 * @param identifier - Unique identifier (IP, user ID, email)
 * @param endpoint - API endpoint
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitCheckResult> {
  const rateConfig = resolveRateLimitConfig(endpoint, config)
  
  // Phase 1: RateLimitEntry model implemented - full rate limiting active
  const now = new Date()
  
  // Find or create rate limit entry
  let entry = await prisma.rateLimitEntry.findUnique({
    where: {
      identifier_endpoint: {
        identifier,
        endpoint: rateConfig.endpoint
      }
    }
  })
  
  if (!entry) {
    // Create new entry
    entry = await prisma.rateLimitEntry.create({
      data: {
        identifier,
        endpoint: rateConfig.endpoint,
        attempts: 0,
        lastAttempt: now,
        resetAt: new Date(now.getTime() + rateConfig.windowMs)
      }
    })
  } else if (entry.resetAt < now) {
    // Reset window has expired, create new window
    entry = await prisma.rateLimitEntry.update({
      where: { id: entry.id },
      data: {
        attempts: 0,
        lastAttempt: now,
        resetAt: new Date(now.getTime() + rateConfig.windowMs)
      }
    })
  }
  
  const attemptsUsed = entry.attempts + 1

  await prisma.rateLimitEntry.update({
    where: { id: entry.id },
    data: {
      attempts: attemptsUsed,
      lastAttempt: now
    }
  })

  // Check if limit exceeded
  const allowed = attemptsUsed <= rateConfig.maxAttempts
  const remaining = Math.max(0, rateConfig.maxAttempts - attemptsUsed)
  const retryAfterSeconds = allowed ? undefined : Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds
  }
}

/**
 * Check multiple identifiers (e.g., IP and user ID)
 * Returns most restrictive result
 * @param identifiers - Array of identifiers to check
 * @param endpoint - API endpoint
 * @param config - Rate limit configuration
 * @returns Most restrictive rate limit result
 */
export async function checkRateLimitMultiple(
  identifiers: string[],
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitCheckResult> {
  const results = await Promise.all(
    identifiers.map(id => checkRateLimit(id, endpoint, config))
  )
  
  // Return most restrictive (earliest reset, lowest remaining)
  let mostRestrictive = results[0]
  for (const result of results.slice(1)) {
    if (!result.allowed) {
      mostRestrictive = result
      break
    }
    if (result.remaining < mostRestrictive.remaining) {
      mostRestrictive = result
    }
  }
  
  return mostRestrictive
}

/**
 * Reset rate limit for an identifier
 * @param identifier - Identifier to reset
 * @param endpoint - Endpoint to reset
 */
export async function resetRateLimit(
  identifier: string,
  endpoint: string
) {
  // Phase 1: RateLimitEntry model implemented - fully functional
  await prisma.rateLimitEntry.updateMany({
    where: {
      identifier,
      endpoint
    },
    data: {
      attempts: 0,
      resetAt: new Date()
    }
  })
}

/**
 * Get rate limit status for an identifier
 * @param identifier - Identifier
 * @param endpoint - Endpoint
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  identifier: string,
  endpoint: string
) {
  // Phase 1: RateLimitEntry model implemented - fully functional
  const entry = await prisma.rateLimitEntry.findUnique({
    where: {
      identifier_endpoint: {
        identifier,
        endpoint
      }
    }
  })
  
  const config = resolveRateLimitConfig(endpoint)

  if (!entry) {
    return {
      identifier,
      endpoint,
      attempts: 0,
      remaining: config.maxAttempts,
      resetAt: new Date()
    }
  }
  
  return {
    identifier,
    endpoint,
    attempts: entry.attempts,
    remaining: Math.max(0, config.maxAttempts - entry.attempts),
    resetAt: entry.resetAt
  }
}

/**
 * Clean up old rate limit entries
 * Should be run periodically to avoid unbounded growth
 * @param olderThanMs - Delete entries older than this many milliseconds
 */
export async function cleanupRateLimitEntries(
  olderThanMs: number = 24 * 60 * 60 * 1000 // 24 hours
) {
  // Phase 1: RateLimitEntry model implemented - fully functional
  const cutoff = new Date(Date.now() - olderThanMs)
  
  const deleted = await prisma.rateLimitEntry.deleteMany({
    where: {
      resetAt: { lt: cutoff }
    }
  })
  
  return {
    deletedCount: deleted.count,
    cutoffDate: cutoff
  }
}

/**
 * Get the configuration for an endpoint
 * @param endpoint - Endpoint name
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(endpoint: string): RateLimitConfig {
  return resolveRateLimitConfig(endpoint)
}

function resolveRateLimitConfig(endpoint: string, override?: RateLimitConfig): RateLimitConfig {
  if (override) return override

  const match = Object.values(DEFAULT_RATE_LIMITS).find((cfg) => cfg.endpoint === endpoint)

  return match || {
    endpoint,
    maxAttempts: 10,
    windowMs: 60 * 1000
  }
}
