import { Queue, Worker } from 'bullmq'
// Note: QueueScheduler removed in bullmq v5+
import IORedis from 'ioredis'
import crypto from 'node:crypto'
import { createEmbeddings } from '@/lib/ai/embeddings'
import { isVectorSearchEnabled, upsertHotelVectors, type VectorRecord } from '@/lib/ai/vectorProvider'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'

// Stub types for non-existent KB models
enum KnowledgeBaseChunkStatus {
  PENDING = 'PENDING',
  EMBEDDED = 'EMBEDDED',
  FAILED = 'FAILED'
}

enum KnowledgeBaseDocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

enum KnowledgeBaseSyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED'
}

const redisUrl = process.env.REDIS_URL

const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : undefined

export const knowledgeBaseQueue = connection
  ? new Queue('knowledge-base', { connection })
  : undefined

if (connection && process.env.NEXT_RUNTIME !== 'edge') {
  // QueueScheduler is deprecated in bullmq v4+, no longer needed
  
  if (process.env.RUN_QUEUE_WORKER === 'true') {
    new Worker(
      'knowledge-base',
      async (job) => {
        if (job.name === 'document-embedding') {
          // KB models not in schema - stubbed worker
          /* const { documentId } = job.data as { documentId: string }
          const document = await prisma.knowledgeBaseDocument.findUnique({
            where: { id: documentId },
            select: { id: true, hotelId: true, chunkCount: true },
          })

          if (!document) {
            return
          }

          const chunkRecords = await prisma.knowledgeBaseChunk.findMany({
            where: { documentId },
            select: {
              id: true,
              content: true,
              sequence: true,
              vectorHash: true,
            },
            orderBy: { sequence: 'asc' },
          })

          const hashEntries = chunkRecords.map((chunk) => ({
            id: chunk.id,
            content: chunk.content,
            sequence: chunk.sequence,
            currentHash: chunk.vectorHash ?? null,
            newHash: crypto.createHash('sha256').update(chunk.content).digest('hex'),
          }))

          const hashUpdates = new Map<string, string>()

          if (isVectorSearchEnabled() && hashEntries.length) {
            const targets = hashEntries.filter((entry) => entry.currentHash !== entry.newHash)
            const targetMap = new Map(targets.map((entry) => [entry.id, entry]))
            if (targets.length) {
              try {
                const embeddings = await createEmbeddings(targets.map((entry) => entry.content))
                const vectors = targets
                  .map((entry, index) => {
                    const values = embeddings[index]
                    if (!values) {
                      return null
                    }
                    const vector: VectorRecord = {
                      id: entry.id,
                      values,
                      metadata: {
                        documentId,
                        sequence: entry.sequence,
                      },
                    }
                    return vector
                  })
                  .filter(Boolean) as VectorRecord[]

                if (vectors.length) {
                  await upsertHotelVectors(document.hotelId, vectors)
                  vectors.forEach((vector) => {
                    const entry = targetMap.get(vector.id)
                    if (entry) {
                      hashUpdates.set(entry.id, entry.newHash)
                    }
                  })
                }
              } catch (error) {
                console.error('Vector upsert failed for document', documentId, error)
              }
            }
          }

          const now = new Date()

          await prisma.$transaction(async (tx) => {
            await Promise.all(
              hashEntries.map((entry) =>
                tx.knowledgeBaseChunk.update({
                  where: { id: entry.id },
                  data: {
                    embeddingStatus: KnowledgeBaseChunkStatus.EMBEDDED,
                    embeddedAt: now,
                    embeddingId: job.id,
                    vectorHash: hashUpdates.get(entry.id) ?? entry.currentHash,
                  },
                })
              )
            )

            await tx.knowledgeBaseDocument.update({
              where: { id: documentId },
              data: {
                status: KnowledgeBaseDocumentStatus.READY,
                lastIndexedAt: now,
                embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
              },
            })
          })

          eventBus.emit('knowledgeBase.document.embedded', {
            documentId,
            hotelId: document.hotelId,
            chunkCount: document.chunkCount,
          }) */
        }

        if (job.name === 'source-sync') {
          // KB models not in schema - stubbed worker
          /* const { syncJobId, status = KnowledgeBaseSyncStatus.SUCCEEDED } = job.data as {
            syncJobId: string
            status?: KnowledgeBaseSyncStatus
            message?: string
          }

          const syncJob = await prisma.knowledgeBaseSyncJob.findUnique({
            where: { id: syncJobId },
            select: { id: true, hotelId: true, startedAt: true },
          })

          if (!syncJob) {
            return
          }

          const now = new Date()

          await prisma.knowledgeBaseSyncJob.update({
            where: { id: syncJobId },
            data: {
              status,
              startedAt: syncJob.startedAt ?? now,
              completedAt: now,
            },
          })

          eventBus.emit('knowledgeBase.sync.completed', {
            jobId: syncJobId,
            hotelId: syncJob.hotelId,
            status: status === KnowledgeBaseSyncStatus.SUCCEEDED ? 'SUCCEEDED' : 'FAILED',
          }) */
        }
      },
      { connection }
    )
  }
}

export async function scheduleDocumentEmbedding(documentId: string) {
  if (!knowledgeBaseQueue) {
    return
  }

  await knowledgeBaseQueue.add('document-embedding', { documentId }, { removeOnComplete: true, removeOnFail: true })
}

export async function scheduleSourceSync(syncJobId: string, status?: KnowledgeBaseSyncStatus) {
  if (!knowledgeBaseQueue) {
    return
  }

  await knowledgeBaseQueue.add(
    'source-sync',
    { syncJobId, status },
    { removeOnComplete: true, removeOnFail: true }
  )
}
