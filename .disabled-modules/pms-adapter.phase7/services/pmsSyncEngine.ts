// ============================================================================
// PMS SYNC ENGINE
// ============================================================================
// Handles data synchronization between external PMS and internal system
// ⚠️ ONLY RUNS WHEN EXPLICITLY ENABLED - No automatic background execution
// ============================================================================

import { prisma } from '@/lib/prisma'
import axios, { AxiosInstance } from 'axios'
import {
  PMSSyncRequest,
  PMSSyncResult,
  PMSSyncError as PMSSyncErrorType,
  PMSEntity,
  PMSSyncError,
  PMSEntityMapping,
} from '../types/pms.types'
import { PMSAdapterService } from './pmsAdapter.service'
import { PMSMappingEngine } from './pmsMappingEngine'

export class PMSSyncEngine {
  
  /**
   * Execute a sync operation
   * ⚠️ Requires explicit approval - no automatic execution
   */
  static async sync(request: PMSSyncRequest): Promise<PMSSyncResult> {
    const startTime = Date.now()
    
    // Safety check: Ensure integration is enabled
    await PMSAdapterService.assertEnabled(request.hotelId)
    
    const errors: PMSSyncErrorType[] = []
    let recordsProcessed = 0
    let recordsSuccess = 0
    let recordsFailed = 0
    
    try {
      // Get integration config
      const integration = await PMSAdapterService.getIntegration(request.hotelId)
      if (!integration) {
        throw new PMSSyncError('Integration not found')
      }
      
      // Get adapter config (mappings)
      const adapterConfig = await PMSAdapterService.getAdapterConfig(integration.id)
      if (!adapterConfig) {
        throw new PMSSyncError('Adapter configuration not found')
      }
      
      // Get entity mapping
      const entityMappings = adapterConfig.entityMappings as any
      const entityMapping: PMSEntityMapping = entityMappings[request.entity]
      
      if (!entityMapping || !entityMapping.enabled) {
        throw new PMSSyncError(`Entity ${request.entity} is not configured or disabled`)
      }
      
      // Execute sync based on direction
      if (request.direction === 'PULL') {
        const result = await this.pullFromExternal(
          integration,
          entityMapping,
          request
        )
        recordsProcessed = result.processed
        recordsSuccess = result.success
        recordsFailed = result.failed
        errors.push(...result.errors)
      } else {
        const result = await this.pushToExternal(
          integration,
          entityMapping,
          request
        )
        recordsProcessed = result.processed
        recordsSuccess = result.success
        recordsFailed = result.failed
        errors.push(...result.errors)
      }
      
      const durationMs = Date.now() - startTime
      
      const syncResult: PMSSyncResult = {
        status: recordsFailed === 0 ? 'SUCCESS' : recordsFailed < recordsProcessed ? 'PARTIAL' : 'FAILED',
        recordsProcessed,
        recordsSuccess,
        recordsFailed,
        durationMs,
        errors: errors.length > 0 ? errors : undefined,
      }
      
      // Log the sync operation
      await PMSAdapterService.logSync(
        request.hotelId,
        integration.id,
        request.entity,
        request.direction,
        syncResult,
        request.force ? 'MANUAL_FORCE' : 'MANUAL'
      )
      
      return syncResult
      
    } catch (error: any) {
      const durationMs = Date.now() - startTime
      
      return {
        status: 'FAILED',
        recordsProcessed,
        recordsSuccess,
        recordsFailed,
        durationMs,
        errors: [
          {
            error: error.message || 'Sync operation failed',
            errorDetails: error,
          },
        ],
      }
    }
  }
  
  /**
   * Pull data from external PMS to internal system
   */
  private static async pullFromExternal(
    integration: any,
    entityMapping: PMSEntityMapping,
    request: PMSSyncRequest
  ): Promise<{
    processed: number
    success: number
    failed: number
    errors: PMSSyncErrorType[]
  }> {
    const errors: PMSSyncErrorType[] = []
    let processed = 0
    let success = 0
    let failed = 0
    
    try {
      // Create HTTP client
      const client = this.createPMSClient(integration)
      
      // Fetch data from external PMS
      const endpoint = this.getEntityEndpoint(request.entity)
      const response = await client.get(endpoint, {
        params: request.recordIds ? { ids: request.recordIds.join(',') } : undefined,
      })
      
      const externalRecords = Array.isArray(response.data) ? response.data : response.data?.results || []
      
      for (const externalRecord of externalRecords) {
        processed++
        
        try {
          // Transform external data to internal format
          const internalData = PMSMappingEngine.transformToInternal(
            externalRecord,
            request.entity,
            entityMapping
          )
          
          // Dry run check
          if (request.dryRun) {
            success++
            continue
          }
          
          // Upsert into database
          await this.upsertRecord(request.entity, internalData, request.hotelId)
          success++
          
        } catch (error: any) {
          failed++
          errors.push({
            recordId: externalRecord.id,
            error: error.message,
            errorDetails: error,
          })
        }
      }
      
    } catch (error: any) {
      errors.push({
        error: `Failed to pull data: ${error.message}`,
        errorDetails: error,
      })
    }
    
    return { processed, success, failed, errors }
  }
  
