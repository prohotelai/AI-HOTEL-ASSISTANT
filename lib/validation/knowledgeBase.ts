import { z } from 'zod'

export const knowledgeBaseSourceTypeEnum = z.enum(['MANUAL_UPLOAD', 'WEB_PAGE', 'PMS_EXPORT', 'API'])
export const knowledgeBaseSourceStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ERROR'])
export const knowledgeBaseDocumentStatusEnum = z.enum(['PENDING_EMBEDDING', 'EMBEDDING', 'READY', 'FAILED', 'ARCHIVED'])
export const knowledgeBaseChunkStatusEnum = z.enum(['PENDING', 'EMBEDDING', 'EMBEDDED', 'FAILED'])
export const knowledgeBaseSyncTypeEnum = z.enum(['ON_DEMAND', 'SCHEDULED', 'WEBHOOK', 'IMPORT'])
export const knowledgeBaseSyncStatusEnum = z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])

export const createSourceSchema = z.object({
  name: z.string().min(2).max(120),
  type: knowledgeBaseSourceTypeEnum,
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: knowledgeBaseSourceStatusEnum.optional(),
  syncIntervalMinutes: z.number().int().min(5).max(10080).optional(),
})

export const updateSourceSchema = createSourceSchema.partial().extend({
  status: knowledgeBaseSourceStatusEnum.optional(),
})

export const ingestDocumentSchema = z
  .object({
    sourceId: z.string().cuid().optional(),
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    content: z.string().min(1).optional(),
    contentType: z.string().max(120).default('text/plain'),
    language: z.string().max(8).default('en'),
    metadata: z.record(z.string(), z.unknown()).optional(),
    storagePath: z.string().max(512).optional(),
    checksum: z.string().length(64).optional(),
  })
  .refine((value) => Boolean(value.content || value.storagePath), {
    message: 'Either content or storagePath must be provided',
    path: ['content'],
  })

export const documentFilterSchema = z.object({
  status: z.union([knowledgeBaseDocumentStatusEnum, z.literal('ALL')]).optional().transform((value) => (value === 'ALL' ? undefined : value)),
  sourceId: z.string().cuid().optional(),
  search: z.string().max(120).optional(),
  cursor: z.string().cuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Math.min(Math.max(Number(value), 5), 100) : 20)),
})

export const chunkingOptionsSchema = z
  .object({
    chunkSize: z.number().int().min(200).max(2000).default(800),
    chunkOverlap: z.number().int().min(0).max(600).default(120),
  })
  .refine((value) => value.chunkOverlap < value.chunkSize, {
    message: 'chunkOverlap must be smaller than chunkSize',
    path: ['chunkOverlap'],
  })

export const triggerSyncSchema = z.object({
  sourceId: z.string().cuid(),
  type: knowledgeBaseSyncTypeEnum.default('ON_DEMAND'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateSourceInput = z.infer<typeof createSourceSchema>
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>
export type IngestDocumentInput = z.infer<typeof ingestDocumentSchema>
export type DocumentFilterInput = z.infer<typeof documentFilterSchema>
export type ChunkingOptionsInput = z.infer<typeof chunkingOptionsSchema>
export type TriggerSyncInput = z.infer<typeof triggerSyncSchema>
