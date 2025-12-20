// ============================================================================
// SESSION 5.6 - AI TRIGGER & AUTOMATION ENGINE
// File: app/api/ai/trigger/route.ts
// Routes to appropriate AI models and manages workflow automation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  AITriggerRequest,
  AITriggerResponse,
  AIModelId,
  WorkflowAction,
  WorkflowActionType,
  WorkflowStatus,
} from '@/types/qr-automation'
import { triggerAIModel } from '@/lib/ai/workflow-engine'
import crypto from 'crypto'
import { requireNextAuthSecret } from '@/lib/env'

const NEXTAUTH_SECRET_BYTES = new TextEncoder().encode(requireNextAuthSecret())

// ============================================================================
// 1. HELPER: Verify JWT Session
// ============================================================================

async function verifySession(token: string, hotelId: string) {
  try {
    const { payload } = await jwtVerify(token, NEXTAUTH_SECRET_BYTES)

    // Verify hotel ID matches
    if (payload.hotelId !== hotelId) {
      return { valid: false, error: 'Hotel ID mismatch' }
    }

    // Check expiration
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
// 2. HELPER: Get Session Log
// ============================================================================

async function getSessionLog(sessionId: string, hotelId: string) {
  // TODO: Implement userSessionLog model
  logger.warn('getSessionLog called but userSessionLog model not yet implemented', { sessionId, hotelId })
  return null
}

// ============================================================================
// 3. HELPER: Execute AI Model
// ============================================================================

async function executeAIModel(
  modelId: AIModelId,
  requestPayload: Record<string, any>,
  context: any
): Promise<{
  status: 'success' | 'failed' | 'timeout' | 'partial'
  responsePayload: Record<string, any>
  executionTimeMs: number
  actionsTriggered: WorkflowAction[]
  error?: string
}> {
  const startTime = Date.now()

  try {
    const response = await triggerAIModel(modelId, requestPayload, context)
    const executionTimeMs = Date.now() - startTime

    // Parse AI response and extract actions
    const actions = parseAIResponse(response, modelId)

    return {
      status: 'success',
      responsePayload: response,
      executionTimeMs,
      actionsTriggered: actions,
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime

    logger.error('AI model execution failed', {
      modelId,
      error,
      executionTimeMs,
    })

    return {
      status: 'failed',
      responsePayload: {},
      executionTimeMs,
      actionsTriggered: [],
      error: error instanceof Error ? error.message : 'Model execution failed',
    }
  }
}

// ============================================================================
// 4. HELPER: Parse AI Response to Workflow Actions
// ============================================================================

function parseAIResponse(
  response: Record<string, any>,
  modelId: AIModelId
): WorkflowAction[] {
  const actions: WorkflowAction[] = []

  try {
    // Different AI models produce different action types
    switch (modelId) {
      case AIModelId.GUEST_MESSAGING:
        if (response.messages) {
          actions.push({
            id: `act_${crypto.randomBytes(8).toString('hex')}`,
            type: WorkflowActionType.SEND_MESSAGE,
            description: `Send AI message: ${response.messages[0]?.text || ''}`,
            payload: { messages: response.messages },
            triggerTime: new Date(),
            priority: 'normal',
          })
        }
        break

      case AIModelId.UPSELL_ENGINE:
        if (response.offers) {
          actions.push({
            id: `act_${crypto.randomBytes(8).toString('hex')}`,
            type: WorkflowActionType.TRIGGER_UPSELL,
            description: `Trigger upsell: ${response.offers[0]?.title || ''}`,
            payload: { offers: response.offers },
            triggerTime: new Date(),
            priority: 'normal',
          })
        }
        break

      case AIModelId.TASK_ROUTING:
        if (response.recommendedTasks) {
          response.recommendedTasks.forEach((task: any) => {
            actions.push({
              id: `act_${crypto.randomBytes(8).toString('hex')}`,
              type: WorkflowActionType.CREATE_TASK,
              description: `Create task: ${task.title}`,
              payload: task,
              triggerTime: new Date(),
              priority: task.priority || 'normal',
              requiresApproval: task.requiresApproval || false,
            })
          })
        }
        break

      case AIModelId.HOUSEKEEPING:
        if (response.schedules) {
          actions.push({
            id: `act_${crypto.randomBytes(8).toString('hex')}`,
            type: WorkflowActionType.SCHEDULE_CLEANING,
            description: 'Schedule housekeeping',
            payload: { schedules: response.schedules },
            triggerTime: new Date(),
            priority: 'normal',
          })
        }
        break

      case AIModelId.MAINTENANCE:
        if (response.predictions) {
          response.predictions.forEach((prediction: any) => {
            actions.push({
              id: `act_${crypto.randomBytes(8).toString('hex')}`,
              type: WorkflowActionType.CREATE_MAINTENANCE_ORDER,
              description: `Maintenance: ${prediction.issue}`,
              payload: prediction,
              triggerTime: new Date(),
              priority: prediction.urgency || 'normal',
              requiresApproval: true,
            })
          })
        }
        break

      case AIModelId.NIGHT_AUDIT:
        if (response.findings) {
          actions.push({
            id: `act_${crypto.randomBytes(8).toString('hex')}`,
            type: WorkflowActionType.FLAG_BILLING_ISSUE,
            description: 'Night audit findings',
            payload: { findings: response.findings },
            triggerTime: new Date(),
            priority: 'high',
            requiresApproval: true,
          })
        }
        break

      case AIModelId.BILLING:
        if (response.issues) {
          actions.push({
            id: `act_${crypto.randomBytes(8).toString('hex')}`,
            type: WorkflowActionType.FLAG_BILLING_ISSUE,
            description: 'Billing issue detected',
            payload: { issues: response.issues },
            triggerTime: new Date(),
            priority: 'high',
            requiresApproval: true,
          })
        }
        break

      default:
        // Generic action for other models
        if (response.actions) {
          actions.push({
            id: `act_${crypto.randomBytes(8).toString('hex')}`,
            type: WorkflowActionType.LOG_EVENT,
            description: `${modelId} output`,
            payload: response.actions,
            triggerTime: new Date(),
            priority: 'normal',
          })
        }
    }
  } catch (error) {
    logger.error('Error parsing AI response', { modelId, error })
  }

  return actions
}

// ============================================================================
// 5. HELPER: Log AI Interaction
// ============================================================================

async function logAIInteraction(
  hotelId: string,
  sessionId: string,
  userId: string,
  modelId: AIModelId,
  modelName: string,
  request: Record<string, any>,
  response: any,
  executionTimeMs: number,
  status: 'success' | 'failed' | 'timeout' | 'partial',
  actions: WorkflowAction[]
): Promise<void> {
  try {
    // TODO: Implement aIInteractionLog model
    logger.info('AI interaction logged (model not yet implemented)', {
      hotelId,
      sessionId,
      modelId,
      status,
      executionTimeMs,
    })

    logger.info('AI interaction logged', {
      modelId,
      sessionId,
      executionTimeMs,
      status,
      actionsTriggered: actions.length,
    })
  } catch (error) {
    logger.error('Error logging AI interaction', { error, modelId, sessionId })
    // Don't throw - logging failure shouldn't block response
  }
}

// ============================================================================
// 6. MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = `req_${crypto.randomUUID()}`
  const startTime = Date.now()

  try {
    // Parse request
    const body = await request.json()
    const {
      sessionId,
      userId,
      userRole,
      hotelId,
      modelId,
      requestPayload,
      context,
    } = body as AITriggerRequest

    // Validate required fields
    if (!sessionId || !userId || !hotelId || !modelId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 400 }
      )
    }

    // Get session log to verify active session
    const sessionLog = await getSessionLog(sessionId, hotelId)
    if (!sessionLog) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SESSION',
            message: 'Session not found or expired',
          },
          timestamp: new Date(),
          requestId,
        },
        { status: 401 }
      )
    }

    // Execute AI model
    const modelResponse = await executeAIModel(
      modelId,
      requestPayload || {},
      context || {}
    )

    // Log AI interaction
    await logAIInteraction(
      hotelId,
      sessionId,
      userId,
      modelId,
      modelId, // model name
      requestPayload || {},
      modelResponse.responsePayload,
      modelResponse.executionTimeMs,
      modelResponse.status,
      modelResponse.actionsTriggered
    )

    const duration = Date.now() - startTime

    logger.info('AI trigger executed', {
      requestId,
      modelId,
      sessionId,
      status: modelResponse.status,
      duration,
    })

    // Return response
    const response: AITriggerResponse = {
      modelId,
      sessionId,
      status: modelResponse.status,
      executionTimeMs: modelResponse.executionTimeMs,
      responsePayload: modelResponse.responsePayload,
      actionsTriggered: modelResponse.actionsTriggered,
      actionsExecuted: [], // Will be populated by workflow executor
      error: modelResponse.error,
      confidence: 0.85,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('AI trigger error', {
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
