// ============================================================================
// SESSION 5.6 - QR AUTOMATION & AI INTEGRATION TYPES
// ============================================================================

/**
 * QR Workflow Types
 * Comprehensive type definitions for QR automation and AI integration
 */

// ============================================================================
// 1. QR SCAN & SESSION TYPES
// ============================================================================

export enum ScanMethod {
  QR_CAMERA = 'qr_camera',
  QR_MANUAL = 'qr_manual',
  NFC = 'nfc',
  RFID = 'rfid',
  MANUAL_ENTRY = 'manual_entry',
}

export enum UserRole {
  GUEST = 'guest',
  STAFF = 'staff',
  ADMIN = 'admin',
}

export enum WorkflowStatus {
  PENDING = 'pending',
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
}

export interface QRScanRequest {
  qrToken: string;
  userId: string;
  hotelId: string;
  scanMethod: ScanMethod;
  scanDeviceId?: string;
  scanLocation?: string;
  context?: Record<string, any>;
}

export interface QRScanResponse {
  success: boolean;
  sessionId: string;
  sessionJWT: string;
  user: {
    id: string;
    role: UserRole;
    name: string;
    email: string;
  };
  hotelId: string;
  expiresAt: Date;
  workflowStatus: WorkflowStatus;
  triggeredAIModels: string[];
  error?: string;
}

export interface UserSession {
  sessionId: string;
  sessionJWT: string;
  userId: string;
  hotelId: string;
  userRole: UserRole;
  createdAt: Date;
  expiresAt: Date;
  jwtExpiresAt: Date;
  scanMethod: ScanMethod;
  context?: Record<string, any>;
}

// ============================================================================
// 2. AI MODEL & WORKFLOW TYPES
// ============================================================================

export enum AIModelId {
  NIGHT_AUDIT = 'night-audit',
  TASK_ROUTING = 'task-routing',
  HOUSEKEEPING = 'housekeeping-scheduling',
  FORECASTING = 'forecasting',
  GUEST_MESSAGING = 'guest-messaging',
  ROOM_STATUS = 'room-status-detection',
  MAINTENANCE = 'maintenance-prediction',
  BILLING = 'billing-detection',
  PMS_LINKING = 'pms-cross-location-linking',
  AGENT_FOR_STAFF = 'agent-for-staff',
  VOICE_RECEPTION = 'voice-reception',
  UPSELL_ENGINE = 'dynamic-upsell-engine',
}

export interface AIModelConfig {
  id: AIModelId;
  name: string;
  description: string;
  version: string;
  requiredRoles: UserRole[];
  requiredPermissions: string[];
  timeout: number; // milliseconds
  retryable: boolean;
  costPerInvoke?: number;
}

export interface AITriggerRequest {
  sessionId: string;
  userId: string;
  userRole: UserRole;
  hotelId: string;
  modelId: AIModelId;
  requestPayload: Record<string, any>;
  context?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface AITriggerResponse {
  modelId: AIModelId;
  sessionId: string;
  status: 'success' | 'failed' | 'timeout' | 'partial';
  executionTimeMs: number;
  responsePayload: Record<string, any>;
  actionsTriggered: WorkflowAction[];
  actionsExecuted: WorkflowActionResult[];
  error?: string;
  confidence?: number;
  tokensUsed?: number;
}

// ============================================================================
// 3. WORKFLOW TYPES
// ============================================================================

export enum WorkflowActionType {
  // PMS Actions
  CREATE_WORK_ORDER = 'create_work_order',
  UPDATE_WORK_ORDER = 'update_work_order',
  CLOSE_WORK_ORDER = 'close_work_order',
  
  // Ticket Actions
  CREATE_TICKET = 'create_ticket',
  UPDATE_TICKET = 'update_ticket',
  RESOLVE_TICKET = 'resolve_ticket',
  
  // Task Actions
  CREATE_TASK = 'create_task',
  ASSIGN_TASK = 'assign_task',
  COMPLETE_TASK = 'complete_task',
  
  // Guest Actions
  SEND_MESSAGE = 'send_message',
  TRIGGER_UPSELL = 'trigger_upsell',
  UPDATE_BOOKING = 'update_booking',
  
