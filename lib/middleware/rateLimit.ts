/**
 * Production Rate Limiting Middleware
 * Applies stricter rate limits for production traffic
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RateLimitConfig } from '@/lib/security/rateLimiter'

/**
 * Production rate limit configurations
 * Stricter than development defaults
 */
export const PRODUCTION_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict to prevent brute force
  AUTH_LOGIN: {
    endpoint: '/api/auth/login',
    maxAttempts: 5,
    windowMs: 60 * 1000 // 5 attempts per minute
  },
  AUTH_REGISTER: {
    endpoint: '/api/register',
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000 // 3 attempts per hour
  },
  MOBILE_AUTH_LOGIN: {
    endpoint: '/api/mobile/auth/login',
    maxAttempts: 5,
    windowMs: 60 * 1000 // 5 attempts per minute
  },
  MOBILE_AUTH_MAGIC_LINK_REQUEST: {
    endpoint: '/api/mobile/auth/magic-link:request',
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000 // 3 requests per 15 minutes
  },
  MOBILE_AUTH_MAGIC_LINK_REDEEM: {
    endpoint: '/api/mobile/auth/magic-link:redeem',
    maxAttempts: 10,
    windowMs: 60 * 1000 // 10 validations per minute
  },
  MOBILE_AUTH_REFRESH: {
    endpoint: '/api/mobile/auth/refresh',
    maxAttempts: 20,
    windowMs: 60 * 1000 // 20 refreshes per minute
  },
  QR_VALIDATE: {
    endpoint: '/api/qr/validate',
    maxAttempts: 10,
    windowMs: 60 * 1000 // 10 attempts per minute
  },
  QR_SCAN: {
    endpoint: '/api/qr/scan',
    maxAttempts: 20,
    windowMs: 60 * 1000 // 20 scans per minute
  },
  
  // Public widget APIs - moderate limits
  WIDGET_CHAT: {
    endpoint: '/api/widget/chat',
    maxAttempts: 30,
    windowMs: 60 * 1000 // 30 messages per minute
  },
  WIDGET_INFO: {
    endpoint: '/api/widget/info',
    maxAttempts: 60,
    windowMs: 60 * 1000 // 60 requests per minute
  },
  
  // PMS sync endpoints - conservative to avoid overwhelming external APIs
  PMS_SYNC_BOOKINGS: {
    endpoint: '/api/pms/sync/bookings',
    maxAttempts: 10,
    windowMs: 60 * 1000 // 10 syncs per minute
  },
  PMS_SYNC_ROOMS: {
    endpoint: '/api/pms/sync/rooms',
    maxAttempts: 10,
    windowMs: 60 * 1000 // 10 syncs per minute
  },
  PMS_SYNC_GUESTS: {
    endpoint: '/api/pms/sync/guests',
    maxAttempts: 10,
    windowMs: 60 * 1000 // 10 syncs per minute
  },
  
  // Chat endpoints - prevent spam
  CHAT_MESSAGE: {
    endpoint: '/api/chat',
    maxAttempts: 20,
    windowMs: 60 * 1000 // 20 messages per minute
  },
  
  // Admin operations - moderate protection
  ADMIN_EXPORT: {
    endpoint: '/api/exports',
    maxAttempts: 5,
    windowMs: 60 * 1000 // 5 exports per minute
  },
  QR_GENERATE: {
    endpoint: '/api/qr/generate',
    maxAttempts: 20,
    windowMs: 60 * 1000 // 20 generations per minute
  }
}

/**
 * Get client identifier for rate limiting
 * Uses IP address with fallback to 'anonymous'
 */
function getClientIdentifier(req: NextRequest): string {
  // Try forwarded IP (behind proxy/load balancer)
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  // Try real IP
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback to anonymous (less secure, but prevents crashes)
  return 'anonymous'
}

/**
 * Apply rate limiting middleware
 * Returns 429 Too Many Requests if limit exceeded
 * 
 * @example
 * export const POST = withRateLimit('AUTH_LOGIN')(async (req) => {
 *   // Handler logic
 * })
 */
export function withRateLimit(limitKey: keyof typeof PRODUCTION_RATE_LIMITS) {
  return function <T = any>(
    handler: (req: NextRequest, context?: T) => Promise<Response>
  ) {
    return async function (req: NextRequest, context?: T): Promise<Response> {
      // Skip rate limiting in development
      if (process.env.NODE_ENV !== 'production') {
        return handler(req, context)
      }
      
      const config = PRODUCTION_RATE_LIMITS[limitKey]
      if (!config) {
        console.warn(`Rate limit config not found for: ${limitKey}`)
        return handler(req, context)
      }
      
      const identifier = getClientIdentifier(req)
      
      try {
        const result = await checkRateLimit(identifier, config.endpoint, config)
        
        if (!result.allowed) {
          return NextResponse.json(
            {
              error: 'Too Many Requests',
              message: `Rate limit exceeded. Please try again in ${result.retryAfterSeconds} seconds.`,
              retryAfter: result.retryAfterSeconds
            },
            {
              status: 429,
              headers: {
                'Retry-After': result.retryAfterSeconds?.toString() || '60',
                'X-RateLimit-Limit': config.maxAttempts.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': result.resetAt.toISOString()
              }
            }
          )
        }
        
        // Add rate limit headers to successful response
        const response = await handler(req, context)
        
        // Clone response to add headers
        const headers = new Headers(response.headers)
        headers.set('X-RateLimit-Limit', config.maxAttempts.toString())
        headers.set('X-RateLimit-Remaining', result.remaining.toString())
        headers.set('X-RateLimit-Reset', result.resetAt.toISOString())
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        })
      } catch (error) {
        console.error('Rate limit check failed:', error)
        // On error, allow request through (fail open)
        return handler(req, context)
      }
    }
  }
}

/**
 * Apply rate limiting to API route handler
 * Alternative syntax for direct application
 * 
 * @example
 * export async function POST(req: NextRequest) {
 *   const rateLimitResult = await applyRateLimit(req, 'AUTH_LOGIN')
 *   if (rateLimitResult) return rateLimitResult
 *   
 *   // Handler logic
 * }
 */
export async function applyRateLimit(
  req: NextRequest,
  limitKey: keyof typeof PRODUCTION_RATE_LIMITS
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }
  
  const config = PRODUCTION_RATE_LIMITS[limitKey]
  if (!config) {
    return null
  }
  
  const identifier = getClientIdentifier(req)
  
  try {
    const result = await checkRateLimit(identifier, config.endpoint, config)
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${result.retryAfterSeconds} seconds.`,
          retryAfter: result.retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': result.retryAfterSeconds?.toString() || '60',
            'X-RateLimit-Limit': config.maxAttempts.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetAt.toISOString()
          }
        }
      )
    }
    
    return null // Allow request
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return null // Fail open
  }
}
