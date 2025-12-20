/**
 * AI Trigger: Create Maintenance Ticket
 * 
 * SAFETY: AI can suggest maintenance tickets, but they're created via service layer
 * - RBAC validated
 * - Audit logged
 * - Idempotent
 */

import { createMaintenanceTicket, CreateMaintenanceTicketInput } from '@/lib/services/maintenanceService'
import { guardAITrigger, AIContext, AIPermission } from '../guards/aiPermissionGuard'
import { MaintenancePriority } from '@prisma/client'

export interface AIMaintenanceTicketSuggestion {
  roomId: string
  category: string
  priority?: MaintenancePriority
  description: string
  reportedBy?: string
  reason: string // Why AI is suggesting this
}

/**
 * AI-triggered maintenance ticket creation
 * CRITICAL: Goes through existing service layer with RBAC
 */
export async function triggerMaintenanceTicket(
  context: AIContext,
  suggestion: AIMaintenanceTicketSuggestion
) {
  return guardAITrigger(
    context,
    AIPermission.TRIGGER_MAINTENANCE,
    async () => {
      // Build ticket input for service layer
      const ticketInput: CreateMaintenanceTicketInput = {
        hotelId: context.hotelId,
        roomId: suggestion.roomId,
        title: `[AI-Suggested] ${suggestion.description.substring(0, 100)}`,
        description: `${suggestion.description}\n\nAI Reason: ${suggestion.reason}`,
        category: suggestion.category,
        priority: suggestion.priority || 'MEDIUM',
        reportedBy: suggestion.reportedBy || context.userId || 'AI System'
      }

      // Call existing service layer (with RBAC and validation)
      const ticket = await createMaintenanceTicket(ticketInput)

      return {
        ticketId: ticket.id,
        roomNumber: ticket.room?.roomNumber || 'N/A',
        priority: ticket.priority,
        status: ticket.status,
        aiSuggested: true,
        reason: suggestion.reason
      }
    },
    {
      suggestionType: 'maintenance_ticket',
      roomId: suggestion.roomId,
      category: suggestion.category,
      reason: suggestion.reason
    }
  )
}

/**
 * AI suggestions for maintenance (read-only)
 * Returns suggested tickets based on patterns
 */
export async function getMaintenanceSuggestions(
  context: AIContext
): Promise<AIMaintenanceTicketSuggestion[]> {
  // This would typically analyze:
  // - Guest complaints patterns
  // - Repeated issues in specific rooms
  // - Preventive maintenance schedules
  // - Equipment age/usage
  
  // For now, return empty array (future ML integration point)
  return []
}
