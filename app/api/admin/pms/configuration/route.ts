/**
 * External PMS Configuration API
 * Save and retrieve PMS configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import {
  savePMSConfiguration,
  getPMSConfiguration,
  disconnectPMS,
  SaveConfigurationInput,
  ExternalPMSType
} from '@/lib/services/pms/externalPMSService'
import { z } from 'zod'

const saveConfigSchema = z.object({
  pmsType: z.enum(['OPERA', 'MEWS', 'CLOUDBEDS', 'PROTEL', 'APALEO', 'CUSTOM']),
  apiKey: z.string().min(10),
  version: z.string().optional(),
  endpoint: z.string().url().optional().or(z.literal(''))
})

/**
 * GET /api/admin/pms/configuration
 * Get current PMS configuration
 */
export const GET = withPermission(Permission.ADMIN_VIEW)(async (req: NextRequest) => {
  try {
    const token = await getToken({ req })
    if (!token || !token.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const config = await getPMSConfiguration(token.hotelId as string)

    if (!config) {
      return NextResponse.json(
        { configured: false },
        { status: 200 }
      )
    }

    // Return config without encrypted API key
    return NextResponse.json({
      configured: true,
      pmsType: config.pmsType,
      version: config.version,
      endpoint: config.endpoint,
      status: config.status,
      lastSyncedAt: config.lastSyncedAt,
      lastError: config.lastError
    })

  } catch (error) {
    console.error('Get PMS config error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get configuration',
        message: (error as Error).message 
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/admin/pms/configuration
 * Save PMS configuration
 */
export const POST = withPermission(Permission.ADMIN_VIEW)(async (req: NextRequest) => {
  try {
    const token = await getToken({ req })
    if (!token || !token.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validated = saveConfigSchema.parse(body)

    const input: SaveConfigurationInput = {
      hotelId: token.hotelId as string,
      userId: token.id as string,
      pmsType: validated.pmsType as ExternalPMSType,
      apiKey: validated.apiKey,
      version: validated.version,
      endpoint: validated.endpoint || undefined
    }

    const config = await savePMSConfiguration(input)

    return NextResponse.json({
      success: true,
      configId: config.id,
      pmsType: config.pmsType,
      status: config.status
    })

  } catch (error) {
    console.error('Save PMS config error:', error)
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: (error as any).issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to save configuration',
        message: (error as Error).message 
      },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/admin/pms/configuration
 * Disconnect PMS
 */
export const DELETE = withPermission(Permission.ADMIN_VIEW)(async (req: NextRequest) => {
  try {
    const token = await getToken({ req })
    if (!token || !token.hotelId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await disconnectPMS(token.hotelId as string, token.id as string)

    return NextResponse.json({
      success: true,
      message: 'PMS disconnected successfully'
    })

  } catch (error) {
    console.error('Disconnect PMS error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to disconnect PMS',
        message: (error as Error).message 
      },
      { status: 500 }
    )
  }
})