  /**
   * Push data from internal system to external PMS
   */
  private static async pushToExternal(
    integration: any,
    entityMapping: PMSEntityMapping,
    request: PMSSyncRequest
  ): Promise<{
    processed: number
    success: number
    failed: number
    errors: PMSSyncErrorType[]
  }> {
    const errors: PMSSyncErrorType[] = []
    let processed = 0
    let success = 0
    let failed = 0
    
    try {
      // Fetch records from internal database
      const internalRecords = await this.fetchInternalRecords(
        request.entity,
        request.hotelId,
        request.recordIds
      )
      
      // Create HTTP client
      const client = this.createPMSClient(integration)
      const endpoint = this.getEntityEndpoint(request.entity)
      
      for (const internalRecord of internalRecords) {
        processed++
        
        try {
          // Transform internal data to external format
          const externalData = PMSMappingEngine.transformToExternal(
            internalRecord,
            request.entity,
            entityMapping
          )
          
          // Dry run check
          if (request.dryRun) {
            success++
            continue
          }
          
          // Push to external PMS
          await client.post(endpoint, externalData)
          success++
          
        } catch (error: any) {
          failed++
          errors.push({
            recordId: internalRecord.id,
            error: error.message,
            errorDetails: error,
          })
        }
      }
      
    } catch (error: any) {
      errors.push({
        error: `Failed to push data: ${error.message}`,
        errorDetails: error,
      })
    }
    
    return { processed, success, failed, errors }
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private static createPMSClient(integration: any): AxiosInstance {
    const config: any = {
      baseURL: integration.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    }
    
    // Apply authentication
    const credentials = integration.credentials
    
    switch (integration.authType) {
      case 'API_KEY':
        if (credentials.apiKey) {
          config.headers['X-API-Key'] = credentials.apiKey
        }
        break
        
      case 'OAUTH':
        if (credentials.token) {
          config.headers['Authorization'] = `Bearer ${credentials.token}`
        }
        break
        
      case 'BASIC':
        if (credentials.username && credentials.password) {
          config.auth = {
            username: credentials.username,
            password: credentials.password,
          }
        }
        break
    }
    
    return axios.create(config)
  }
  
  private static getEntityEndpoint(entity: PMSEntity): string {
    const endpoints: Record<PMSEntity, string> = {
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      guests: '/api/guests',
      invoices: '/api/invoices',
      folios: '/api/folios',
      rates: '/api/rates',
    }
    
    return endpoints[entity] || `/api/${entity}`
  }
  
  private static async upsertRecord(
    entity: PMSEntity,
    data: any,
    hotelId: string
  ): Promise<void> {
    // Add hotelId to data for multi-tenancy
    data.hotelId = hotelId
    
    // Map entity to Prisma model and upsert
    // ⚠️ This is a simplified version - actual implementation would be more robust
    switch (entity) {
      case 'rooms':
        await prisma.room.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        })
        break
        
      case 'bookings':
        await prisma.booking.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        })
        break
        
      case 'guests':
        await prisma.guest.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        })
        break
        
      // Add more entities as needed
    }
  }
  
  private static async fetchInternalRecords(
    entity: PMSEntity,
    hotelId: string,
    recordIds?: string[]
  ): Promise<any[]> {
    const where: any = { hotelId }
    
    if (recordIds && recordIds.length > 0) {
      where.id = { in: recordIds }
    }
    
    // Fetch from Prisma based on entity
    switch (entity) {
      case 'rooms':
        return await prisma.room.findMany({ where })
        
      case 'bookings':
        return await prisma.booking.findMany({ where })
        
      case 'guests':
        return await prisma.guest.findMany({ where })
        
      default:
        return []
    }
  }
}
