/**
 * AI Permission Guard
 * 
 * SAFETY: Enforces RBAC for AI agent operations
 * - All AI actions must pass permission checks
 * - Integrates with existing RBAC system
 * - Logs all attempts in AuditLog
 */

import { Permission, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export interface AIContext {
  hotelId: string
  userId?: string // AI agent or user triggering action
  role?: string
  source: 'ai_agent' | 'ai_assistant' | 'user_prompt'
}

export enum AIPermission {
  // Read permissions
  READ_BOOKINGS = 'ai:bookings.read',
  READ_GUESTS = 'ai:guests.read',
  READ_GUESTS_PII = 'ai:guests.read_pii',
  READ_GUESTS_FINANCIAL = 'ai:guests.read_financial',
  READ_ROOMS = 'ai:rooms.read',
  READ_ROOMS_PRICING = 'ai:rooms.read_pricing',
  READ_FOLIOS = 'ai:folios.read',
  READ_HOUSEKEEPING = 'ai:housekeeping.read',
  READ_MAINTENANCE = 'ai:maintenance.read',
  READ_TICKETS = 'ai:tickets.read',
  
  // Trigger permissions (write via service layer)
  TRIGGER_HOUSEKEEPING = 'ai:housekeeping.trigger',
  TRIGGER_MAINTENANCE = 'ai:maintenance.trigger',
  TRIGGER_TICKET = 'ai:tickets.trigger',
  TRIGGER_NOTIFICATION = 'ai:notifications.trigger'
}

/**
 * AI Permission Matrix
 * Maps AI permissions to required user roles
 * Note: Using TICKETS_VIEW as proxy for PMS read access (staff+ level)
 * Note: Using ADMIN_VIEW as proxy for manager+ level access
 */
const AI_PERMISSION_MATRIX: Record<AIPermission, Permission[]> = {
  // Read permissions (most staff can read)
  [AIPermission.READ_BOOKINGS]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_GUESTS]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_GUESTS_PII]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_GUESTS_FINANCIAL]: [Permission.ADMIN_VIEW], // Manager+
  [AIPermission.READ_ROOMS]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_ROOMS_PRICING]: [Permission.ADMIN_VIEW], // Manager+
  [AIPermission.READ_FOLIOS]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_HOUSEKEEPING]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_MAINTENANCE]: [Permission.TICKETS_VIEW], // Staff+
  [AIPermission.READ_TICKETS]: [Permission.TICKETS_VIEW],
  
  // Trigger permissions (require write access)
  [AIPermission.TRIGGER_HOUSEKEEPING]: [Permission.TICKETS_CREATE], // Staff can create
  [AIPermission.TRIGGER_MAINTENANCE]: [Permission.TICKETS_CREATE], // Staff can create
  [AIPermission.TRIGGER_TICKET]: [Permission.TICKETS_CREATE],
  [AIPermission.TRIGGER_NOTIFICATION]: [Permission.TICKETS_CREATE] // Staff can notify
}

/**
 * Check if AI context has permission
 */
export async function checkAIPermission(
  context: AIContext,
  permission: AIPermission
): Promise<{ allowed: boolean; reason?: string }> {
  // AI agents without user context have no permissions
  if (!context.userId) {
    return { allowed: false, reason: 'No user context for AI action' }
  }

  // Get user from database
  const user = await prisma.user.findFirst({
    where: { id: context.userId, hotelId: context.hotelId },
    select: { role: true }
  })

  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }

  // Check if user has required permissions
  const requiredPerms = AI_PERMISSION_MATRIX[permission]
  
  for (const perm of requiredPerms) {
    const allowed = hasPermission(user.role, perm)
    if (allowed) {
      return { allowed: true }
    }
  }

  return {
    allowed: false,
    reason: `Missing required permissions: ${requiredPerms.join(', ')}`
  }
}

/**
 * Guard wrapper for AI read operations
 */
export async function guardAIRead<T>(
  context: AIContext,
  permission: AIPermission,
  operation: () => Promise<T>
): Promise<T> {
  const check = await checkAIPermission(context, permission)
  
  if (!check.allowed) {
    // Log denied access
    await logAIAttempt(context, permission, false, check.reason)
    throw new Error(`AI access denied: ${check.reason}`)
  }

  // Log successful access
  await logAIAttempt(context, permission, true)
  
  return operation()
}

/**
 * Guard wrapper for AI trigger operations (service layer calls)
 */
export async function guardAITrigger<T>(
  context: AIContext,
  permission: AIPermission,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const check = await checkAIPermission(context, permission)
  
  if (!check.allowed) {
    // Log denied trigger
    await logAIAttempt(context, permission, false, check.reason, metadata)
    throw new Error(`AI trigger denied: ${check.reason}`)
  }

  // Log trigger attempt
  await logAIAttempt(context, permission, true, undefined, metadata)
  
  try {
    const result = await operation()
    
    // Log successful trigger
    await logAIAttempt(context, permission, true, 'Trigger completed', {
      ...metadata,
      result: 'success'
    })
    
    return result
  } catch (error: any) {
    // Log failed trigger
    await logAIAttempt(context, permission, false, error.message, {
      ...metadata,
      result: 'error'
    })
    throw error
  }
}

/**
 * Log AI access attempt in AuditLog
 */
async function logAIAttempt(
  context: AIContext,
  permission: AIPermission,
  success: boolean,
  message?: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        hotelId: context.hotelId,
        userId: context.userId || 'ai-system',
        eventType: 'AI_ACCESS',
        action: permission,
        resourceType: 'AI_OPERATION',
        success,
        errorMessage: success ? undefined : message,
        severity: success ? 'INFO' : 'WARNING',
        metadata: {
          source: context.source,
          permission,
          message,
          ...metadata
        }
      }
    })
  } catch (error) {
    // Don't fail the operation if audit log fails
    console.error('Failed to log AI attempt:', error)
  }
}

/**
 * Validate AI context
 */
export function validateAIContext(context: AIContext): void {
  if (!context.hotelId) {
    throw new Error('AI context missing hotelId')
  }
  
  if (!context.source) {
    throw new Error('AI context missing source')
  }
}

/**
 * Create AI context from user session
 */
export function createAIContext(
  hotelId: string,
  userId: string,
  source: AIContext['source'] = 'ai_assistant'
): AIContext {
  return {
    hotelId,
    userId,
    source
  }
}
