// ============================================================================
// PMS ADAPTER SERVICE - CORE ORCHESTRATION
// ============================================================================
// This service coordinates PMS integration operations.
// ⚠️ DISABLED BY DEFAULT - Only runs when explicitly enabled per hotel
// ============================================================================

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import {
  PMSIntegrationConfig,
  PMSAdapterConfigData,
  PMSSyncRequest,
  PMSSyncResult,
  PMSAdapterError,
  PMSEntity,
} from '../types/pms.types'

const ENCRYPTION_KEY = process.env.PMS_ENCRYPTION_KEY || 'default-key-change-in-production'
const FEATURE_FLAG_PMS_ADAPTER = process.env.FEATURE_PMS_ADAPTER === 'true'

export class PMSAdapterService {
  
  // ============================================================================
  // SAFETY CHECKS
  // ============================================================================
  
  /**
   * Check if PMS Adapter is enabled globally
   */
  static isFeatureEnabled(): boolean {
    return FEATURE_FLAG_PMS_ADAPTER
  }
  
  /**
   * Check if PMS integration is enabled for a specific hotel
   */
  static async isEnabledForHotel(hotelId: string): Promise<boolean> {
    if (!this.isFeatureEnabled()) {
      return false
    }
    
    const integration = await prisma.pMSIntegration.findUnique({
      where: { hotelId },
      select: { enabled: true }
    })
    
    return integration?.enabled ?? false
  }
  
  /**
   * Assert that PMS adapter is enabled, throw error if not
   */
  static async assertEnabled(hotelId: string): Promise<void> {
    if (!this.isFeatureEnabled()) {
      throw new PMSAdapterError(
        'PMS Adapter feature is not enabled globally',
        'FEATURE_DISABLED'
      )
    }
    
    const enabled = await this.isEnabledForHotel(hotelId)
    if (!enabled) {
      throw new PMSAdapterError(
        'PMS integration is not enabled for this hotel',
        'INTEGRATION_DISABLED'
      )
    }
  }
  
  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================
  
  /**
   * Create a new PMS integration (DISABLED by default)
   */
  static async createIntegration(
    config: PMSIntegrationConfig
  ): Promise<string> {
    if (!this.isFeatureEnabled()) {
      throw new PMSAdapterError(
        'PMS Adapter feature is not enabled',
        'FEATURE_DISABLED'
      )
    }
    
    // Encrypt credentials
    const encryptedCredentials = this.encryptCredentials(config.credentials)
    
    const integration = await prisma.pMSIntegration.create({
      data: {
        hotelId: config.hotelId,
        pmsName: config.pmsName,
        pmsType: config.pmsType,
        version: config.version,
        baseUrl: config.baseUrl,
        authType: config.authType,
        credentialsEncrypted: encryptedCredentials,
        mode: config.mode,
        enabled: false, // ⚠️ DISABLED BY DEFAULT
        autoSyncEnabled: false, // ⚠️ NO AUTO-SYNC BY DEFAULT
        syncIntervalMinutes: config.syncIntervalMinutes || 15,
        metadata: config.metadata || {},
      },
    })
    
    return integration.id
  }
  
  /**
   * Get integration configuration for a hotel
   */
  static async getIntegration(hotelId: string) {
    const integration = await prisma.pMSIntegration.findUnique({
      where: { hotelId },
      include: {
        config: true,
      },
    })
    
    if (!integration) {
      return null
    }
    
    // Decrypt credentials for use
    const credentials = this.decryptCredentials(integration.credentialsEncrypted)
    
    return {
      ...integration,
      credentials,
    }
  }
  
  /**
   * Update integration configuration
   */
  static async updateIntegration(
    hotelId: string,
    updates: Partial<PMSIntegrationConfig>
  ) {
    const updateData: any = {}
    
    if (updates.pmsName) updateData.pmsName = updates.pmsName
    if (updates.pmsType) updateData.pmsType = updates.pmsType
    if (updates.version) updateData.version = updates.version
    if (updates.baseUrl) updateData.baseUrl = updates.baseUrl
    if (updates.authType) updateData.authType = updates.authType
    if (updates.mode) updateData.mode = updates.mode
    if (updates.syncIntervalMinutes) updateData.syncIntervalMinutes = updates.syncIntervalMinutes
    
    if (updates.credentials) {
      updateData.credentialsEncrypted = this.encryptCredentials(updates.credentials)
    }
    
    // ⚠️ enabled and autoSyncEnabled must be explicitly set
    if (typeof updates.enabled === 'boolean') {
      updateData.enabled = updates.enabled
    }
    if (typeof updates.autoSyncEnabled === 'boolean') {
      updateData.autoSyncEnabled = updates.autoSyncEnabled
    }
    
    return await prisma.pMSIntegration.update({
      where: { hotelId },
      data: updateData,
    })
  }
  
