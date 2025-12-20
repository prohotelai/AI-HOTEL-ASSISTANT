// ============================================================================
// SESSION 5.6 - LOGGING & AUDIT SYSTEM
// File: lib/logging/audit-logger.ts
// Comprehensive logging for QR scans, workflows, and AI interactions
// ============================================================================

import { logger as baseLogger } from '@/lib/logger'
import { AuditLogEntry, AuditTrail, UserRole } from '@/types/qr-automation'
import { db } from '@/lib/db'

// ============================================================================
// 1. AUDIT LOGGER CLASS
// ============================================================================

export class AuditLogger {
  private sessionId: string
  private hotelId: string
  private userId: string
  private userRole: UserRole
  private entries: AuditLogEntry[] = []

  constructor(
    sessionId: string,
    hotelId: string,
    userId: string,
    userRole: UserRole
  ) {
    this.sessionId = sessionId
    this.hotelId = hotelId
    this.userId = userId
    this.userRole = userRole
  }

  /**
   * Log an action
   */
  logAction(
    action: string,
    resource: string,
    resourceId?: string,
    changesBefore?: Record<string, any>,
    changesAfter?: Record<string, any>,
    status: 'success' | 'failed' = 'success',
    error?: string
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      userId: this.userId,
      userRole: this.userRole,
      action,
      resource,
      resourceId,
      changesBefore,
      changesAfter,
      status,
      error,
    }

    this.entries.push(entry)

