// KnowledgeBaseDocumentStatus enum doesn't exist in Prisma schema yet
export enum KnowledgeBaseDocumentStatus {
  PENDING_EMBEDDING = 'PENDING_EMBEDDING',
  EMBEDDING = 'EMBEDDING',
  READY = 'READY',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
] as const

export type StatusFilterKey = typeof STATUS_FILTER_OPTIONS[number]['value']

export const DRAFT_STATUSES = new Set<KnowledgeBaseDocumentStatus>([
  KnowledgeBaseDocumentStatus.PENDING_EMBEDDING, 
  KnowledgeBaseDocumentStatus.EMBEDDING, 
  KnowledgeBaseDocumentStatus.FAILED
])

export const ADMIN_MUTATION_STATUSES = ['draft', 'published'] as const
export type AdminMutationStatus = typeof ADMIN_MUTATION_STATUSES[number]

export const STATUS_LABEL: Record<KnowledgeBaseDocumentStatus, string> = {
  PENDING_EMBEDDING: 'Draft',
  EMBEDDING: 'Processing',
  READY: 'Published',
  FAILED: 'Needs Attention',
  ARCHIVED: 'Archived',
}

export const STATUS_BADGE_TONE: Record<KnowledgeBaseDocumentStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  PENDING_EMBEDDING: 'warning',
  EMBEDDING: 'warning',
  READY: 'success',
  FAILED: 'danger',
  ARCHIVED: 'default',
}

export const ACCEPTED_UPLOAD_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
] as const

export type ChartBreakdown = {
  label: string
  value: number
}

export type FilterState = {
  status: StatusFilterKey
  category: string
  search: string
  cursor?: string
  limit: number
}

export type KnowledgeBaseDocumentRow = {
  id: string
  title: string
  status: KnowledgeBaseDocumentStatus
  updatedAt: string
  category: string
  chunkCount: number
  createdByName: string
  createdByEmail: string | null
  description: string | null
}

export type MetricsSummary = {
  total: number
  draft: number
  published: number
  archived: number
  chartData: ChartBreakdown[]
  generatedAt: string
}

export type BannerState = { type: 'error' | 'info' | 'success'; message: string } | null

export type KnowledgeBaseMutationResponse = {
  document: KnowledgeBaseDocumentRow
}

export type KnowledgeBaseArchiveResponse = {
  document: KnowledgeBaseDocumentRow
  action: 'archived' | 'restored'
}
