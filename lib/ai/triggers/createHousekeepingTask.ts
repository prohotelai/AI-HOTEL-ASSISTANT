/**
 * AI Trigger: Create Housekeeping Task
 * 
 * SAFETY: AI can suggest housekeeping tasks, but they're created via service layer
 * - RBAC validated
 * - Audit logged
 * - Idempotent
 */

import { createHousekeepingTask, CreateHousekeepingTaskInput } from '@/lib/services/housekeepingService'
import { guardAITrigger, AIContext, AIPermission } from '../guards/aiPermissionGuard'
import { HousekeepingTaskPriority } from '@prisma/client'

export interface AIHousekeepingTaskSuggestion {
  roomId: string
  taskType: string
  priority?: HousekeepingTaskPriority
  description?: string
  dueDate?: Date
  assignedTo?: string
  reason: string // Why AI is suggesting this
}

/**
 * AI-triggered housekeeping task creation
 * CRITICAL: Goes through existing service layer with RBAC
 */
export async function triggerHousekeepingTask(
  context: AIContext,
  suggestion: AIHousekeepingTaskSuggestion
) {
  return guardAITrigger(
    context,
    AIPermission.TRIGGER_HOUSEKEEPING,
    async () => {
      // Build task input for service layer
      const taskInput: CreateHousekeepingTaskInput = {
        hotelId: context.hotelId,
        roomId: suggestion.roomId,
        taskType: suggestion.taskType,
        priority: suggestion.priority || 'NORMAL',
        notes: `[AI-Suggested] ${suggestion.description || ''}\nAI Reason: ${suggestion.reason}`,
        scheduledFor: suggestion.dueDate,
        assignedTo: suggestion.assignedTo
      }

      // Call existing service layer (with RBAC and validation)
      const task = await createHousekeepingTask(taskInput)

      return {
        taskId: task.id,
        roomNumber: task.room.roomNumber,
        status: task.status,
        aiSuggested: true,
        reason: suggestion.reason
      }
    },
    {
      suggestionType: 'housekeeping_task',
      roomId: suggestion.roomId,
      taskType: suggestion.taskType,
      reason: suggestion.reason
    }
  )
}

/**
 * AI suggestions for housekeeping (read-only)
 * Returns suggested tasks based on room status
 */
export async function getHousekeepingSuggestions(
  context: AIContext
): Promise<AIHousekeepingTaskSuggestion[]> {
  // This would typically analyze:
  // - Rooms marked DIRTY
  // - Rooms pending inspection
  // - Checkout rooms today
  // - Maintenance completed rooms
  
  // For now, return empty array (future ML integration point)
  return []
}
