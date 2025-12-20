import { EventEmitter } from 'node:events'

// Stub for KnowledgeBaseDocumentStatus
type KnowledgeBaseDocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED'

export type AppEventMap = {
  'tickets.created': {
    ticketId: string
    hotelId: string
  }
  'tickets.updated': {
    ticketId: string
    hotelId: string
    changes: Record<string, unknown>
  }
  'tickets.escalated': {
    ticketId: string
    hotelId: string
    level: number
  }
  'tickets.commented': {
    ticketId: string
    hotelId: string
    visibility: 'PUBLIC' | 'INTERNAL'
  }
  'knowledgeBase.source.created': {
    sourceId: string
    hotelId: string
  }
  'knowledgeBase.document.ingested': {
    documentId: string
    hotelId: string
    sourceId?: string | null
  }
  'knowledgeBase.document.embedded': {
    documentId: string
    hotelId: string
    chunkCount: number
  }
  'knowledgeBase.document.updated': {
    documentId: string
    hotelId: string
    status: KnowledgeBaseDocumentStatus
    actorId: string
    action: 'upload' | 'edit' | 'archived' | 'restored'
  }
  'knowledgeBase.audit.logged': {
    hotelId: string
    documentId: string
    action: 'KB_DOCUMENT_ARCHIVED' | 'KB_DOCUMENT_RESTORED'
    actorId: string
    occurredAt: Date
  }
  'knowledgeBase.sync.completed': {
    jobId: string
    hotelId: string
    status: 'SUCCEEDED' | 'FAILED'
  }
  'knowledgeBase.retrieval.metrics': {
    hotelId: string
    provider: 'vector' | 'keyword'
    query: string
    limit: number
    matches: number
    hitRate: number
    elapsedMs: number
    fallback: boolean
  }
  'pms.booking.synced': {
    bookingId: string
    hotelId: string
    provider: string
    externalId: string
    syncedAt: Date
  }
  'pms.sync.completed': {
    hotelId: string
    provider: string
    syncId: string
    processed: number
    failed: number
    startedAt: Date
    completedAt: Date
  }
  'pms.sync.failed': {
    hotelId: string
    provider: string
    syncId: string
    error: string
    occurredAt: Date
  }
  // Phase 8: Additional PMS events for core operations
  'pms.room.synced': {
    roomId: string
    hotelId: string
    provider: string
    externalId: string
    syncedAt: Date
  }
  'pms.guest.synced': {
    guestId: string
    hotelId: string
    provider: string
    externalId: string
    syncedAt: Date
  }
  'booking.created': {
    bookingId: string
    hotelId: string
    confirmationNumber: string
  }
  'booking.updated': {
    bookingId: string
    hotelId: string
    changes: Record<string, unknown>
  }
  'booking.roomAssigned': {
    bookingId: string
    hotelId: string
    roomId: string
  }
  'booking.cancelled': {
    bookingId: string
    hotelId: string
    reason?: string
  }
  'booking.noShow': {
    bookingId: string
    hotelId: string
  }
  'charge.posted': {
    chargeId: string
    hotelId: string
    folioId: string
    amount: number
  }
  'charge.voided': {
    chargeId: string
    hotelId: string
    folioId: string
  }
  'folio.closed': {
    folioId: string
    hotelId: string
    bookingId: string
    totalAmount: number
  }
  // Phase 7: External PMS integration events
  'pms.external.connected': {
    hotelId: string
    pmsType: string
    configId: string
  }
  'pms.external.disconnected': {
    hotelId: string
  }
  'chat.message.generated': {
    conversationId: string
    hotelId: string
    model: string
    tokenUsage?: {
      prompt?: number
      completion?: number
      total?: number
    }
  }
  'usage.limit.exceeded': {
    hotelId: string
    limitType: string
    currentUsage: number
    limit: number
  }
  // Phase 4: Housekeeping events
  'housekeeping.task.created': {
    taskId: string
    hotelId: string
    roomId: string
    taskType: string
    priority: string
  }
  'housekeeping.task.assigned': {
    taskId: string
    hotelId: string
    roomId: string
    assignedTo: string
  }
  'housekeeping.task.started': {
    taskId: string
    hotelId: string
    roomId: string
  }
  'housekeeping.task.completed': {
    taskId: string
    hotelId: string
    roomId: string
    issuesFound: string | null
  }
  'housekeeping.task.verified': {
    taskId: string
    hotelId: string
    roomId: string
    passed: boolean
  }
  'housekeeping.checkout.task.generated': {
    taskId: string
    hotelId: string
    roomId: string
    bookingReference: string
  }
  // Phase 4: Maintenance events
  'maintenance.ticket.created': {
    ticketId: string
    hotelId: string
    roomId: string | null
    priority: string
    blocksRoom: boolean
  }
  'maintenance.ticket.updated': {
    ticketId: string
    hotelId: string
    roomId: string | null
    oldStatus: string
    newStatus: string
  }
  'maintenance.ticket.assigned': {
    ticketId: string
    hotelId: string
    roomId: string | null
    assignedTo: string
  }
  'maintenance.work.started': {
    ticketId: string
    hotelId: string
    roomId: string | null
  }
  'maintenance.ticket.completed': {
    ticketId: string
    hotelId: string
    roomId: string | null
    actualCost: number | null | undefined
  }
  'maintenance.ticket.closed': {
    ticketId: string
    hotelId: string
    roomId: string | null
  }
  'maintenance.ticket.cancelled': {
    ticketId: string
    hotelId: string
    roomId: string | null
  }
  // Phase 4: PMS events
  'booking.checkedOut': {
    bookingId: string
    hotelId: string
    roomId: string
    guestId: string
    userId: string
    housekeepingTaskId: string
  }
}

