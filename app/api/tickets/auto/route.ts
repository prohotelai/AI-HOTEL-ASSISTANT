export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================================================
// SESSION 5.6 - TICKETS AUTO-CREATION ENDPOINT
// File: app/api/tickets/auto/route.ts
// Auto-create support tickets from AI workflow triggers
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { WorkflowActionType } from '@/types/qr-automation'
import crypto from 'crypto'
import { requireNextAuthSecret } from '@/lib/env'

const NEXTAUTH_SECRET_BYTES = new TextEncoder().encode(requireNextAuthSecret())
const TICKET_SYNC_TIMEOUT = 8000 // 8 seconds

// ============================================================================
// 1. HELPER: Verify Session
// ============================================================================

async function verifySession(token: string, hotelId: string) {
  try {
    const { payload } = await jwtVerify(token, NEXTAUTH_SECRET_BYTES)

    if (payload.hotelId !== hotelId) {
      return { valid: false, error: 'Hotel ID mismatch' }
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Session expired' }
    }

    return {
      valid: true,
      data: {
        userId: payload.userId,
        userRole: payload.role,
        hotelId: payload.hotelId,
      },
    }
  } catch (error) {
    logger.error('Session verification failed', { error })
    return { valid: false, error: 'Invalid session' }
  }
}

// ============================================================================
// 2. HELPER: Validate Ticket Request
// ============================================================================

function validateTicketRequest(data: any): { valid: boolean; error?: string } {
  const { title, description, type, priority, hotelId } = data

  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Missing or empty title' }
  }

  if (title.length > 255) {
    return { valid: false, error: 'Title too long (max 255 characters)' }
  }

  if (!description || description.trim().length === 0) {
    return { valid: false, error: 'Missing or empty description' }
  }

  if (!['maintenance', 'housekeeping', 'front_desk', 'billing', 'guest_service']
    .includes(type)) {
    return { valid: false, error: 'Invalid ticket type' }
  }

  if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
    return { valid: false, error: 'Invalid priority' }
  }

  if (!hotelId) {
    return { valid: false, error: 'Missing hotelId' }
  }

  return { valid: true }
}

// ============================================================================
// 3. HELPER: Generate Ticket ID
// ============================================================================

