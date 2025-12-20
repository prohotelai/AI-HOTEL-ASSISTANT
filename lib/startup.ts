/**
 * API Startup Verification
 *
 * Validates all external API connections on application startup
 * Logs status without exposing secrets
 * Enables graceful degradation if services are unavailable
 */

import { checkServiceStatus, getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getRedisClient } from '@/lib/redis'
import { getResendClient } from '@/lib/email'
import { getStripeClient } from '@/lib/payments/stripe'
import { prisma } from '@/lib/prisma'

export interface StartupStatus {
  timestamp: string
  database: ServiceStatus
  cache: ServiceStatus
  email: ServiceStatus
  payments: ServiceStatus
  ai: ServiceStatus[]
  allHealthy: boolean
}

export interface ServiceStatus {
  name: string
  status: 'connected' | 'unconfigured' | 'error'
  message: string
}

/**
 * Verify database connection
 */
async function verifyDatabase(): Promise<ServiceStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      name: 'PostgreSQL',
      status: 'connected',
      message: 'Connected ✅',
    }
  } catch (error) {
    logger.error('Database connection failed', { error: (error as Error).message })
    return {
      name: 'PostgreSQL',
      status: 'error',
      message: `Failed: ${(error as Error).message}`,
    }
  }
}

/**
 * Verify Redis connection
 */
async function verifyCache(): Promise<ServiceStatus> {
  const client = getRedisClient()

  if (!client) {
    return {
      name: 'Redis (Upstash)',
      status: 'unconfigured',
      message: 'Not configured (optional)',
    }
  }

  try {
    await client.ping()
    return {
      name: 'Redis (Upstash)',
      status: 'connected',
      message: 'Connected ✅',
    }
  } catch (error) {
    logger.error('Redis connection failed', { error: (error as Error).message })
    return {
      name: 'Redis (Upstash)',
      status: 'error',
      message: `Failed: ${(error as Error).message}`,
    }
  }
}

/**
 * Verify Email service
 */
async function verifyEmail(): Promise<ServiceStatus> {
  const client = getResendClient()

  if (!client) {
    return {
      name: 'Resend Email',
      status: 'unconfigured',
      message: 'Not configured (optional)',
    }
  }

  try {
    // Try to list domains to verify API key works
    await (client as any).domains.list()
    return {
      name: 'Resend Email',
      status: 'connected',
      message: 'Connected ✅',
    }
  } catch (error) {
    logger.error('Resend connection failed', { error: (error as Error).message })
    return {
      name: 'Resend Email',
      status: 'error',
      message: `Failed: ${(error as Error).message}`,
    }
  }
}

/**
 * Verify Payment service
 */
async function verifyPayments(): Promise<ServiceStatus> {
  const client = getStripeClient()

  if (!client) {
    return {
      name: 'Stripe Payments',
      status: 'unconfigured',
      message: 'Not configured (optional)',
    }
  }

  try {
    // Try to retrieve account info to verify API key works
    await (client as any).accounts.retrieve()
    return {
      name: 'Stripe Payments',
      status: 'connected',
      message: 'Connected ✅',
    }
  } catch (error) {
    logger.error('Stripe connection failed', { error: (error as Error).message })
    return {
      name: 'Stripe Payments',
      status: 'error',
      message: `Failed: ${(error as Error).message}`,
    }
  }
}

/**
 * Verify AI services
 */
function verifyAIServices(): ServiceStatus[] {
  const services = checkServiceStatus()
  return services.map((service) => ({
    name: service.name,
    status: service.available ? 'connected' : 'unconfigured',
    message: service.available
      ? 'Configured ✅'
      : service.reason || 'Not configured (optional)',
  }))
}

/**
 * Run all startup verifications
 */
export async function verifyStartup(): Promise<StartupStatus> {
  const env = getEnv()
  const startTime = Date.now()

  logger.info('🚀 Starting API verification...')
  logger.info('Environment:', {
    env: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
  })

  const results: StartupStatus = {
    timestamp: new Date().toISOString(),
    database: await verifyDatabase(),
    cache: await verifyCache(),
    email: await verifyEmail(),
    payments: await verifyPayments(),
    ai: verifyAIServices(),
    allHealthy: false,
  }

  // Check if all critical services are healthy
  const critical = [results.database]
  results.allHealthy = critical.every((s) => s.status === 'connected')

  const duration = Date.now() - startTime

  // Log summary
  logger.info('📊 Startup Verification Summary', {
    duration: `${duration}ms`,
    database: results.database.status,
    cache: results.cache.status,
    email: results.email.status,
    payments: results.payments.status,
    ai: results.ai.map((s) => s.status).join(', '),
    critical: results.allHealthy ? 'PASS ✅' : 'FAIL ❌',
  })

  // Detailed report
  console.log('\n')
  console.log('═'.repeat(60))
  console.log('  API STARTUP VERIFICATION REPORT')
  console.log('═'.repeat(60))
  console.log('\n✅ CRITICAL SERVICES')
  console.log(`  ${results.database.name}${' '.repeat(40 - results.database.name.length)} ${results.database.status === 'connected' ? '✅' : '❌'}`)

  console.log('\n🔧 OPTIONAL SERVICES')
  console.log(`  ${results.cache.name}${' '.repeat(40 - results.cache.name.length)} ${results.cache.status === 'connected' ? '✅' : results.cache.status === 'unconfigured' ? '⚪' : '❌'}`)
  console.log(`  ${results.email.name}${' '.repeat(40 - results.email.name.length)} ${results.email.status === 'connected' ? '✅' : results.email.status === 'unconfigured' ? '⚪' : '❌'}`)
  console.log(`  ${results.payments.name}${' '.repeat(40 - results.payments.name.length)} ${results.payments.status === 'connected' ? '✅' : results.payments.status === 'unconfigured' ? '⚪' : '❌'}`)

  console.log('\n🤖 AI SERVICES')
  for (const service of results.ai) {
    const statusSymbol = service.status === 'connected' ? '✅' : '⚪'
    console.log(`  ${service.name}${' '.repeat(40 - service.name.length)} ${statusSymbol}`)
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`Overall Status: ${results.allHealthy ? '✅ READY' : '⚠️  PARTIAL - Non-critical services unavailable'}`)
  console.log(`Duration: ${duration}ms`)
  console.log('═'.repeat(60))
  console.log('\n')

  if (!results.allHealthy) {
    logger.error(
      'Critical services not available. Application startup may fail.',
      results
    )
  } else {
    logger.info('All critical services healthy. Application ready.')
  }

  return results
}

/**
 * Safe startup verification (doesn't throw errors)
 * Useful for routes or handlers that need to check status
 */
export async function safeVerifyStartup(): Promise<StartupStatus | null> {
  try {
    return await verifyStartup()
  } catch (error) {
    logger.error('Startup verification failed', { error: (error as Error).message })
    return null
  }
}
