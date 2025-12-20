/**
 * Redis-based Distributed Event Bus
 * 
 * Replaces in-memory EventEmitter with Redis pub/sub for multi-instance deployments.
 * Supports both local development (in-memory) and production (Redis) modes.
 * 
 * Features:
 * - Distributed event publishing across multiple server instances
 * - Event serialization/deserialization with type safety
 * - Backward compatible with existing EventEmitter interface
 * - Automatic reconnection and error handling
 * - Channel-based pub/sub with wildcard patterns
 * - Event history for debugging
 * 
 * Usage:
 * ```typescript
 * import { eventBus } from '@/lib/events/redisEventBus'
 * 
 * // Publish event
 * await eventBus.emit('booking.created', { bookingId: '123', hotelId: 'h1' })
 * 
 * // Subscribe to event
 * eventBus.on('booking.created', (data) => {
 *   console.log('Booking created:', data)
 * })
 * 
 * // Subscribe to pattern
 * eventBus.onPattern('booking.*', (event, data) => {
 *   console.log('Booking event:', event, data)
 * })
 * ```
 */

import Redis from 'ioredis'
import EventEmitter from 'events'

// Event payload structure
export interface EventPayload {
  event: string
  data: any
  hotelId?: string
  userId?: string
  timestamp: Date
  instanceId: string
  traceId?: string
}

// Event listener type
type EventListener = (data: any) => void | Promise<void>
type PatternListener = (event: string, data: any) => void | Promise<void>

// Redis connection status
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

/**
 * Distributed Event Bus using Redis Pub/Sub
 */
export class RedisEventBus {
  private publisher: Redis | null = null
  private subscriber: Redis | null = null
  private localEmitter: EventEmitter
  private listeners: Map<string, Set<EventListener>> = new Map()
  private patternListeners: Map<string, Set<PatternListener>> = new Map()
  private instanceId: string
  private status: ConnectionStatus = 'disconnected'
  private useRedis: boolean
  private eventHistory: EventPayload[] = []
  private maxHistorySize = 100

