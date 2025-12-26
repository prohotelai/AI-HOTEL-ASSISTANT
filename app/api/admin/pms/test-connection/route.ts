export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * External PMS Connection API
 * Admin endpoints for connecting and managing external PMS integrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import {
  testPMSConnection,
  TestConnectionInput,
  ExternalPMSType
} from '@/lib/services/pms/externalPMSService'
import { z } from 'zod'

const allowedTypes = ['OPERA', 'MEWS', 'CLOUDBEDS', 'PROTEL', 'APALEO', 'CUSTOM'] as const
const testConnectionSchema = z.object({
  pmsType: z.string().transform((val) => val.toUpperCase()),
  apiKey: z.string().min(10, 'API key must be at least 10 characters'),
  version: z.string().optional(),
  endpoint: z.string().url().optional().or(z.literal(''))
})

/**
 * POST /api/admin/pms/test-connection
 * Test connection to external PMS
 */
export const POST = withPermission(Permission.ADMIN_VIEW)(async (req: NextRequest) => {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if ((token as any).role && (token as any).role !== 'admin' && (token as any).role !== 'owner' && (token as any).role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = testConnectionSchema.parse(body)

    if (!allowedTypes.includes(validated.pmsType as any)) {
      return NextResponse.json({ error: 'Invalid PMS type' }, { status: 400 })
    }

    // Test the connection
    const input: TestConnectionInput = {
      pmsType: validated.pmsType as ExternalPMSType,
      apiKey: validated.apiKey,
      version: validated.version,
      endpoint: validated.endpoint || undefined
    }

    const result = await testPMSConnection(input)

    return NextResponse.json(result)

  } catch (error) {
    console.error('PMS connection test error:', error)
    
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
        error: 'Failed to test connection',
        message: (error as Error).message 
      },
      { status: 500 }
    )
  }
})