    // Log to system logger
    baseLogger.info('Audit log entry', {
      sessionId: this.sessionId,
      action,
      resource,
      status,
    })
  }

  /**
   * Log AI model invocation
   */
  logAIInvocation(
    modelId: string,
    requestPayload: Record<string, any>,
    responsePayload: Record<string, any>,
    executionTimeMs: number,
    status: 'success' | 'failed'
  ): void {
    this.logAction(
      'ai_invocation',
      'ai_model',
      modelId,
      { request: requestPayload },
      { response: responsePayload, executionTimeMs },
      status
    )
  }

  /**
   * Log PMS update
   */
  logPMSUpdate(
    workOrderId: string,
    beforeState: Record<string, any>,
    afterState: Record<string, any>,
    status: 'success' | 'failed' = 'success'
  ): void {
    this.logAction(
      'pms_update',
      'work_order',
      workOrderId,
      beforeState,
      afterState,
      status
    )
  }

  /**
   * Log ticket creation
   */
  logTicketCreation(
    ticketId: string,
    ticketData: Record<string, any>,
    status: 'success' | 'failed' = 'success'
  ): void {
    this.logAction(
      'ticket_creation',
      'ticket',
      ticketId,
      {},
      ticketData,
      status
    )
  }

  /**
   * Log permission check
   */
  logPermissionCheck(
    permission: string,
    granted: boolean,
    reason?: string
  ): void {
    this.logAction(
      'permission_check',
      'permission',
      permission,
      {},
      { granted, reason },
      granted ? 'success' : 'failed',
      granted ? undefined : `Permission denied: ${reason}`
    )
  }

  /**
   * Get all audit entries
   */
  getAuditTrail(): AuditTrail {
    return {
      entries: this.entries,
      startTime: this.entries.length > 0 ? this.entries[0].timestamp : new Date(),
      endTime: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : new Date(),
      totalEntries: this.entries.length,
    }
  }

  /**
   * Persist audit trail to database
   */
  async persistAuditTrail(): Promise<void> {
    try {
      const trail = this.getAuditTrail()

      // Save to workflow execution history - Model not in schema, stubbed
      /* await db.workflowExecutionHistory.create({
        data: {
          hotelId: this.hotelId,
          sessionId: this.sessionId,
          workflowId: `wf_${this.sessionId}`,
          workflowName: 'QR Scan Workflow',
          userId: this.userId,
          userRole: this.userRole.toString(),
          steps: JSON.stringify([]), // Will be populated by workflow
          status: 'success',
          totalDuration: 0,
          auditLog: JSON.stringify(trail),
          startedAt: trail.startTime,
          completedAt: trail.endTime,
        },
      }) */

      baseLogger.info('Audit trail persisted (stubbed)', {
        sessionId: this.sessionId,
        entries: this.entries.length,
      })
    } catch (error) {
      baseLogger.error('Error persisting audit trail', { error, sessionId: this.sessionId })
    }
  }

  /**
   * Export audit trail as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.getAuditTrail(), null, 2)
  }

  /**
   * Export audit trail as CSV
   */
  exportAsCSV(): string {
    const trail = this.getAuditTrail()
    const headers = ['Timestamp', 'User ID', 'User Role', 'Action', 'Resource', 'Resource ID', 'Status', 'Error']
    const rows = trail.entries.map((entry) => [
      entry.timestamp.toISOString(),
      entry.userId,
      entry.userRole,
      entry.action,
      entry.resource,
      entry.resourceId || '',
      entry.status,
      entry.error || '',
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    return csv
  }
}

// ============================================================================
// 2. WORKFLOW EXECUTION TRACKER
// ============================================================================

export class WorkflowExecutionTracker {
  private sessionId: string
  private hotelId: string
  private startTime: Date = new Date()
  private steps: Array<{
    id: string
    name: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    startTime: Date
    endTime?: Date
    duration?: number
    result?: Record<string, any>
    error?: string
  }> = []

  constructor(sessionId: string, hotelId: string) {
    this.sessionId = sessionId
    this.hotelId = hotelId
  }

  /**
   * Add step to execution
   */
  addStep(id: string, name: string): void {
    this.steps.push({
      id,
      name,
      status: 'pending',
      startTime: new Date(),
    })
  }

  /**
   * Start step execution
   */
  startStep(stepId: string): void {
    const step = this.steps.find((s) => s.id === stepId)
    if (step) {
      step.status = 'in_progress'
      step.startTime = new Date()
    }
  }

  /**
   * Complete step execution
   */
  completeStep(stepId: string, result?: Record<string, any>): void {
    const step = this.steps.find((s) => s.id === stepId)
    if (step) {
      step.status = 'completed'
      step.endTime = new Date()
      step.duration = step.endTime.getTime() - step.startTime.getTime()
      step.result = result
    }
  }

  /**
   * Fail step execution
   */
  failStep(stepId: string, error: string): void {
    const step = this.steps.find((s) => s.id === stepId)
    if (step) {
      step.status = 'failed'
      step.endTime = new Date()
      step.duration = step.endTime.getTime() - step.startTime.getTime()
      step.error = error
    }
  }

  /**
   * Get execution summary
   */
  getExecutionSummary() {
    const endTime = new Date()
    const totalDuration = endTime.getTime() - this.startTime.getTime()
    const completedSteps = this.steps.filter((s) => s.status === 'completed').length
    const failedSteps = this.steps.filter((s) => s.status === 'failed').length

    return {
      sessionId: this.sessionId,
      hotelId: this.hotelId,
      startTime: this.startTime,
      endTime,
      totalDuration,
      steps: this.steps,
      totalSteps: this.steps.length,
      completedSteps,
      failedSteps,
      successRate: completedSteps / this.steps.length,
      status: failedSteps === 0 ? 'success' : 'partial_success',
    }
  }

  /**
   * Persist execution history
   */
  async persistHistory(): Promise<void> {
    try {
      const summary = this.getExecutionSummary()

      /* await db.workflowExecutionHistory.create({
        data: {
          hotelId: this.hotelId,
          sessionId: this.sessionId,
          workflowId: `wf_${this.sessionId}`,
          workflowName: 'QR Automation Workflow',
          userId: 'system',
          userRole: 'admin',
          steps: JSON.stringify(summary.steps),
          status: summary.status as any,
          totalDuration: summary.totalDuration,
          auditLog: JSON.stringify(summary),
          startedAt: summary.startTime,
          completedAt: summary.endTime,
        },
      }) */

      baseLogger.info('Workflow execution history persisted (stubbed)', {
        sessionId: this.sessionId,
        status: summary.status,
      })
    } catch (error) {
      baseLogger.error('Error persisting workflow execution history', { error, sessionId: this.sessionId })
    }
  }
}

// ============================================================================
// 3. STRUCTURED LOGGING
// ============================================================================

export function logQRScan(
  sessionId: string,
  userId: string,
  hotelId: string,
  scanMethod: string,
  metadata?: Record<string, any>
): void {
  baseLogger.info('QR_SCAN', {
    event: 'qr_scan',
    sessionId,
    userId,
    hotelId,
    scanMethod,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logWorkflowStart(
  sessionId: string,
  workflowId: string,
  userId: string,
  hotelId: string,
  aiModels: string[]
): void {
  baseLogger.info('WORKFLOW_START', {
    event: 'workflow_start',
    sessionId,
    workflowId,
    userId,
    hotelId,
    aiModels,
    timestamp: new Date().toISOString(),
  })
}

export function logAIModelExecution(
  sessionId: string,
  modelId: string,
  executionTimeMs: number,
  status: 'success' | 'failed',
  metadata?: Record<string, any>
): void {
  baseLogger.info('AI_MODEL_EXECUTION', {
    event: 'ai_model_execution',
    sessionId,
    modelId,
    executionTimeMs,
    status,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logPMSSync(
  sessionId: string,
  workOrderId: string,
  status: 'success' | 'failed',
  syncTimeMs: number,
  metadata?: Record<string, any>
): void {
  baseLogger.info('PMS_SYNC', {
    event: 'pms_sync',
    sessionId,
    workOrderId,
    status,
    syncTimeMs,
    timestamp: new Date().toISOString(),
    ...metadata,
  })
}

export function logSecurityEvent(
  eventType: string,
  userId: string,
  hotelId: string,
  severity: 'low' | 'medium' | 'high',
  details?: Record<string, any>
): void {
  baseLogger.warn('SECURITY_EVENT', {
    event: 'security_event',
    eventType,
    userId,
    hotelId,
    severity,
    timestamp: new Date().toISOString(),
    ...details,
  })
}

// ============================================================================
// 4. ANALYTICS HELPER
// ============================================================================

export function calculateWorkflowMetrics(
  executionSummary: ReturnType<WorkflowExecutionTracker['getExecutionSummary']>
) {
  const stepDurations = executionSummary.steps
    .filter((s) => s.duration)
    .map((s) => s.duration || 0)

  return {
    totalDuration: executionSummary.totalDuration,
    averageStepDuration: stepDurations.length > 0
      ? stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length
      : 0,
    slowestStep: executionSummary.steps.reduce((prev, current) =>
      (prev.duration || 0) > (current.duration || 0) ? prev : current
    ),
    successRate: executionSummary.successRate,
    totalSteps: executionSummary.totalSteps,
    failedSteps: executionSummary.failedSteps,
  }
}

// ============================================================================
// Export
// ============================================================================

const auditLoggerExports = {
  AuditLogger,
  WorkflowExecutionTracker,
  logQRScan,
  logWorkflowStart,
  logAIModelExecution,
  logPMSSync,
  logSecurityEvent,
  calculateWorkflowMetrics,
}

export default auditLoggerExports