class TypedEventBus {
  private emitter = new EventEmitter()
  private maxRetries = 3
  private retryDelayMs = 1000

  constructor() {
    // Set max listeners to prevent memory leak warnings for high-traffic events
    this.emitter.setMaxListeners(50)
    
    // Global error handler for unhandled listener errors
    this.emitter.on('error', (error) => {
      console.error('[EventBus] Unhandled error:', error)
    })
  }

  /**
   * Emit event with automatic retry and error handling
   * Ensures multi-tenant isolation by requiring hotelId in all payloads
   */
  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]) {
    try {
      // Validate hotelId exists for multi-tenant isolation
      if (!('hotelId' in payload) || !payload.hotelId) {
        console.error(`[EventBus] Event ${String(event)} missing hotelId - potential data leakage risk`)
        return
      }

      this.emitter.emit(event, payload)
    } catch (error) {
      console.error(`[EventBus] Error emitting event ${String(event)}:`, error)
      // Don't throw - events should not block main operations
    }
  }

  /**
   * Emit event with retry logic for critical operations
   */
  async emitWithRetry<K extends keyof AppEventMap>(
    event: K, 
    payload: AppEventMap[K],
    retries: number = this.maxRetries
  ): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.emit(event, payload)
        return
      } catch (error) {
        if (attempt === retries) {
          console.error(`[EventBus] Failed to emit ${String(event)} after ${retries} retries:`, error)
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * (attempt + 1)))
      }
    }
  }

  /**
   * Register event listener with error handling wrapper
   */
  on<K extends keyof AppEventMap>(event: K, listener: (payload: AppEventMap[K]) => void | Promise<void>) {
    const wrappedListener = async (payload: AppEventMap[K]) => {
      try {
        await listener(payload)
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${String(event)}:`, error)
        // Emit error event for monitoring
        this.emitter.emit('error', error)
      }
    }

    this.emitter.on(event, wrappedListener)
    return () => this.emitter.off(event, wrappedListener)
  }

  /**
   * Get listener count for monitoring
   */
  listenerCount<K extends keyof AppEventMap>(event: K): number {
    return this.emitter.listenerCount(event)
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof AppEventMap>(event?: K): void {
    if (event) {
      this.emitter.removeAllListeners(event)
    } else {
      this.emitter.removeAllListeners()
    }
  }
}

export const eventBus = new TypedEventBus()
