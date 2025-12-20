/**
 * Knowledge Base Service
 * 
 * NOTE: This entire service is currently stubbed because the KnowledgeBase models
 * (KnowledgeBaseSource, KnowledgeBaseDocument, KnowledgeBaseChunk, KnowledgeBaseSyncLog)
 * do not exist in the Prisma schema. All functions will throw "not yet implemented" errors.
 */

import { prisma } from '@/lib/prisma'
import {
  CreateSourceInput,
  IngestDocumentInput,
  UpdateSourceInput,
  DocumentFilterInput,
  TriggerSyncInput,
  ChunkingOptionsInput,
} from '@/lib/validation/knowledgeBase'
import { generateChunks } from '@/lib/knowledgeBase/chunker'
import { scheduleDocumentEmbedding, scheduleSourceSync } from '@/lib/queues/knowledgeBaseQueue'
import { eventBus } from '@/lib/events/eventBus'
import crypto from 'node:crypto'

// Stubbed - KnowledgeBase models not in schema
enum KnowledgeBaseDocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

enum KnowledgeBaseSyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export async function createSource(hotelId: string, userId: string | null, input: CreateSourceInput): Promise<any> {
  // Stubbed - KnowledgeBase models not in schema
  throw new Error('Knowledge base system not yet implemented')
}

export async function updateSource(hotelId: string, sourceId: string, input: UpdateSourceInput): Promise<any> {
  // Stubbed - KnowledgeBase models not in schema
  throw new Error('Knowledge base system not yet implemented')
}


export async function listDocuments(hotelId: string, rawQuery: URLSearchParams | DocumentFilterInput): Promise<any> {
  // Stubbed - KnowledgeBase models not in schema
  return { documents: [], totalPages: 0, currentPage: 1 }
}


function ensureChecksum(value: IngestDocumentInput) {
  if (value.checksum) {
    return value.checksum
  }

  if (value.content) {
    return crypto.createHash('sha256').update(value.content).digest('hex')
  }

  if (value.storagePath) {
    return crypto.createHash('sha256').update(value.storagePath).digest('hex')
  }

  return crypto.randomBytes(32).toString('hex')
}

export async function ingestDocument(hotelId: string, userId: string | null, input: IngestDocumentInput): Promise<any> {
  // Stubbed - KnowledgeBase models not in schema
  throw new Error('Knowledge base system not yet implemented')
}


export async function triggerSourceSync(hotelId: string, userId: string | null, input: TriggerSyncInput): Promise<any> {
  // Stubbed - KnowledgeBase models not in schema  
  throw new Error('Knowledge base system not yet implemented')
}


export async function markDocumentFailed(documentId: string, reason: string): Promise<any> {
  // Stubbed - KnowledgeBase models not in schema
  return null
}


type KnowledgeBaseAuditInput = {
  hotelId: string
  documentId: string
  actorId: string
  action: 'KB_DOCUMENT_ARCHIVED' | 'KB_DOCUMENT_RESTORED'
}

export async function recordKnowledgeBaseAudit(input: KnowledgeBaseAuditInput): Promise<void> {
  // Stubbed - KnowledgeBase models not in schema
  return
}

