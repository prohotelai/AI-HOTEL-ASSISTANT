// ============================================================================
// SESSION 5.6 - ADMIN DASHBOARD BACKEND ROUTES
// File: app/api/admin/route.ts
// Centralized admin API routing for token, session, and analytics management
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { requireNextAuthSecret } from '@/lib/env'

const NEXTAUTH_SECRET_BYTES = new TextEncoder().encode(requireNextAuthSecret())
const ADMIN_ROLES = ['admin', 'super_admin', 'manager']

// ============================================================================
// 1. HELPER: Verify Admin Session
// ============================================================================

async function verifyAdminSession(token: string, hotelId: string) {
  try {
    const { payload } = await jwtVerify(token, NEXTAUTH_SECRET_BYTES)

    if (payload.hotelId !== hotelId) {
      return { valid: false, error: 'Hotel ID mismatch' }
    }

    if (!ADMIN_ROLES.includes(payload.role as string)) {
      return { valid: false, error: 'Admin access required' }
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Session expired' }
    }

    return {
      valid: true,
      data: {
        userId: payload.userId,
        role: payload.role,
        hotelId: payload.hotelId,
      },
    }
  } catch (error) {
    logger.error('Admin session verification failed', { error })
    return { valid: false, error: 'Invalid session' }
  }
}

// ============================================================================
// 2. TOKENS ENDPOINT - Manage QR Tokens
// ============================================================================

async function handleTokensRequest(
  request: NextRequest,
  hotelId: string,
  adminData: any
) {
  const method = request.method
  const body = method !== 'GET' ? await request.json() : null

  switch (method) {
    case 'GET': {
      // List active tokens
      const tokens = await db.guestStaffQRToken.findMany({
        where: { hotelId },
        select: {
          id: true,
          token: true,
          role: true,
          expiresAt: true,
          issuedAt: true,
          usedAt: true,
          userId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      return NextResponse.json({
        success: true,
        data: {
          total: tokens.length,
          tokens: tokens.map((t) => ({
            id: t.id,
            token: `${t.token.substring(0, 10)}...`, // Masked for security
            role: t.role,
            status: t.usedAt ? 'used' : 'active',
            expiresAt: t.expiresAt,
            usedAt: t.usedAt,
            issuedAt: t.issuedAt,
          })),
        },
      })
    }

    case 'POST': {
      // Create new token
      const { userRole, expiresInDays = 30 } = body

      if (!['guest', 'staff'].includes(userRole)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user role' },
          { status: 400 }
        )
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      const token = crypto.randomBytes(32).toString('hex')

      const newToken = await db.guestStaffQRToken.create({
        data: {
          hotelId,
          token,
          role: userRole,
          expiresAt,
          createdBy: adminData.userId,
        },
      })

      logger.info('QR token created', {
        hotelId,
        userRole,
        expiresAt,
        createdBy: adminData.userId,
      })

      return NextResponse.json(
        {
          success: true,
          data: {
            id: newToken.id,
            token: newToken.token,
            userRole: newToken.role,
            expiresAt: newToken.expiresAt,
            createdAt: newToken.createdAt,
          },
        },
        { status: 201 }
      )
    }

    case 'PUT': {
      // Revoke token
      const { tokenId } = body

      if (!tokenId) {
        return NextResponse.json(
          { success: false, error: 'Missing tokenId' },
          { status: 400 }
        )
      }

      await db.guestStaffQRToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date(), revokedBy: adminData.userId },
      })

      logger.info('QR token revoked', { tokenId, hotelId, revokedBy: adminData.userId })

      return NextResponse.json({
        success: true,
        message: 'Token revoked successfully',
      })
    }

    default:
      return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
      )
  }
}

// ============================================================================
// 3. SESSIONS ENDPOINT - View Active Sessions
// ============================================================================

async function handleSessionsRequest(
  request: NextRequest,
  hotelId: string,
  adminData: any
) {
  const method = request.method
  const body = method !== 'GET' ? await request.json() : null
  const url = new URL(request.url)
  const searchParams = url.searchParams

  switch (method) {
    case 'GET': {
      // List active sessions with filtering
      const status = searchParams.get('status') || 'active' // active, completed, expired
      const userId = searchParams.get('userId')
      const userRole = searchParams.get('userRole')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      const where: any = { hotelId }

      if (status === 'active') {
        where.expiresAt = { gt: new Date() }
      } else if (status === 'expired') {
        where.expiresAt = { lte: new Date() }
      }

      if (userId) where.userId = userId
      if (userRole) where.role = userRole

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      // TODO: Implement UserSessionLog model or use NextAuth Session model
      // const sessions = await db.userSessionLog.findMany({ ... })

      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          sessions: [],
        },
      })
    }

    case 'POST': {
      // Get detailed session info
      const { sessionId } = body

      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Missing sessionId' },
          { status: 400 }
        )
      }

      // TODO: Implement UserSessionLog model
      return NextResponse.json(
        { success: false, error: 'Session tracking not yet implemented' },
        { status: 501 }
      )
    }

    case 'DELETE': {
      // Revoke/terminate session
      const { sessionId } = body

      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Missing sessionId' },
          { status: 400 }
        )
      }

      // TODO: Implement UserSessionLog model
      return NextResponse.json(
        { success: false, error: 'Session tracking not yet implemented' },
        { status: 501 }
      )
    }

    default:
      return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
      )
  }
}

