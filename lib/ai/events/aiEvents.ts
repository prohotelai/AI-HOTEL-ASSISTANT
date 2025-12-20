/**
 * AI Event System
 * 
 * SAFETY: Event-driven architecture for AI triggers
 * - Decouples AI from direct service calls
 * - Enables audit trail
 * - Future: ML training data collection
 */

import { EventEmitter } from 'events'
import { prisma } from '@/lib/prisma'

/**
 * AI Event Types
 */
export enum AIEventType {
  // AI Insights (read-only)
  INSIGHT_GENERATED = 'ai.insight.generated',
  PREDICTION_MADE = 'ai.prediction.made',
  ANOMALY_DETECTED = 'ai.anomaly.detected',
  
  // AI Triggers (write operations)
  TASK_SUGGESTED = 'ai.task.suggested',
  TICKET_CREATED = 'ai.ticket.created',
  NOTIFICATION_SENT = 'ai.notification.sent',
  
  // AI Learning (future ML hooks)
  FEEDBACK_RECEIVED = 'ai.feedback.received',
  ACTION_CONFIRMED = 'ai.action.confirmed',
  ACTION_REJECTED = 'ai.action.rejected'
}

export interface AIEvent {
  type: AIEventType
  hotelId: string
  userId?: string
  timestamp: Date
  data: Record<string, any>
  metadata?: Record<string, any>
}

/**
 * AI Event Bus (singleton)
 */
class AIEventBus extends EventEmitter {
  private static instance: AIEventBus

  private constructor() {
    super()
    this.setMaxListeners(100) // Increase for production
  }

  static getInstance(): AIEventBus {
    if (!AIEventBus.instance) {
      AIEventBus.instance = new AIEventBus()
    }
    return AIEventBus.instance
  }

  /**
   * Emit AI event (with automatic logging)
   */
  async emitAIEvent(event: AIEvent): Promise<void> {
    // Log event to database for audit trail
    await this.logEvent(event)
    
    // Emit to listeners
    this.emit(event.type, event)
    this.emit('*', event) // Wildcard listener
  }

  /**
   * Log event to database
   */
  private async logEvent(event: AIEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          hotelId: event.hotelId,
          userId: event.userId || 'ai-system',
          eventType: 'AI_EVENT',
          action: event.type,
          resourceType: 'AI_EVENT',
          success: true,
          severity: 'INFO',
          metadata: {
            ...event.data,
            ...event.metadata,
            timestamp: event.timestamp.toISOString()
          }
        }
      })
    } catch (error) {
      console.error('Failed to log AI event:', error)
    }
  }
}

// Export singleton instance
export const aiEventBus = AIEventBus.getInstance()

/**
 * Helper: Emit insight generated event
 */
export async function emitInsightGenerated(
  hotelId: string,
  insightType: string,
  insight: any,
  userId?: string
) {
  await aiEventBus.emitAIEvent({
    type: AIEventType.INSIGHT_GENERATED,
    hotelId,
    userId,
    timestamp: new Date(),
    data: {
      insightType,
      insight
    }
  })
}

/**
 * Helper: Emit task suggested event
 */
export async function emitTaskSuggested(
  hotelId: string,
  taskType: string,
  suggestion: any,
  userId?: string
) {
  await aiEventBus.emitAIEvent({
    type: AIEventType.TASK_SUGGESTED,
    hotelId,
    userId,
    timestamp: new Date(),
    data: {
      taskType,
      suggestion
    }
  })
}

/**
 * Helper: Emit action feedback (for ML training)
 */
export async function emitActionFeedback(
  hotelId: string,
  actionId: string,
  confirmed: boolean,
  feedback?: string,
  userId?: string
) {
  await aiEventBus.emitAIEvent({
    type: confirmed ? AIEventType.ACTION_CONFIRMED : AIEventType.ACTION_REJECTED,
    hotelId,
    userId,
    timestamp: new Date(),
    data: {
      actionId,
      confirmed,
      feedback
    }
  })
}

/**
 * Register event listeners (for future integrations)
 */
export function registerAIEventListeners() {
  // Example: Log all AI events
  aiEventBus.on('*', (event: AIEvent) => {
    console.log(`[AI Event] ${event.type}`, {
      hotelId: event.hotelId,
      timestamp: event.timestamp
    })
  })

  // Future: Webhook notifications
  // aiEventBus.on(AIEventType.TASK_SUGGESTED, async (event) => {
  //   await sendWebhook(event)
  // })

  // Future: ML model retraining triggers
  // aiEventBus.on(AIEventType.FEEDBACK_RECEIVED, async (event) => {
  //   await queueMLRetraining(event)
  // })
}
