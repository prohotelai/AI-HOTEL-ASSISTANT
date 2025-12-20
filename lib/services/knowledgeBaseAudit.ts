import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'

type AuditLogInput = {
  hotelId: string
  documentId: string
  actorId: string
  action: 'KB_DOCUMENT_ARCHIVED' | 'KB_DOCUMENT_RESTORED'
}

export async function recordKnowledgeBaseAudit(input: AuditLogInput) {
  // TODO: Create KnowledgeBaseAudit table in Prisma schema and persist audit log.
  // For now, emit event for telemetry and future audit UI integration.
  eventBus.emit('knowledgeBase.audit.logged', {
    hotelId: input.hotelId,
    documentId: input.documentId,
    action: input.action,
    actorId: input.actorId,
    occurredAt: new Date(),
  })

  console.log('[KB Audit]', {
    action: input.action,
    documentId: input.documentId,
    actorId: input.actorId,
    timestamp: new Date().toISOString(),
  })
}