  /**
   * Enable integration (explicit action required)
   */
  static async enableIntegration(hotelId: string): Promise<void> {
    await this.assertEnabled(hotelId) // Check global feature flag
    
    await prisma.pMSIntegration.update({
      where: { hotelId },
      data: {
        enabled: true,
        isActive: false, // Active only when sync is running
      },
    })
  }
  
  /**
   * Disable integration
   */
  static async disableIntegration(hotelId: string): Promise<void> {
    await prisma.pMSIntegration.update({
      where: { hotelId },
      data: {
        enabled: false,
        isActive: false,
        autoSyncEnabled: false,
      },
    })
  }
  
  // ============================================================================
  // ADAPTER CONFIGURATION
  // ============================================================================
  
  /**
   * Save adapter configuration (entity mappings)
   */
  static async saveAdapterConfig(
    integrationId: string,
    config: PMSAdapterConfigData
  ) {
    const existing = await prisma.pMSAdapterConfig.findUnique({
      where: { integrationId },
    })
    
    if (existing) {
      return await prisma.pMSAdapterConfig.update({
        where: { integrationId },
        data: {
          entityMappings: config.entityMappings as any,
          syncDirection: config.syncDirection,
          conflictStrategy: config.conflictStrategy,
          supportedModules: config.supportedModules as any,
          fieldTransformations: config.fieldTransformations as any,
          validationRules: config.validationRules as any,
        },
      })
    } else {
      return await prisma.pMSAdapterConfig.create({
        data: {
          integrationId,
          entityMappings: config.entityMappings as any,
          syncDirection: config.syncDirection,
          conflictStrategy: config.conflictStrategy,
          supportedModules: config.supportedModules as any,
          fieldTransformations: config.fieldTransformations as any,
          validationRules: config.validationRules as any,
        },
      })
    }
  }
  
  /**
   * Get adapter configuration
   */
  static async getAdapterConfig(integrationId: string) {
    return await prisma.pMSAdapterConfig.findUnique({
      where: { integrationId },
    })
  }
  
  // ============================================================================
  // SYNC LOGGING
  // ============================================================================
  
  /**
   * Log sync operation
   */
  static async logSync(
    hotelId: string,
    integrationId: string,
    entity: PMSEntity,
    direction: 'PULL' | 'PUSH',
    result: PMSSyncResult,
    triggeredBy: string = 'MANUAL'
  ) {
    return await prisma.pMSSyncLog.create({
      data: {
        hotelId,
        integrationId,
        entity,
        direction,
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        recordsSuccess: result.recordsSuccess,
        recordsFailed: result.recordsFailed,
        error: result.errors?.[0]?.error,
        errorDetails: result.errors as any,
        durationMs: result.durationMs,
        triggeredBy,
      },
    })
  }
  
  /**
   * Get sync history for a hotel
   */
  static async getSyncHistory(
    hotelId: string,
    options?: {
      entity?: PMSEntity
      limit?: number
      offset?: number
    }
  ) {
    const where: any = { hotelId }
    if (options?.entity) {
      where.entity = options.entity
    }
    
    const [logs, total] = await Promise.all([
      prisma.pMSSyncLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.pMSSyncLog.count({ where }),
    ])
    
    return { logs, total }
  }
  
  // ============================================================================
  // ENCRYPTION UTILITIES
  // ============================================================================
  
  private static encryptCredentials(credentials: any): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return `${iv.toString('hex')}:${encrypted}`
  }
  
  private static decryptCredentials(encrypted: string): any {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    
    const [ivHex, encryptedData] = encrypted.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }
  
  // ============================================================================
  // STATUS CHECKS
  // ============================================================================
  
  /**
   * Get integration status for a hotel
   */
  static async getStatus(hotelId: string) {
    const integration = await prisma.pMSIntegration.findUnique({
      where: { hotelId },
      include: {
        config: true,
        syncLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    })
    
    if (!integration) {
      return {
        enabled: false,
        message: 'No PMS integration configured',
      }
    }
    
    return {
      enabled: integration.enabled,
      isActive: integration.isActive,
      pmsName: integration.pmsName,
      mode: integration.mode,
      lastTestAt: integration.lastTestAt,
      lastTestStatus: integration.lastTestStatus,
      autoSyncEnabled: integration.autoSyncEnabled,
      recentSyncs: integration.syncLogs,
    }
  }
}