function generateTicketId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ticket_${timestamp}_${random}`.toUpperCase()
}

// ============================================================================
// 4. HELPER: Create Ticket in System
// ============================================================================

async function createTicket(
  hotelId: string,
  ticketData: {
    title: string
    description: string
    type: string
    priority: string
    guestId?: string
    roomNumber?: string
    sourceSessionId?: string
  }
): Promise<{
  success: boolean
  ticketId?: string
  error?: string
  createdAt?: string
}> {
  try {
    const ticketId = generateTicketId()

    // In production, this would integrate with actual ticketing system
    // For now, we simulate with a slight delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    logger.info('Ticket created', {
      ticketId,
      hotelId,
      type: ticketData.type,
      priority: ticketData.priority,
    })

    return {
      success: true,
      ticketId,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('Ticket creation error', { error, hotelId })
    return {
      success: false,
      error: 'Failed to create ticket',
    }
  }
}

// ============================================================================
// 5. HELPER: Record Ticket in Database
// ============================================================================

async function recordTicketInDatabase(
  hotelId: string,
  sessionId: string,
  ticketId: string,
  ticketData: any,
  createdBy: 'ai_automation' | 'manual' | 'guest' | 'staff'
): Promise<void> {
  try {
    // TODO: Implement aIInteractionLog and workflowExecutionHistory models
    logger.info('Ticket logged (models not yet implemented)', {
      ticketId,
      sessionId,
      hotelId,
    })
  } catch (error) {
    logger.error('Error recording ticket in database', { error, ticketId })
    // Don't throw - ticket was created successfully
  }
}

// ============================================================================
// 6. HELPER: Check for Duplicate Tickets
// ============================================================================

async function checkForDuplicates(
  hotelId: string,
  title: string,
  roomNumber?: string
): Promise<boolean> {
  try {
    // Check if a similar ticket exists from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // This would check your ticketing system for duplicates
    // For now, we always allow creation (no duplicate check)
    return false
  } catch (error) {
    logger.warn('Duplicate check failed', { error, title })
    return false
  }
}

// ============================================================================
// 7. HELPER: Route Ticket to Appropriate Queue
// ============================================================================

async function routeTicket(
  ticketId: string,
  type: string,
  priority: string,
  hotelId: string
): Promise<{ routed: boolean; queue?: string; error?: string }> {
  try {
    const queueMap: Record<string, string> = {
      maintenance: 'maintenance_queue',
      housekeeping: 'housekeeping_queue',
      front_desk: 'front_desk_queue',
      billing: 'billing_queue',
      guest_service: 'guest_service_queue',
    }

    const queue = queueMap[type] || 'general_queue'

    // In production, this would route to actual queue system
    logger.info('Ticket routed', { ticketId, queue, priority })

    return { routed: true, queue }
  } catch (error) {
    logger.error('Ticket routing error', { error, ticketId })
    return { routed: false, error: 'Failed to route ticket' }
  }
}

// ============================================================================
// 8. MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  // Auto ticket creation requires userSessionLog model which doesn't exist
  return NextResponse.json(
    { error: 'Feature not yet fully implemented' },
    { status: 501 }
  )
}

/*
// Original implementation commented out - requires userSessionLog model
  const requestId = `req_${crypto.randomUUID()}`
  const startTime = Date.now()

  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_AUTH',
            message: 'Missing Authorization header',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Parse request
    const body = await request.json()
    const {
      sessionId,
      userId,
      hotelId,
      ticketData,
      sourceType = 'ai_automation',
      context,
    } = body

    // Validate request
    const validation = validateTicketRequest({
      ...ticketData,
      hotelId,
    })

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Validation failed',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      )
    }

    // Verify session
    const sessionVerification = await verifySession(token, hotelId)
    if (!sessionVerification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: sessionVerification.error || 'Unauthorized',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 401 }
      )
    }

    // Get session log
    const sessionLog = await db.userSessionLog.findFirst({
      where: {
        sessionId,
        hotelId,
      },
    })

    if (!sessionLog) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 404 }
      )
    }

    // Check for duplicates
    const isDuplicate = await checkForDuplicates(
      hotelId,
      ticketData.title,
      ticketData.roomNumber
    )

    if (isDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_TICKET',
            message: 'A similar ticket already exists',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 409 }
      )
    }

    // Create ticket
    const ticketCreation = await createTicket(hotelId, {
      ...ticketData,
      sourceSessionId: sessionId,
    })

    if (!ticketCreation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TICKET_CREATION_FAILED',
            message: ticketCreation.error || 'Failed to create ticket',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 500 }
      )
    }

    // Route ticket to appropriate queue
    const routing = await routeTicket(
      ticketCreation.ticketId!,
      ticketData.type,
      ticketData.priority,
      hotelId
    )

    // Record in database
    await recordTicketInDatabase(
      hotelId,
      sessionId,
      ticketCreation.ticketId!,
      ticketData,
      sourceType
    )

    const duration = Date.now() - startTime

    logger.info('Ticket auto-creation completed', {
      requestId,
      ticketId: ticketCreation.ticketId,
      type: ticketData.type,
      duration,
    })

    // Return response
    return NextResponse.json(
      {
        success: true,
        ticketId: ticketCreation.ticketId,
        status: 'open',
        type: ticketData.type,
        priority: ticketData.priority,
        queue: routing.queue,
        createdAt: ticketCreation.createdAt,
        createdBy: sourceType,
        timestamp: new Date(),
        requestId,
      },
      { status: 201 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Ticket auto-creation error', {
      requestId,
      error,
      duration,
    })

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
        requestId,
      },
      { status: 500 }
    )
  }
}
*/

// ============================================================================
// OPTIONS Handler for CORS
// ============================================================================

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { success: true },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
