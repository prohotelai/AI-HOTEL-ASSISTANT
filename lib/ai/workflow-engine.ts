// ============================================================================
// SESSION 5.6 - AI WORKFLOW ENGINE
// File: lib/ai/workflow-engine.ts
// Core engine for triggering AI models and managing their responses
// ============================================================================

import { AIModelId } from '@/types/qr-automation'
import { logger } from '@/lib/logger'
import {
  nightAuditModel,
  taskRoutingModel,
  housekeepingModel,
  forecastingModel,
  guestMessagingModel,
  roomStatusModel,
  maintenanceModel,
  billingModel,
  pmsLinkingModel,
  agentForStaffModel,
  voiceReceptionModel,
  upsellEngineModel,
} from './models'

// ============================================================================
// 1. AI Model Interface
// ============================================================================

interface AIModel {
  id: AIModelId
  name: string
  version: string
  description: string
  timeout: number
  execute: (payload: Record<string, any>, context: any) => Promise<Record<string, any>>
}

// ============================================================================
// 2. AI Models Registry
// ============================================================================

const AI_MODELS: Record<AIModelId, AIModel> = {
  [AIModelId.NIGHT_AUDIT]: nightAuditModel,
  [AIModelId.TASK_ROUTING]: taskRoutingModel,
  [AIModelId.HOUSEKEEPING]: housekeepingModel,
  [AIModelId.FORECASTING]: forecastingModel,
  [AIModelId.GUEST_MESSAGING]: guestMessagingModel,
  [AIModelId.ROOM_STATUS]: roomStatusModel,
  [AIModelId.MAINTENANCE]: maintenanceModel,
  [AIModelId.BILLING]: billingModel,
  [AIModelId.PMS_LINKING]: pmsLinkingModel,
  [AIModelId.AGENT_FOR_STAFF]: agentForStaffModel,
  [AIModelId.VOICE_RECEPTION]: voiceReceptionModel,
  [AIModelId.UPSELL_ENGINE]: upsellEngineModel,
}

// ============================================================================
// 3. MAIN: Trigger AI Model
// ============================================================================

export async function triggerAIModel(
  modelId: AIModelId,
  payload: Record<string, any>,
  context: any = {}
): Promise<Record<string, any>> {
  logger.debug('Triggering AI model', { modelId })

  // Check if model exists
  const model = AI_MODELS[modelId]
  if (!model) {
    const error = `AI model ${modelId} not found`
    logger.error(error)
    throw new Error(error)
  }

  try {
    // Execute model with timeout
    const response = await executeWithTimeout(
      model.execute(payload, context),
      model.timeout
    )

    logger.info('AI model executed successfully', { modelId })
    return response
  } catch (error) {
    logger.error('AI model execution error', { modelId, error })
    throw error
  }
}

// ============================================================================
// 4. HELPER: Execute with Timeout
// ============================================================================

function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('AI model timeout')), timeoutMs)
    ),
  ])
}

// ============================================================================
// 5. HELPER: Validate Model Exists
// ============================================================================

export function isModelAvailable(modelId: AIModelId): boolean {
  return modelId in AI_MODELS
}

// ============================================================================
// 6. HELPER: Get Available Models
// ============================================================================

export function getAvailableModels(): AIModel[] {
  return Object.values(AI_MODELS)
}

// ============================================================================
// 7. HELPER: Get Model Info
// ============================================================================

export function getModelInfo(modelId: AIModelId): AIModel | null {
  return AI_MODELS[modelId] || null
}

// ============================================================================
// 8. BATCH TRIGGER: Execute Multiple AI Models
// ============================================================================

export async function batchTriggerAIModels(
  modelIds: AIModelId[],
  payload: Record<string, any>,
  context: any = {}
): Promise<Record<AIModelId, Record<string, any>>> {
  const results = {} as Record<AIModelId, Record<string, any>>

  // Execute all models in parallel
  const promises = modelIds.map(async (modelId) => {
    try {
      const response = await triggerAIModel(modelId, payload, context)
      results[modelId] = response
    } catch (error) {
      logger.error('Batch trigger error', { modelId, error })
      results[modelId] = { error: String(error), success: false }
    }
  })

  await Promise.all(promises)
  return results
}

// ============================================================================
// 9. STREAMING: Execute AI Model with Streaming Response
// ============================================================================

export async function* streamAIModel(
  modelId: AIModelId,
  payload: Record<string, any>,
  context: any = {}
): AsyncGenerator<string, void, unknown> {
  const model = AI_MODELS[modelId]
  if (!model) {
    throw new Error(`AI model ${modelId} not found`)
  }

  try {
    // For now, execute normally and yield result
    // Real implementation would stream chunks as they arrive
    const response = await model.execute(payload, context)
    yield JSON.stringify(response)
  } catch (error) {
    logger.error('Streaming AI model error', { modelId, error })
    yield JSON.stringify({ error: String(error), success: false })
  }
}

// ============================================================================
// 10. MOCK MODELS FOR DEVELOPMENT/TESTING
// ============================================================================

export const mockAIModels = {
  // Guest Messaging Mock
  guestMessaging: {
    execute: async (payload: any, context: any) => ({
      success: true,
      messages: [
        {
          id: 'msg_1',
          text: 'Hello! How can we help you today?',
          timestamp: new Date(),
          sender: 'ai',
        },
      ],
      sentiment: 'positive',
      confidence: 0.95,
    }),
  },

  // Task Routing Mock
  taskRouting: {
    execute: async (payload: any, context: any) => ({
      success: true,
      recommendedTasks: [
        {
          id: 'task_1',
          title: 'Check room temperature',
          description: 'Guest reported temperature issues',
          assignedTo: 'john.smith@hotel.com',
          priority: 'high',
          estimatedDuration: 15,
        },
      ],
      totalTasks: 3,
      confidence: 0.88,
    }),
  },

  // Night Audit Mock
  nightAudit: {
    execute: async (payload: any, context: any) => ({
      success: true,
      findings: [
        {
          id: 'audit_1',
          type: 'billing_discrepancy',
          description: 'Room 201 has pending charges',
          severity: 'medium',
          amount: 45.5,
        },
      ],
      totalFindings: 2,
      totalAmount: 89.75,
      timestamp: new Date(),
    }),
  },

  // Housekeeping Mock
  housekeeping: {
    execute: async (payload: any, context: any) => ({
      success: true,
      schedules: [
        {
          id: 'sched_1',
          roomNumber: '201',
          cleaningType: 'standard',
          estimatedDuration: 30,
          priority: 'normal',
          scheduledTime: new Date(Date.now() + 3600000),
        },
      ],
      totalScheduled: 5,
    }),
  },
}

// ============================================================================
// Export
// ============================================================================

const workflowEngine = {
  triggerAIModel,
  batchTriggerAIModels,
  streamAIModel,
  getAvailableModels,
  getModelInfo,
  isModelAvailable,
  mockAIModels,
}

export default workflowEngine
