/**
 * AI Trigger: Staff Notifications
 * 
 * SAFETY: AI can send notifications to staff
 * - RBAC validated
 * - Rate limited
 * - Audit logged
 */

import { guardAITrigger, AIContext, AIPermission } from '../guards/aiPermissionGuard'
import { prisma } from '@/lib/prisma'

export interface AINotification {
  recipientId: string // Staff user ID
  title: string
  message: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  category: string // GUEST_REQUEST, MAINTENANCE, HOUSEKEEPING, BOOKING, OTHER
  relatedEntityId?: string // Ticket ID, Booking ID, etc.
  reason: string // Why AI is sending this
}

/**
 * AI-triggered staff notification
 * CRITICAL: Rate limited and validated
 */
export async function triggerStaffNotification(
  context: AIContext,
  notification: AINotification
) {
  return guardAITrigger(
    context,
    AIPermission.TRIGGER_NOTIFICATION,
    async () => {
      // Verify recipient exists and belongs to same hotel
      const recipient = await prisma.user.findFirst({
        where: {
          id: notification.recipientId,
          hotelId: context.hotelId
        }
      })

      if (!recipient) {
        throw new Error('Recipient not found or does not belong to this hotel')
      }

      // Create notification (using AuditLog as notification store for now)
      // In Phase 7+, this would use a dedicated Notification model
      await prisma.auditLog.create({
        data: {
          hotelId: context.hotelId,
          userId: notification.recipientId,
          eventType: 'AI_NOTIFICATION',
          action: notification.category,
          resourceType: 'NOTIFICATION',
          resourceId: notification.relatedEntityId,
          success: true,
          severity: notification.priority === 'URGENT' ? 'ERROR' : 
                    notification.priority === 'HIGH' ? 'WARNING' : 'INFO',
          metadata: {
            title: notification.title,
            message: notification.message,
            category: notification.category,
            aiReason: notification.reason,
            source: context.source
          }
        }
      })

      return {
        notificationId: 'sent',
        recipientId: notification.recipientId,
        recipientName: recipient.name,
        priority: notification.priority,
        aiTriggered: true,
        reason: notification.reason
      }
    },
    {
      actionType: 'staff_notification',
      recipientId: notification.recipientId,
      category: notification.category,
      priority: notification.priority,
      reason: notification.reason
    }
  )
}

/**
 * AI trigger: Notify multiple staff members
 */
export async function triggerBulkStaffNotification(
  context: AIContext,
  recipientIds: string[],
  notification: Omit<AINotification, 'recipientId'>
) {
  // Limit bulk notifications to prevent spam
  if (recipientIds.length > 10) {
    throw new Error('Bulk notifications limited to 10 recipients')
  }

  const results = []
  
  for (const recipientId of recipientIds) {
    try {
      const result = await triggerStaffNotification(context, {
        ...notification,
        recipientId
      })
      results.push({ recipientId, success: true, result })
    } catch (error: any) {
      results.push({ recipientId, success: false, error: error.message })
    }
  }

  return {
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}