  // Housekeeping Actions
  UPDATE_ROOM_STATUS = 'update_room_status',
  SCHEDULE_CLEANING = 'schedule_cleaning',
  ASSIGN_HOUSEKEEPER = 'assign_housekeeper',
  
  // Maintenance Actions
  CREATE_MAINTENANCE_ORDER = 'create_maintenance_order',
  SCHEDULE_INSPECTION = 'schedule_inspection',
  
  // Billing Actions
  FLAG_BILLING_ISSUE = 'flag_billing_issue',
  AUTO_CORRECT = 'auto_correct_billing',
  
  // Analytics
  LOG_EVENT = 'log_event',
  TRACK_METRIC = 'track_metric',
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  description: string;
  payload: Record<string, any>;
  triggerTime: Date;
  priority: 'low' | 'normal' | 'high';
  requiresApproval?: boolean;
}

export interface WorkflowActionResult {
  actionId: string;
  type: WorkflowActionType;
  status: 'success' | 'failed' | 'pending' | 'approved' | 'rejected';
  result?: Record<string, any>;
  error?: string;
  executedAt?: Date;
}

export interface Workflow {
  id: string;
  sessionId: string;
  userId: string;
  userRole: UserRole;
  hotelId: string;
  status: WorkflowStatus;
  
  aiModelsTriggered: AIModelId[];
  actions: WorkflowAction[];
  actionResults: WorkflowActionResult[];
  
  startedAt: Date;
  completedAt?: Date;
  nextSteps: string[];
  
  context: Record<string, any>;
}

// ============================================================================
// 4. SESSION LOG TYPES
// ============================================================================

export interface UserSessionLogData {
  id: string;
  hotelId: string;
  userId: string;
  userRole: UserRole;
  userName?: string;
  userEmail?: string;
  
  sessionId: string;
  sessionJWT: string;
  jwtExpiresAt: Date;
  
  scanMethod: ScanMethod;
  scanDeviceId?: string;
  scanLocation?: string;
  ipAddress?: string;
  userAgent?: string;
  
  workflowTriggered: boolean;
  workflowStatus: WorkflowStatus;
  aiModelsTriggered: AIModelId[];
  
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface AIInteractionLogData {
  id: string;
  hotelId: string;
  sessionId: string;
  userId: string;
  
  modelId: AIModelId;
  modelName: string;
  
  requestPayload: Record<string, any>;
  responsePayload: Record<string, any>;
  
  status: 'success' | 'failed' | 'timeout' | 'partial';
  executionTimeMs: number;
  error?: string;
  
  actionsTriggered: WorkflowAction[];
  actionsExecuted: WorkflowActionResult[];
  
  confidence?: number;
  tokensUsed?: number;
  costEstimate?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 5. AUDIT & LOGGING TYPES
// ============================================================================

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
  status: 'success' | 'failed';
  error?: string;
  ipAddress?: string;
}

export interface AuditTrail {
  entries: AuditLogEntry[];
  startTime: Date;
  endTime: Date;
  totalEntries: number;
}

// ============================================================================
// 6. PMS INTEGRATION TYPES
// ============================================================================

export interface PMSWorkOrderUpdate {
  workOrderId: string;
  type: WorkflowActionType;
  sourceType: 'ai_automation' | 'manual' | 'import' | 'api';
  sourceId?: string;
  
  previousState?: Record<string, any>;
  newState: Record<string, any>;
  fieldChanges: Record<string, { old: any; new: any }>;
  
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  syncAttempts: number;
  lastSyncError?: string;
}

export interface PMSUpdateRequest {
  sessionId: string;
  userId: string;
  hotelId: string;
  workOrder: PMSWorkOrderUpdate;
  context?: Record<string, any>;
}

export interface PMSUpdateResponse {
  success: boolean;
  workOrderId: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  error?: string;
  timestamp: Date;
}

// ============================================================================
// 7. OFFLINE SYNC TYPES
// ============================================================================

export interface OfflineSyncQueue {
  id: string;
  sessionId: string;
  userId: string;
  hotelId: string;
  