// ============================================================================
// 4. ANALYTICS ENDPOINT - Workflow & Performance Metrics
// ============================================================================

async function handleAnalyticsRequest(
  request: NextRequest,
  hotelId: string,
  adminData: any
) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const period = searchParams.get('period') || 'day' // day, week, month
  const metric = searchParams.get('metric') || 'all' // all, ai_triggers, pms_syncs, tickets, errors

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()

  switch (period) {
    case 'day':
      startDate.setHours(0, 0, 0, 0)
      break
    case 'week':
      startDate.setDate(startDate.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1)
      break
  }

  // TODO: Implement analytics models (userSessionLog, aIInteractionLog, etc.)
  const sessions: any[] = []
  const aiLogs: any[] = []
  const pmsLogs: any[] = []
  const workflows: any[] = []

  // Calculate metrics
  const metrics: any = {
    period,
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(
        (s) => new Date(s.expiresAt) > new Date()
      ).length,
      totalAITriggers: aiLogs.length,
      totalPMSSyncs: pmsLogs.length,
      totalWorkflows: workflows.length,
    },
  }

  // AI Model breakdown
  const aiModels = aiLogs.reduce(
    (acc, log) => {
      acc[log.modelId] = (acc[log.modelId] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  metrics.aiModels = Object.entries(aiModels)
    .map(([modelId, count]) => ({
      modelId,
      count: count as number,
      percentage: aiLogs.length > 0 ? (((count as number) / aiLogs.length) * 100).toFixed(2) : '0',
    }))
    .sort((a, b) => b.count - a.count)

  // User role breakdown
  const roleBreakdown = sessions.reduce(
    (acc, session) => {
      acc[session.role] = (acc[session.role] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  metrics.userRoles = Object.entries(roleBreakdown).map(([role, count]) => ({
    role,
    count,
  }))

  // PMS sync status
  const pmsSyncStatus = pmsLogs.reduce(
    (acc, log) => {
      acc[log.syncStatus] = (acc[log.syncStatus] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  metrics.pmsSyncStatus = Object.entries(pmsSyncStatus).map(
    ([status, count]) => ({
      status,
      count: count as number,
      percentage: pmsLogs.length > 0 ? (((count as number) / pmsLogs.length) * 100).toFixed(2) : '0',
    })
  )

  // Performance metrics
  const avgExecutionTime =
    aiLogs.length > 0
      ? aiLogs.reduce((sum, log) => sum + (log.executionTimeMs || 0), 0) /
        aiLogs.length
      : 0

  metrics.performance = {
    avgAIExecutionTime: avgExecutionTime.toFixed(2),
    slowestAIModel: aiLogs.sort(
      (a, b) => (b.executionTimeMs || 0) - (a.executionTimeMs || 0)
    )[0]?.modelId,
    avgWorkflowDuration:
      workflows.length > 0
        ? (
            workflows.reduce(
              (sum, w) => sum + (w.durationMs || 0),
              0
            ) / workflows.length
          ).toFixed(2)
        : 0,
  }

  // Error analysis
  const errors = workflows.filter((w) => w.status === 'failed')
  metrics.errors = {
    totalErrors: errors.length,
    errorRate: workflows.length > 0 
      ? ((errors.length / workflows.length) * 100).toFixed(2) 
      : 0,
  }

  return NextResponse.json({
    success: true,
    data: metrics,
  })
}

// ============================================================================
// 5. EXPORT ENDPOINT - Export Logs (CSV/PDF)
// ============================================================================

async function handleExportRequest(
  request: NextRequest,
  hotelId: string,
  adminData: any
) {
  const body = await request.json()
  const {
    exportType = 'sessions', // sessions, ai_logs, pms_logs, workflows
    format = 'csv', // csv, json
    startDate,
    endDate,
  } = body

  // Parse dates
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const end = endDate ? new Date(endDate) : new Date()

  let data: any[] = []
  let filename = ''

  // TODO: Implement export models
  if (exportType === 'sessions') {
    data = []
    filename = `sessions_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
  } else if (exportType === 'ai_logs') {
    data = []
    filename = `ai_logs_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
  } else if (exportType === 'pms_logs') {
    data = []
    filename = `pms_logs_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
  } else if (exportType === 'workflows') {
    data = []
    filename = `workflows_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
  }

  if (format === 'json') {
    return NextResponse.json(
      { success: true, data, count: data.length },
      {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}.json"`,
          'Content-Type': 'application/json',
        },
      }
    )
  } else if (format === 'csv') {
    const csv = convertToCSV(data, exportType)
    return new NextResponse(csv, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Content-Type': 'text/csv',
      },
    })
  }

  return NextResponse.json(
    { success: false, error: 'Invalid format' },
    { status: 400 }
  )
}

// ============================================================================
// 6. HELPER: Convert Data to CSV
// ============================================================================

function convertToCSV(data: any[], type: string): string {
  if (data.length === 0) return 'No data'

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        if (typeof value === 'object') {
          return `"${JSON.stringify(value)}"`
        }
        return `"${String(value).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  return [csvHeaders, ...csvRows].join('\n')
}

// ============================================================================
// 7. MAIN ROUTER
// ============================================================================

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing Authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  const url = new URL(request.url)
  const hotelId = url.searchParams.get('hotelId')

  if (!hotelId) {
    return NextResponse.json(
      { success: false, error: 'Missing hotelId' },
      { status: 400 }
    )
  }

  // Verify admin session
  const adminVerification = await verifyAdminSession(token, hotelId)
  if (!adminVerification.valid) {
    return NextResponse.json(
      { success: false, error: adminVerification.error },
      { status: 401 }
    )
  }

  const endpoint = url.searchParams.get('endpoint')

  if (endpoint === 'export') {
    return handleExportRequest(request, hotelId, adminVerification.data)
  } else if (endpoint === 'analytics') {
    return handleAnalyticsRequest(request, hotelId, adminVerification.data)
  }

  return NextResponse.json(
    { success: false, error: 'Invalid endpoint' },
    { status: 400 }
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing Authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  const url = new URL(request.url)
  const hotelId = url.searchParams.get('hotelId')
  const endpoint = url.searchParams.get('endpoint')

  if (!hotelId) {
    return NextResponse.json(
      { success: false, error: 'Missing hotelId' },
      { status: 400 }
    )
  }

  // Verify admin session
  const adminVerification = await verifyAdminSession(token, hotelId)
  if (!adminVerification.valid) {
    return NextResponse.json(
      { success: false, error: adminVerification.error },
      { status: 401 }
    )
  }

  if (endpoint === 'tokens') {
    return handleTokensRequest(request, hotelId, adminVerification.data)
  } else if (endpoint === 'sessions') {
    return handleSessionsRequest(request, hotelId, adminVerification.data)
  } else if (endpoint === 'analytics') {
    return handleAnalyticsRequest(request, hotelId, adminVerification.data)
  }

  return NextResponse.json(
    { success: false, error: 'Invalid endpoint' },
    { status: 400 }
  )
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing Authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  const url = new URL(request.url)
  const hotelId = url.searchParams.get('hotelId')
  const endpoint = url.searchParams.get('endpoint')

  if (!hotelId) {
    return NextResponse.json(
      { success: false, error: 'Missing hotelId' },
      { status: 400 }
    )
  }

  // Verify admin session
  const adminVerification = await verifyAdminSession(token, hotelId)
  if (!adminVerification.valid) {
    return NextResponse.json(
      { success: false, error: adminVerification.error },
      { status: 401 }
    )
  }

  if (endpoint === 'tokens') {
    return handleTokensRequest(request, hotelId, adminVerification.data)
  } else if (endpoint === 'sessions') {
    return handleSessionsRequest(request, hotelId, adminVerification.data)
  }

  return NextResponse.json(
    { success: false, error: 'Invalid endpoint' },
    { status: 400 }
  )
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing Authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  const url = new URL(request.url)
  const hotelId = url.searchParams.get('hotelId')
  const endpoint = url.searchParams.get('endpoint')

  if (!hotelId) {
    return NextResponse.json(
      { success: false, error: 'Missing hotelId' },
      { status: 400 }
    )
  }

  // Verify admin session
  const adminVerification = await verifyAdminSession(token, hotelId)
  if (!adminVerification.valid) {
    return NextResponse.json(
      { success: false, error: adminVerification.error },
      { status: 401 }
    )
  }

  if (endpoint === 'sessions') {
    return handleSessionsRequest(request, hotelId, adminVerification.data)
  }

  return NextResponse.json(
    { success: false, error: 'Invalid endpoint' },
    { status: 400 }
  )
}
