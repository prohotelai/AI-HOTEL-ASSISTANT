// ============================================================================
// PMS ADAPTER - TYPE DEFINITIONS
// ============================================================================

export type PMSType = 'CLOUD' | 'ON_PREMISE' | 'LEGACY'

export type PMSAuthType = 'API_KEY' | 'OAUTH' | 'BASIC' | 'CUSTOM'

export type PMSMode = 'SAAS_ONLY' | 'EXTERNAL_ONLY' | 'HYBRID'

export type PMSSyncDirection = 'PULL_ONLY' | 'PUSH_ONLY' | 'BIDIRECTIONAL'

export type PMSConflictStrategy = 'EXTERNAL_WINS' | 'INTERNAL_WINS' | 'MANUAL'

export type PMSEntity = 'rooms' | 'bookings' | 'guests' | 'invoices' | 'folios' | 'rates'

export type PMSSyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED'

export type PMSSyncQueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type PMSTestStatus = 'SUCCESS' | 'FAILED'

// ============================================================================
// PMS Integration Configuration
// ============================================================================

export interface PMSCredentials {
  apiKey?: string
  apiSecret?: string
  username?: string
  password?: string
  token?: string
  refreshToken?: string
  customFields?: Record<string, string>
}

export interface PMSIntegrationConfig {
  id?: string
  hotelId: string
  pmsName: string
  pmsType: PMSType
  version?: string
  baseUrl?: string
  authType: PMSAuthType
  credentials: PMSCredentials
  mode: PMSMode
  enabled: boolean
  syncIntervalMinutes?: number
  autoSyncEnabled?: boolean
  metadata?: Record<string, any>
}

// ============================================================================
// Entity Mappings
// ============================================================================

export interface PMSFieldMapping {
  externalField: string
  internalField: string
  transformType?: 'DIRECT' | 'CUSTOM' | 'LOOKUP'
  transformCode?: string
  isRequired?: boolean
  defaultValue?: any
}

export interface PMSEntityMapping {
  entity: PMSEntity
  enabled: boolean
  mappings: Record<string, PMSFieldMapping>
}

export interface PMSAdapterConfigData {
  integrationId: string
  entityMappings: Record<string, PMSEntityMapping>
  syncDirection: PMSSyncDirection
  conflictStrategy: PMSConflictStrategy
  supportedModules: PMSEntity[]
  fieldTransformations?: Record<string, any>
  validationRules?: Record<string, any>
}

// ============================================================================
// Sync Operations
// ============================================================================

export interface PMSSyncRequest {
  hotelId: string
  entity: PMSEntity
  direction: 'PULL' | 'PUSH'
  recordIds?: string[] // Optional: sync specific records
  force?: boolean // Ignore conflict strategy
  dryRun?: boolean // Test without committing
}

export interface PMSSyncResult {
  status: PMSSyncStatus
  recordsProcessed: number
  recordsSuccess: number
  recordsFailed: number
  durationMs: number
  errors?: PMSSyncError[]
  details?: any
}

export interface PMSSyncError {
  recordId?: string
  field?: string
  error: string
  errorDetails?: any
}

// ============================================================================
// Connection Testing
// ============================================================================

export interface PMSConnectionTestRequest {
  hotelId: string
  pmsName: string
  baseUrl?: string
  authType: PMSAuthType
  credentials: PMSCredentials
  testEndpoint?: string
}

export interface PMSConnectionTestResult {
  success: boolean
  message: string
  details?: {
    responseTime?: number
    apiVersion?: string
    supportedModules?: string[]
    errorDetails?: any
  }
}

// ============================================================================
// AI-Assisted Mapping Suggestions
// ============================================================================

export interface PMSMappingSuggestion {
  entity: PMSEntity
  confidence: number // 0-1
  suggestedMappings: Array<{
    externalField: string
    internalField: string
    confidence: number
    reasoning: string
  }>
  warnings?: string[]
  recommendations?: string[]
}

export interface PMSAIAnalysisResult {
  pmsName: string
  detectedVersion?: string
  suggestedMappings: PMSMappingSuggestion[]
  overallConfidence: number
  requiredActions?: string[]
}

// ============================================================================
// Webhook Support (Future)
// ============================================================================

export interface PMSWebhookConfig {
  integrationId: string
  webhookUrl: string
  events: string[]
  secret?: string
  enabled: boolean
}

export interface PMSWebhookPayload {
  event: string
  entity: PMSEntity
  data: any
  timestamp: string
  signature?: string
}

// ============================================================================
// Error Types
// ============================================================================

export class PMSAdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'PMSAdapterError'
  }
}

export class PMSConnectionError extends PMSAdapterError {
  constructor(message: string, details?: any) {
    super(message, 'PMS_CONNECTION_ERROR', details)
    this.name = 'PMSConnectionError'
  }
}

export class PMSMappingError extends PMSAdapterError {
  constructor(message: string, details?: any) {
    super(message, 'PMS_MAPPING_ERROR', details)
    this.name = 'PMSMappingError'
  }
}

export class PMSSyncError extends PMSAdapterError {
  constructor(message: string, details?: any) {
    super(message, 'PMS_SYNC_ERROR', details)
    this.name = 'PMSSyncError'
  }
}

export class PMSAuthError extends PMSAdapterError {
  constructor(message: string, details?: any) {
    super(message, 'PMS_AUTH_ERROR', details)
    this.name = 'PMSAuthError'
  }
}
