/**
 * AI Trigger: Create Support Ticket
 * 
 * SAFETY: AI can create support tickets for guest requests
 * - RBAC validated
 * - Audit logged
 * - Idempotent
 */

import { createTicket } from '@/lib/services/ticketService'
import { guardAITrigger, AIContext, AIPermission } from '../guards/aiPermissionGuard'
import { TicketPriority } from '@prisma/client'

export interface AITicketSuggestion {
  title: string
  description: string
  priority?: TicketPriority
  guestId?: string
  guestName?: string
  guestEmail?: string
  guestRoom?: string
  conversationId?: string
  tags?: string[]
  reason: string // Why AI is creating this
}

/**
 * AI-triggered support ticket creation
 * CRITICAL: Goes through existing service layer with RBAC
 */
export async function triggerSupportTicket(
  context: AIContext,
  suggestion: AITicketSuggestion
) {
  return guardAITrigger(
    context,
    AIPermission.TRIGGER_TICKET,
    async () => {
      // Build ticket input
      const ticketData = {
        title: suggestion.title,
        description: `${suggestion.description}\n\n[AI Reason: ${suggestion.reason}]`,
        priority: suggestion.priority || 'MEDIUM',
        source: 'AI_AGENT',
        guestId: suggestion.guestId,
        guestName: suggestion.guestName,
        guestEmail: suggestion.guestEmail,
        guestRoom: suggestion.guestRoom,
        conversationId: suggestion.conversationId,
        tags: suggestion.tags
      }

      // Call existing service layer (with RBAC and validation)
      const ticket = await createTicket(
        { hotelId: context.hotelId, userId: context.userId || 'ai-system' },
        ticketData
      )

      return {
        ticketId: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        aiCreated: true,
        reason: suggestion.reason
      }
    },
    {
      suggestionType: 'support_ticket',
      title: suggestion.title,
      priority: suggestion.priority,
      reason: suggestion.reason
    }
  )
}

/**
 * AI trigger: Escalate existing ticket
 */
export async function triggerTicketEscalation(
  context: AIContext,
  ticketId: string,
  reason: string
) {
  return guardAITrigger(
    context,
    AIPermission.TRIGGER_TICKET,
    async () => {
      // Import updateTicket dynamically to avoid circular deps
      const { updateTicket } = await import('@/lib/services/ticketService')
      
      const ticket = await updateTicket(
        { 
          hotelId: context.hotelId, 
          userId: context.userId || 'ai-system',
          ticketId 
        },
        {
          priority: 'HIGH',
          escalationLevel: 1
        }
      )

      return {
        ticketId: ticket.id,
        newPriority: ticket.priority,
        escalationLevel: ticket.escalationLevel,
        aiEscalated: true,
        reason
      }
    },
    {
      actionType: 'ticket_escalation',
      ticketId,
      reason
    }
  )
}
