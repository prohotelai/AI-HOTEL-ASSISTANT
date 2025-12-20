// ============================================================================
// PMS ADAPTER API ROUTES
// ============================================================================
// All PMS integration endpoints under /api/pms-adapter/*
// ⚠️ Protected by RBAC - Requires ADMIN_MANAGE permission
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'
import { PMSAdapterService } from '../services/pmsAdapter.service'
import { PMSConnectionTester } from '../services/pmsConnectionTester'
import { PMSMappingEngine } from '../services/pmsMappingEngine'
import { PMSSyncEngine } from '../services/pmsSyncEngine'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createIntegrationSchema = z.object({
  pmsName: z.string().min(1),
  pmsType: z.enum(['CLOUD', 'ON_PREMISE', 'LEGACY']),
  version: z.string().optional(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(['API_KEY', 'OAUTH', 'BASIC', 'CUSTOM']),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    token: z.string().optional(),
    customFields: z.record(z.string()).optional(),
  }),
  mode: z.enum(['SAAS_ONLY', 'EXTERNAL_ONLY', 'HYBRID']),
  syncIntervalMinutes: z.number().min(5).optional(),
})

const testConnectionSchema = z.object({
  pmsName: z.string().min(1),
  baseUrl: z.string().url().optional(),
  authType: z.enum(['API_KEY', 'OAUTH', 'BASIC', 'CUSTOM']),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    token: z.string().optional(),
    customFields: z.record(z.string()).optional(),
  }),
  testEndpoint: z.string().optional(),
})

const syncRequestSchema = z.object({
  entity: z.enum(['rooms', 'bookings', 'guests', 'invoices', 'folios', 'rates']),
  direction: z.enum(['PULL', 'PUSH']),
  recordIds: z.array(z.string()).optional(),
  force: z.boolean().optional(),
  dryRun: z.boolean().optional(),
})

// ============================================================================
// FEATURE FLAG CHECK
// ============================================================================

function checkFeatureFlag(): NextResponse | null {
  if (!PMSAdapterService.isFeatureEnabled()) {
    return NextResponse.json(
      {
        error: 'PMS Adapter feature is not enabled',
        message: 'Set FEATURE_PMS_ADAPTER=true in environment variables to enable',
      },
      { status: 403 }
    )
  }
  return null
}

// ============================================================================
// POST /api/pms-adapter/connect
// Create or update PMS integration
// ============================================================================

export const POST_connect = withPermission(Permission.ADMIN_MANAGE)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    const body = await request.json()
    const data = createIntegrationSchema.parse(body)
    
    const integrationId = await PMSAdapterService.createIntegration({
      hotelId: user.hotelId,
      ...data,
    })
    
    return NextResponse.json({
      success: true,
      integrationId,
      message: 'Integration created successfully (disabled by default)',
    }, { status: 201 })
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create integration' },
      { status: 500 }
    )
  }
})

// ============================================================================
// POST /api/pms-adapter/test
// Test connection to external PMS
// ============================================================================

export const POST_test = withPermission(Permission.ADMIN_MANAGE)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    const body = await request.json()
    const data = testConnectionSchema.parse(body)
    
    const result = await PMSConnectionTester.testConnection({
      hotelId: user.hotelId,
      ...data,
    })
    
    // Update integration test status if it exists
    const integration = await PMSAdapterService.getIntegration(user.hotelId)
    if (integration) {
      await PMSAdapterService.updateIntegration(user.hotelId, {
        ...integration,
        lastTestAt: new Date() as any,
        lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
        lastTestError: result.success ? null : result.message,
      } as any)
    }
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Connection test failed' },
      { status: 500 }
    )
  }
})

// ============================================================================
// POST /api/pms-adapter/map
// Save entity mapping configuration
// ============================================================================

export const POST_map = withPermission(Permission.ADMIN_MANAGE)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    const body = await request.json()
    
    const integration = await PMSAdapterService.getIntegration(user.hotelId)
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }
    
    await PMSAdapterService.saveAdapterConfig(integration.id, body)
    
    return NextResponse.json({
      success: true,
      message: 'Mapping configuration saved',
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save mapping' },
      { status: 500 }
    )
  }
})

// ============================================================================
// POST /api/pms-adapter/enable
// Enable PMS integration (explicit action)
// ============================================================================

export const POST_enable = withPermission(Permission.ADMIN_MANAGE)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    await PMSAdapterService.enableIntegration(user.hotelId)
    
    return NextResponse.json({
      success: true,
      message: 'PMS integration enabled',
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to enable integration' },
      { status: 500 }
    )
  }
})

// ============================================================================
// POST /api/pms-adapter/disable
// Disable PMS integration
// ============================================================================

export const POST_disable = withPermission(Permission.ADMIN_MANAGE)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    await PMSAdapterService.disableIntegration(user.hotelId)
    
    return NextResponse.json({
      success: true,
      message: 'PMS integration disabled',
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to disable integration' },
      { status: 500 }
    )
  }
})

// ============================================================================
// GET /api/pms-adapter/status
// Get integration status
// ============================================================================

export const GET_status = withPermission(Permission.ADMIN_VIEW)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    const status = await PMSAdapterService.getStatus(user.hotelId)
    
    return NextResponse.json(status)
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    )
  }
})

// ============================================================================
// POST /api/pms-adapter/sync
// Trigger manual sync
// ============================================================================

export const POST_sync = withPermission(Permission.ADMIN_MANAGE)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    const body = await request.json()
    const data = syncRequestSchema.parse(body)
    
    const result = await PMSSyncEngine.sync({
      hotelId: user.hotelId,
      ...data,
    })
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
})

// ============================================================================
// GET /api/pms-adapter/history
// Get sync history
// ============================================================================

export const GET_history = withPermission(Permission.ADMIN_VIEW)(async (
  request: NextRequest
) => {
  const featureCheck = checkFeatureFlag()
  if (featureCheck) return featureCheck
  
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity') as any
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const history = await PMSAdapterService.getSyncHistory(user.hotelId, {
      entity,
      limit,
      offset,
    })
    
    return NextResponse.json(history)
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get sync history' },
      { status: 500 }
    )
  }
})
