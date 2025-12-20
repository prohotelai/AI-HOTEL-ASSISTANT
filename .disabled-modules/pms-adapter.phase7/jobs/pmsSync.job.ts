// ============================================================================
// PMS SYNC BACKGROUND JOB
// ============================================================================
// Background job for automated PMS synchronization
// ⚠️ DISABLED BY DEFAULT - Only runs when explicitly enabled per hotel
// ============================================================================

import { prisma } from '@/lib/prisma'
import { PMSAdapterService } from '../services/pmsAdapter.service'
import { PMSSyncEngine } from '../services/pmsSyncEngine'
import { PMSEntity } from '../types/pms.types'

export class PMSSyncJob {
  
  /**
   * Execute sync job for all enabled hotels
   * ⚠️ Only runs for hotels with autoSyncEnabled = true
   */
  static async execute(): Promise<void> {
    // Check if feature is globally enabled
    if (!PMSAdapterService.isFeatureEnabled()) {
      console.log('PMS Adapter feature is disabled globally')
      return
    }
    
    try {
      // Find all hotels with active auto-sync
      const activeIntegrations = await prisma.pMSIntegration.findMany({
        where: {
          enabled: true,
          autoSyncEnabled: true,
        },
        include: {
          config: true,
        },
      })
      
      console.log(`Found ${activeIntegrations.length} active PMS integrations`)
      
      for (const integration of activeIntegrations) {
        await this.syncHotel(integration)
      }
      
    } catch (error) {
      console.error('PMS Sync Job failed:', error)
    }
  }
  
  /**
   * Sync a single hotel's PMS data
   */
  private static async syncHotel(integration: any): Promise<void> {
    try {
      console.log(`Starting sync for hotel ${integration.hotelId}`)
      
      // Check if config exists
      if (!integration.config) {
        console.warn(`No config found for integration ${integration.id}`)
        return
      }
      
      // Get supported modules
      const supportedModules = integration.config.supportedModules as PMSEntity[]
      
      if (!supportedModules || supportedModules.length === 0) {
        console.warn(`No supported modules for integration ${integration.id}`)
        return
      }
      
      // Sync each supported entity
      for (const entity of supportedModules) {
        try {
          const result = await PMSSyncEngine.sync({
            hotelId: integration.hotelId,
            entity,
            direction: this.getSyncDirection(integration.config, entity),
          })
          
          console.log(`Synced ${entity} for hotel ${integration.hotelId}:`, {
            status: result.status,
            processed: result.recordsProcessed,
            success: result.recordsSuccess,
            failed: result.recordsFailed,
          })
          
        } catch (error) {
          console.error(`Failed to sync ${entity} for hotel ${integration.hotelId}:`, error)
        }
      }
      
    } catch (error) {
      console.error(`Sync failed for hotel ${integration.hotelId}:`, error)
    }
  }
  
  /**
   * Determine sync direction for an entity
   */
  private static getSyncDirection(
    config: any,
    entity: PMSEntity
  ): 'PULL' | 'PUSH' {
    const syncDirection = config.syncDirection as string
    
    // Default to PULL for most entities
    if (syncDirection === 'PULL_ONLY') {
      return 'PULL'
    }
    
    if (syncDirection === 'PUSH_ONLY') {
      return 'PUSH'
    }
    
    // For BIDIRECTIONAL, prefer PULL for most entities
    // This is safer as it doesn't overwrite external PMS data
    return 'PULL'
  }
  
  /**
   * Process sync queue (for manual or scheduled syncs)
   */
  static async processQueue(): Promise<void> {
    if (!PMSAdapterService.isFeatureEnabled()) {
      return
    }
    
    try {
      // Get pending sync jobs
      const pendingJobs = await prisma.pMSSyncQueue.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: {
            lte: new Date(),
          },
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledFor: 'asc' },
        ],
        take: 10, // Process 10 at a time
      })
      
      for (const job of pendingJobs) {
        await this.processQueueItem(job)
      }
      
    } catch (error) {
      console.error('Failed to process sync queue:', error)
    }
  }
  
  /**
   * Process a single queue item
   */
  private static async processQueueItem(job: any): Promise<void> {
    try {
      // Mark as processing
      await prisma.pMSSyncQueue.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          attempts: job.attempts + 1,
        },
      })
      
      // Execute sync
      const result = await PMSSyncEngine.sync({
        hotelId: job.hotelId,
        entity: job.entity,
        direction: job.direction,
      })
      
      // Mark as completed
      await prisma.pMSSyncQueue.update({
        where: { id: job.id },
        data: {
          status: result.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
          completedAt: new Date(),
          lastError: result.status !== 'SUCCESS' ? result.errors?.[0]?.error : null,
        },
      })
      
    } catch (error: any) {
      // Check if max attempts reached
      if (job.attempts >= job.maxAttempts) {
        await prisma.pMSSyncQueue.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            lastError: error.message,
          },
        })
      } else {
        // Retry later
        await prisma.pMSSyncQueue.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            lastError: error.message,
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
          },
        })
      }
    }
  }
  
  /**
   * Schedule a sync job
   */
  static async scheduleSync(
    hotelId: string,
    integrationId: string,
    entity: PMSEntity,
    direction: 'PULL' | 'PUSH',
    options?: {
      priority?: number
      scheduledFor?: Date
    }
  ): Promise<string> {
    const job = await prisma.pMSSyncQueue.create({
      data: {
        hotelId,
        integrationId,
        entity,
        direction,
        priority: options?.priority || 5,
        scheduledFor: options?.scheduledFor || new Date(),
      },
    })
    
    return job.id
  }
}

// ============================================================================
// CRON JOB SETUP (Optional - for deployment)
// ============================================================================

/**
 * This function should be called by a cron job or scheduler
 * Example: Every 15 minutes
 * 
 * In Vercel/serverless: Use Vercel Cron or external scheduler
 * In traditional server: Use node-cron or similar
 */
export async function runPMSSyncCron() {
  console.log('Running PMS Sync Cron Job...')
  
  try {
    // Process queue first (manual/priority syncs)
    await PMSSyncJob.processQueue()
    
    // Then run auto-sync for enabled integrations
    await PMSSyncJob.execute()
    
    console.log('PMS Sync Cron Job completed')
  } catch (error) {
    console.error('PMS Sync Cron Job failed:', error)
  }
}
