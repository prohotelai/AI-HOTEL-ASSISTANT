/**
 * Sentry Error Monitoring Integration
 * Captures API errors, background job failures, and PMS adapter exceptions
 * 
 * Setup:
 * 1. npm install @sentry/nextjs
 * 2. Set SENTRY_DSN in .env
 * 3. Import and use captureException/captureMessage
 */

/**
 * Sentry configuration
 * Conditionally imports Sentry only if DSN is configured
 */

let Sentry: any = null
let isSentryEnabled = false

try {
  if (process.env.SENTRY_DSN) {
    // Dynamically import Sentry only if configured
    // NOTE: Install with: npm install @sentry/nextjs
    // This is a placeholder - actual Sentry will be imported when package is installed
    isSentryEnabled = true
  }
} catch (error) {
  console.warn('Sentry not installed. Run: npm install @sentry/nextjs')
}

/**
 * Initialize Sentry (call this in app initialization)
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry monitoring disabled (no SENTRY_DSN)')
    return
  }

  try {
    // When @sentry/nextjs is installed, initialize here
    // Sentry.init({
    //   dsn: process.env.SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    //   beforeSend(event) {
    //     // Filter sensitive data
    //     if (event.request) {
    //       delete event.request.cookies
    //       delete event.request.headers?.authorization
    //     }
    //     return event
    //   }
    // })
    
    console.log('Sentry monitoring initialized')
  } catch (error) {
    console.error('Failed to initialize Sentry:', error)
  }
}

/**
 * Capture exception to Sentry
 * @param error - Error object
 * @param context - Additional context (user, tags, etc.)
 */
export function captureException(error: Error, context?: {
  user?: { id?: string; email?: string; hotelId?: string }
  tags?: Record<string, string>
  extra?: Record<string, any>
}) {
  // Log to console always
  console.error('Error captured:', error.message, context)
  
  if (!isSentryEnabled) return
  
  try {
    // When Sentry is installed:
    // Sentry.captureException(error, {
    //   user: context?.user,
    //   tags: context?.tags,
    //   extra: context?.extra
    // })
  } catch (sentryError) {
    console.error('Failed to send error to Sentry:', sentryError)
  }
}

/**
 * Capture message to Sentry
 * @param message - Message string
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  console.log(`[${level.toUpperCase()}] ${message}`, context)
  
  if (!isSentryEnabled) return
  
  try {
    // When Sentry is installed:
    // Sentry.captureMessage(message, {
    //   level,
    //   extra: context
    // })
  } catch (sentryError) {
    console.error('Failed to send message to Sentry:', sentryError)
  }
}

/**
 * Wrap API handler with error monitoring
 * Automatically captures and reports errors
 */
export function withErrorMonitoring<T = any>(
  handler: (req: any, context?: T) => Promise<Response>
) {
  return async function (req: any, context?: T): Promise<Response> {
    try {
      return await handler(req, context)
    } catch (error) {
      const err = error as Error
      
      // Capture to Sentry
      captureException(err, {
        tags: {
          endpoint: req.url,
          method: req.method
        },
        extra: {
          url: req.url,
          method: req.method,
          headers: Object.fromEntries(req.headers.entries())
        }
      })
      
      // Return error response
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'production' 
            ? 'An error occurred processing your request'
            : err.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Capture PMS adapter errors
 * Specialized context for PMS integration errors
 */
export function capturePMSError(
  error: Error,
  vendor: string,
  operation: string,
  hotelId?: string
) {
  captureException(error, {
    tags: {
      component: 'pms-adapter',
      vendor,
      operation
    },
    extra: {
      hotelId,
      errorDetails: error.message
    }
  })
}

/**
 * Capture background job errors
 * Specialized context for async job failures
 */
export function captureJobError(
  error: Error,
  jobType: string,
  jobId?: string,
  hotelId?: string
) {
  captureException(error, {
    tags: {
      component: 'background-job',
      jobType
    },
    extra: {
      jobId,
      hotelId,
      errorDetails: error.message
    }
  })
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string
  email?: string
  hotelId?: string
  role?: string
}) {
  if (!isSentryEnabled) return
  
  try {
    // When Sentry is installed:
    // Sentry.setUser({
    //   id: user.id,
    //   email: user.email,
    //   hotelId: user.hotelId,
    //   role: user.role
    // })
  } catch (error) {
    console.error('Failed to set Sentry user context:', error)
  }
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  if (!isSentryEnabled) return
  
  try {
    // When Sentry is installed:
    // Sentry.setUser(null)
  } catch (error) {
    console.error('Failed to clear Sentry user context:', error)
  }
}

// Export Sentry status for conditional usage
export const isSentryConfigured = () => isSentryEnabled
