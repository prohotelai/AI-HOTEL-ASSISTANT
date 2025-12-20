/**
 * Redis/Upstash Integration
 *
 * Handles:
 * - Cache for chat conversations
 * - Queue system for async jobs
 * - Session storage
 * - Rate limiting
 * - Pub/sub for real-time features
 */

import Redis from 'ioredis'
import { isRedisConfigured, requireRedis } from '@/lib/env'
import { logger } from '@/lib/logger'

// ============================================================================
// 1. REDIS CLIENT (singleton)
// ============================================================================

let redisClient: Redis | null = null

/**
 * Validate Redis configuration for production
 */
function validateRedisProductionConfig(url: string) {
  const isProd = process.env.NODE_ENV === 'production'
  
  if (isProd) {
    // Enforce TLS in production
    if (!url.startsWith('rediss://')) {
      throw new Error(
        'SECURITY: Redis must use TLS (rediss://) in production. ' +
        'Set REDIS_URL with rediss:// prefix.'
      )
    }
    
    // Enforce authentication in production
    const hasPassword = url.includes(':') && url.split('@')[0].split(':').length > 2
    if (!hasPassword && !process.env.REDIS_PASSWORD) {
      throw new Error(
        'SECURITY: Redis authentication required in production. ' +
        'Set REDIS_PASSWORD or include password in REDIS_URL.'
      )
    }
  }
}

export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null
  }

  if (!redisClient) {
    try {
      const url = requireRedis()
      
      // Validate production configuration
      validateRedisProductionConfig(url)
      
      const redisOptions: any = {
        // Upstash-specific options
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: false,
        // Connection pooling
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      }
      
      // Add password if provided separately
      if (process.env.REDIS_PASSWORD) {
        redisOptions.password = process.env.REDIS_PASSWORD
      }
      
      // Enforce TLS in production
      if (process.env.NODE_ENV === 'production') {
        redisOptions.tls = {
          rejectUnauthorized: true
        }
      }
      
      redisClient = new Redis(url, redisOptions)

      redisClient.on('connect', () => {
        logger.info('Redis client connected')
      })

      redisClient.on('error', (error) => {
        logger.error('Redis client error', { error: error.message })
      })

      redisClient.on('close', () => {
        logger.warn('Redis client connection closed')
      })
    } catch (error) {
      logger.warn('Failed to initialize Redis client', { error: (error as Error).message })
      redisClient = null
    }
  }

  return redisClient
}

// ============================================================================
// 2. CACHE OPERATIONS
// ============================================================================

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const value = await client.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    logger.warn('Failed to get cache', { key, error: (error as Error).message })
    return null
  }
}

/**
 * Set cached value with optional TTL (seconds)
 */
export async function setCached(
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    const serialized = JSON.stringify(value)
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized)
    } else {
      await client.set(key, serialized)
    }
    return true
  } catch (error) {
    logger.warn('Failed to set cache', { key, error: (error as Error).message })
    return false
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.del(key)
    return true
  } catch (error) {
    logger.warn('Failed to delete cache', { key, error: (error as Error).message })
    return false
  }
}

/**
 * Clear all keys matching pattern
 */
export async function clearCachePattern(pattern: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
    return true
  } catch (error) {
    logger.warn('Failed to clear cache pattern', { pattern, error: (error as Error).message })
    return false
  }
}

// ============================================================================
// 3. RATE LIMITING
// ============================================================================

/**
 * Check and increment rate limit
 * Returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const client = getRedisClient()

  if (!client) {
    // If Redis not available, allow request (fail-open)
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    }
  }

  try {
    const current = await client.incr(key)

    if (current === 1) {
      // First request in window
      await client.expire(key, windowSeconds)
    }

    const ttl = await client.ttl(key)
    const resetAt = new Date(Date.now() + ttl * 1000)

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    }
  } catch (error) {
    logger.warn('Rate limit check failed', { key, error: (error as Error).message })
    // Fail-open: allow request if Redis fails
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    }
  }
}

// ============================================================================
// 4. PUB/SUB FOR REAL-TIME FEATURES
// ============================================================================

type SubscriberCallback = (message: any) => void
const subscribers = new Map<string, Set<SubscriberCallback>>()
let pubsubClient: Redis | null = null

/**
 * Subscribe to channel
 */
export async function subscribeToChannel(channel: string, callback: SubscriberCallback) {
  const client = getRedisClient()
  if (!client) return

  if (!pubsubClient) {
    pubsubClient = client.duplicate()
  }

  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set())

    pubsubClient.on('message', (ch, msg) => {
      if (ch === channel) {
        const callbacks = subscribers.get(channel)
        if (callbacks) {
          const parsed = JSON.parse(msg)
          callbacks.forEach((cb) => {
            try {
              cb(parsed)
            } catch (error) {
              logger.error('Subscriber callback error', {
                channel,
                error: (error as Error).message,
              })
            }
          })
        }
      }
    })

    await pubsubClient.subscribe(channel)
  }

  subscribers.get(channel)?.add(callback)
}

/**
 * Unsubscribe from channel
 */
export function unsubscribeFromChannel(channel: string, callback: SubscriberCallback) {
  const callbacks = subscribers.get(channel)
  if (!callbacks) return

  callbacks.delete(callback)

  if (callbacks.size === 0) {
    subscribers.delete(channel)
    pubsubClient?.unsubscribe(channel)
  }
}

/**
 * Publish message to channel
 */
export async function publishToChannel(channel: string, message: any): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.publish(channel, JSON.stringify(message))
    return true
  } catch (error) {
    logger.warn('Failed to publish message', {
      channel,
      error: (error as Error).message,
    })
    return false
  }
}

// ============================================================================
// 5. CLEANUP
// ============================================================================

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
  if (pubsubClient) {
    await pubsubClient.quit()
    pubsubClient = null
  }
}
