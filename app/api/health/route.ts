export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API Status & Health Check Endpoint
 * GET /api/health
 *
 * Returns status of all external API integrations
 * Used for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyStartup, StartupStatus } from '@/lib/startup'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const status = await verifyStartup()

    if (!status) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Startup verification failed',
        },
        { status: 500 }
      )
    }

    // Determine overall health
    const isHealthy = status.database.status === 'connected'

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: status.timestamp,
        services: {
          database: status.database.status,
          cache: status.cache.status,
          email: status.email.status,
          payments: status.payments.status,
          ai: status.ai.map((s) => ({
            name: s.name,
            status: s.status,
          })),
        },
        details: {
          database: status.database.message,
          cache: status.cache.message,
          email: status.email.message,
          payments: status.payments.message,
          ai: status.ai.map((s) => `${s.name}: ${s.message}`),
        },
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message })

    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