  constructor(redisUrl?: string) {
    this.instanceId = `instance-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.localEmitter = new EventEmitter()
    this.localEmitter.setMaxListeners(100) // Avoid warnings for many listeners
    this.useRedis = !!redisUrl

    if (this.useRedis && redisUrl) {
      this.initRedis(redisUrl)
    } else {
      console.log('[EventBus] Running in local mode (in-memory EventEmitter)')
    }
  }

  /**
   * Initialize Redis connections
   */
  private initRedis(redisUrl: string): void {
    try {
      this.status = 'connecting'

      // Publisher client
      this.publisher = new Redis(redisUrl, {
        lazyConnect: false,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          console.log(`[EventBus] Retrying Redis connection (${times})...`)
          return delay
        },
      })

      // Subscriber client (separate connection)
      this.subscriber = new Redis(redisUrl, {
        lazyConnect: false,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      })

      // Publisher events
      this.publisher.on('connect', () => {
        this.status = 'connected'
        console.log('[EventBus] Redis publisher connected')
      })

      this.publisher.on('error', (err) => {
        this.status = 'error'
        console.error('[EventBus] Redis publisher error:', err.message)
      })

      this.publisher.on('close', () => {
        this.status = 'disconnected'
        console.log('[EventBus] Redis publisher disconnected')
      })

      // Subscriber events
      this.subscriber.on('connect', () => {
        console.log('[EventBus] Redis subscriber connected')
        this.resubscribeAll()
      })

      this.subscriber.on('error', (err) => {
        console.error('[EventBus] Redis subscriber error:', err.message)
      })

      this.subscriber.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message)
      })

      this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
        this.handlePatternMessage(pattern, channel, message)
      })

      console.log('[EventBus] Redis event bus initialized')
    } catch (error) {
      this.status = 'error'
      console.error('[EventBus] Failed to initialize Redis:', error)
      this.fallbackToLocal()
    }
  }

  /**
   * Fallback to local EventEmitter if Redis fails
   */
  private fallbackToLocal(): void {
    console.log('[EventBus] Falling back to local mode')
    this.useRedis = false
    this.publisher?.disconnect()
    this.subscriber?.disconnect()
    this.publisher = null
    this.subscriber = null
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private async resubscribeAll(): Promise<void> {
    try {
      // Resubscribe to exact channels
      for (const channel of this.listeners.keys()) {
        await this.subscriber?.subscribe(channel)
      }

      // Resubscribe to pattern channels
      for (const pattern of this.patternListeners.keys()) {
        await this.subscriber?.psubscribe(pattern)
      }

      console.log('[EventBus] Resubscribed to all channels')
    } catch (error) {
      console.error('[EventBus] Failed to resubscribe:', error)
    }
  }

  /**
   * Handle incoming message from Redis
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const payload: EventPayload = JSON.parse(message)

      // Don't process our own events (avoid echo)
      if (payload.instanceId === this.instanceId) {
        return
      }

      // Add to history
      this.addToHistory(payload)

      // Trigger local listeners
      const listeners = this.listeners.get(channel)
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener(payload.data)
          } catch (err) {
            console.error(`[EventBus] Error in listener for ${channel}:`, err)
          }
        }
      }
    } catch (error) {
      console.error('[EventBus] Failed to parse message:', error)
    }
  }

  /**
   * Handle incoming pattern message from Redis
   */
  private handlePatternMessage(pattern: string, channel: string, message: string): void {
    try {
      const payload: EventPayload = JSON.parse(message)

      // Don't process our own events
      if (payload.instanceId === this.instanceId) {
        return
      }

      // Trigger pattern listeners
      const listeners = this.patternListeners.get(pattern)
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener(payload.event, payload.data)
          } catch (err) {
            console.error(`[EventBus] Error in pattern listener for ${pattern}:`, err)
          }
        }
      }
    } catch (error) {
      console.error('[EventBus] Failed to parse pattern message:', error)
    }
  }

  /**
   * Add event to history for debugging
   */
  private addToHistory(payload: EventPayload): void {
    this.eventHistory.push(payload)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  /**
   * Emit an event (publish to Redis or local)
   */
  async emit(event: string, data: any, metadata?: { hotelId?: string; userId?: string; traceId?: string }): Promise<void> {
    const payload: EventPayload = {
      event,
      data,
      hotelId: metadata?.hotelId,
      userId: metadata?.userId,
      timestamp: new Date(),
      instanceId: this.instanceId,
      traceId: metadata?.traceId,
    }

    // Add to history
    this.addToHistory(payload)

    if (this.useRedis && this.publisher && this.status === 'connected') {
      // Publish to Redis
      try {
        await this.publisher.publish(event, JSON.stringify(payload))
      } catch (error) {
        console.error(`[EventBus] Failed to publish event ${event}:`, error)
        // Fallback to local
        this.localEmitter.emit(event, data)
      }
    } else {
      // Use local EventEmitter
      this.localEmitter.emit(event, data)
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, listener: EventListener): void {
    // Add to local listeners map
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)

    if (this.useRedis && this.subscriber && this.status === 'connected') {
      // Subscribe to Redis channel
      this.subscriber.subscribe(event).catch((err) => {
        console.error(`[EventBus] Failed to subscribe to ${event}:`, err)
      })
    } else {
      // Use local EventEmitter
      this.localEmitter.on(event, listener)
    }
  }

  /**
   * Subscribe to events matching a pattern (e.g., "booking.*")
   */
  onPattern(pattern: string, listener: PatternListener): void {
    // Add to pattern listeners map
    if (!this.patternListeners.has(pattern)) {
      this.patternListeners.set(pattern, new Set())
    }
    this.patternListeners.get(pattern)!.add(listener)

    if (this.useRedis && this.subscriber && this.status === 'connected') {
      // Subscribe to Redis pattern
      this.subscriber.psubscribe(pattern).catch((err) => {
        console.error(`[EventBus] Failed to psubscribe to ${pattern}:`, err)
      })
    } else {
      // For local mode, we need to manually match patterns
      // This is a simplified implementation
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      this.localEmitter.on('*', (event: string, data: any) => {
        if (regex.test(event)) {
          listener(event, data)
        }
      })
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, listener: EventListener): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(event)

        if (this.useRedis && this.subscriber) {
          // Unsubscribe from Redis
          this.subscriber.unsubscribe(event).catch((err) => {
            console.error(`[EventBus] Failed to unsubscribe from ${event}:`, err)
          })
        } else {
          this.localEmitter.off(event, listener)
        }
      }
    }
  }

  /**
   * Unsubscribe from a pattern
   */
  offPattern(pattern: string, listener: PatternListener): void {
    const listeners = this.patternListeners.get(pattern)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.patternListeners.delete(pattern)

        if (this.useRedis && this.subscriber) {
          // Unsubscribe from Redis pattern
          this.subscriber.punsubscribe(pattern).catch((err) => {
            console.error(`[EventBus] Failed to punsubscribe from ${pattern}:`, err)
          })
        }
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event)
      if (this.useRedis && this.subscriber) {
        this.subscriber.unsubscribe(event).catch((err) => {
          console.error(`[EventBus] Failed to unsubscribe from ${event}:`, err)
        })
      } else {
        this.localEmitter.removeAllListeners(event)
      }
    } else {
      // Remove all
      for (const channel of this.listeners.keys()) {
        if (this.useRedis && this.subscriber) {
          this.subscriber.unsubscribe(channel).catch(() => {})
        }
      }
      this.listeners.clear()

      for (const pattern of this.patternListeners.keys()) {
        if (this.useRedis && this.subscriber) {
          this.subscriber.punsubscribe(pattern).catch(() => {})
        }
      }
      this.patternListeners.clear()

      if (!this.useRedis) {
        this.localEmitter.removeAllListeners()
      }
    }
  }

  /**
   * Get event history for debugging
   */
  getHistory(filter?: { event?: string; hotelId?: string; limit?: number }): EventPayload[] {
    let history = [...this.eventHistory]

    if (filter?.event) {
      history = history.filter((p) => p.event === filter.event)
    }

    if (filter?.hotelId) {
      history = history.filter((p) => p.hotelId === filter.hotelId)
    }

    if (filter?.limit) {
      history = history.slice(-filter.limit)
    }

    return history
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Check if using Redis
   */
  isUsingRedis(): boolean {
    return this.useRedis && this.status === 'connected'
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    console.log('[EventBus] Closing event bus...')

    this.removeAllListeners()

    if (this.publisher) {
      await this.publisher.quit()
      this.publisher = null
    }

    if (this.subscriber) {
      await this.subscriber.quit()
      this.subscriber = null
    }

    this.status = 'disconnected'
    console.log('[EventBus] Event bus closed')
  }
}

/**
 * Global event bus instance
 */
let globalEventBus: RedisEventBus | null = null

/**
 * Get or create global event bus instance
 */
export function getEventBus(): RedisEventBus {
  if (!globalEventBus) {
    const redisUrl = process.env.REDIS_URL
    globalEventBus = new RedisEventBus(redisUrl)
  }
  return globalEventBus
}

/**
 * Export global instance for backward compatibility
 */
export const eventBus = getEventBus()

/**
 * Export for testing
 */
export function resetEventBus(): void {
  if (globalEventBus) {
    globalEventBus.close().catch(() => {})
    globalEventBus = null
  }
}