  action: WorkflowAction;
  status: 'queued' | 'processing' | 'synced' | 'failed';
  
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  
  error?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineSyncState {
  isOnline: boolean;
  queuedActions: OfflineSyncQueue[];
  syncInProgress: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

// ============================================================================
// 8. ADMIN DASHBOARD TYPES
// ============================================================================

export interface AdminDashboardData {
  activeTokens: number;
  activeSessions: number;
  totalScansToday: number;
  totalAITriggers: number;
  failedTriggers: number;
  
  recentSessions: UserSessionLogData[];
  recentAIInteractions: AIInteractionLogData[];
  
  analytics: AIAnalyticsData;
}

export interface AIAnalyticsData {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  totalScans: number;
  guestScans: number;
  staffScans: number;
  
  totalAITriggers: number;
  successfulTriggers: number;
  failedTriggers: number;
  
  avgExecutionMs: number;
  totalTokensUsed: number;
  
  modelMetrics: Record<AIModelId, {
    triggers: number;
    successes: number;
    failures: number;
    avgExecutionMs: number;
  }>;
  
  totalPMSUpdates: number;
  totalTicketsCreated: number;
  estimatedCost: number;
}

export interface AdminExportOptions {
  format: 'csv' | 'pdf' | 'json';
  startDate: Date;
  endDate: Date;
  dataType: 'sessions' | 'ai_interactions' | 'analytics' | 'audit_trail' | 'all';
  hotelId?: string;
}

// ============================================================================
// 9. ERROR & EXCEPTION TYPES
// ============================================================================

export enum WorkflowErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_SESSION = 'EXPIRED_SESSION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  PMS_SYNC_FAILED = 'PMS_SYNC_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MULTI_TENANT_VIOLATION = 'MULTI_TENANT_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface WorkflowError extends Error {
  code: WorkflowErrorCode;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// 10. CONFIGURATION TYPES
// ============================================================================

export interface WorkflowConfig {
  enabled: boolean;
  maxConcurrentWorkflows: number;
  workflowTimeout: number; // milliseconds
  aiModelTimeout: number;
  pmsRetryAttempts: number;
  pmsRetryDelay: number;
  offlineSyncEnabled: boolean;
  auditLoggingEnabled: boolean;
}

export type AIModelWorkflowConfig = {
  [key in AIModelId]?: {
    enabled: boolean;
    requiredRoles: UserRole[];
    timeout: number;
    priority: 'low' | 'normal' | 'high';
    triggerOn: 'scan' | 'manual' | 'schedule' | 'event';
  };
}

// ============================================================================
// 11. ANALYTICS & REPORTING TYPES
// ============================================================================

export interface WorkflowAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  
  qrMetrics: {
    totalScans: number;
    guestScans: number;
    staffScans: number;
    uniqueUsers: number;
    repeatUsers: number;
  };
  
  workflowMetrics: {
    totalWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    avgDuration: number;
  };
  
  aiMetrics: {
    totalTriggers: number;
    successRate: number;
    avgExecutionTime: number;
    modelBreakdown: Record<AIModelId, {
      invocations: number;
      successRate: number;
      avgTime: number;
    }>;
  };
  
  pmsMetrics: {
    totalUpdates: number;
    successfulUpdates: number;
    failedUpdates: number;
    avgSyncTime: number;
  };
  
  ticketMetrics: {
    totalCreated: number;
    avgResolutionTime: number;
    resolutionRate: number;
  };
  
  costAnalysis: {
    totalCost: number;
    costPerScan: number;
    costByModel: Record<AIModelId, number>;
  };
}

export interface AnalyticsQueryParams {
  startDate: Date;
  endDate: Date;
  hotelId?: string;
  userId?: string;
  modelId?: AIModelId;
  status?: WorkflowStatus;
  groupBy?: 'day' | 'week' | 'month' | 'model' | 'role';
}

// ============================================================================
// 12. REQUEST/RESPONSE WRAPPER TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: WorkflowErrorCode | string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================================================
// Export all types
// ============================================================================
