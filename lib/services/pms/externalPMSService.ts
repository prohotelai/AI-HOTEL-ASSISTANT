/**
 * External PMS Service - Phase 7
 * Manage external PMS integrations (Opera, Mews, Cloudbeds, etc.)
 */

import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events/eventBus'
import crypto from 'crypto'

export enum ExternalPMSType {
  OPERA = 'OPERA',
  MEWS = 'MEWS',
  CLOUDBEDS = 'CLOUDBEDS',
  PROTEL = 'PROTEL',
  APALEO = 'APALEO',
  CUSTOM = 'CUSTOM'
}

export enum PMSConnectionStatus {
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED'
}

export interface ExternalPMSConfig {
  id: string
  hotelId: string
  pmsType: ExternalPMSType
  version?: string
  endpoint?: string
  status: PMSConnectionStatus
  lastSyncedAt?: Date
  lastError?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface TestConnectionInput {
  pmsType: ExternalPMSType
  apiKey: string
  version?: string
  endpoint?: string
}

export interface SaveConfigurationInput {
  hotelId: string
  userId: string
  pmsType: ExternalPMSType
  apiKey: string
  version?: string
  endpoint?: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  details?: {
    version?: string
    features?: string[]
    limitations?: string[]
  }
  errors?: string[]
  suggestions?: string[]
}

/**
 * Encrypt API key for secure storage
 */
function encryptApiKey(apiKey: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.PMS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32))
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt API key for use
 */
function decryptApiKey(encryptedKey: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.PMS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32))
  
  const parts = encryptedKey.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Test connection to external PMS
 */
export async function testPMSConnection(
  input: TestConnectionInput
): Promise<TestConnectionResult> {
  try {
    // Get the appropriate adapter
    const adapter = getPMSAdapter(input.pmsType)
    
    if (!adapter) {
      return {
        success: false,
        message: `PMS type ${input.pmsType} is not yet implemented`,
        suggestions: [
          'Please contact support to request this integration',
          'Check if your PMS has a REST API available',
          'Consider using CUSTOM type for manual configuration'
        ]
      }
    }

    // Test the connection
    const result = await adapter.testConnection({
      apiKey: input.apiKey,
      endpoint: input.endpoint,
      version: input.version
    })

    return result

  } catch (error) {
    console.error('PMS connection test failed:', error)
    return {
      success: false,
      message: 'Connection test failed',
      errors: [
        (error as Error).message,
        'Please verify your API key and endpoint',
        'Check if your PMS API is accessible from our servers'
      ],
      suggestions: [
        'Verify API key is correct and has not expired',
        'Check endpoint URL format (https://...)',
        'Ensure firewall allows our IP addresses',
        'Confirm PMS API version is compatible'
      ]
    }
  }
}

/**
 * Save external PMS configuration
 */
export async function savePMSConfiguration(
  input: SaveConfigurationInput
): Promise<ExternalPMSConfig> {
  // Encrypt the API key
  const encryptedKey = encryptApiKey(input.apiKey)

  // Check if configuration already exists
  const existing = await prisma.externalPMSConfig.findUnique({
    where: { hotelId: input.hotelId }
  })

  let config: any

  if (existing) {
    // Update existing configuration
    config = await prisma.externalPMSConfig.update({
      where: { hotelId: input.hotelId },
      data: {
        pmsType: input.pmsType,
        apiKeyEncrypted: encryptedKey,
        version: input.version,
        endpoint: input.endpoint,
        status: PMSConnectionStatus.CONNECTED,
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      }
    })
  } else {
    // Create new configuration
    config = await prisma.externalPMSConfig.create({
      data: {
        hotelId: input.hotelId,
        pmsType: input.pmsType,
        apiKeyEncrypted: encryptedKey,
        version: input.version,
        endpoint: input.endpoint,
        status: PMSConnectionStatus.CONNECTED,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  // Log audit event
  await prisma.auditLog.create({
    data: {
      hotelId: input.hotelId,
      userId: input.userId,
      eventType: 'PMS_CONFIG',
      action: existing ? 'PMS_CONFIG_UPDATED' : 'PMS_CONFIG_CREATED',
      resourceType: 'EXTERNAL_PMS',
      resourceId: config.id,
      success: true,
      severity: 'INFO',
      metadata: {
        pmsType: input.pmsType,
        version: input.version,
        hasEndpoint: !!input.endpoint
      },
      ipAddress: '0.0.0.0', // Will be set by middleware
      userAgent: 'Admin Dashboard'
    }
  })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('pms.external.connected', {
      hotelId: input.hotelId,
      pmsType: input.pmsType,
      configId: config.id
    })
  } catch (error) {
    console.error('[ExternalPMS] Error emitting pms.external.connected:', error)
    // Don't fail the operation due to event emission failure
  }

  return config
}

/**
 * Get current PMS configuration for a hotel
 */
export async function getPMSConfiguration(
  hotelId: string
): Promise<ExternalPMSConfig | null> {
  const config = await prisma.externalPMSConfig.findUnique({
    where: { hotelId }
  })

  return config as any
}

/**
 * Disconnect external PMS
 */
export async function disconnectPMS(
  hotelId: string,
  userId: string
): Promise<void> {
  await prisma.externalPMSConfig.update({
    where: { hotelId },
    data: {
      status: PMSConnectionStatus.DISABLED,
      updatedAt: new Date()
    }
  })

  await prisma.auditLog.create({
    data: {
      hotelId,
      userId,
      eventType: 'PMS_CONFIG',
      action: 'PMS_CONFIG_DISCONNECTED',
      resourceType: 'EXTERNAL_PMS',
      resourceId: hotelId,
      success: true,
      severity: 'INFO',
      metadata: {},
      ipAddress: '0.0.0.0',
      userAgent: 'Admin Dashboard'
    }
  })

  // Emit event (Phase 8: Event bus fully operational)
  try {
    eventBus.emit('pms.external.disconnected', {
      hotelId
    })
  } catch (error) {
    console.error('[ExternalPMS] Error emitting pms.external.disconnected:', error)
  }
}

/**
 * Get PMS adapter for specific type
 */
function getPMSAdapter(pmsType: ExternalPMSType): PMSAdapter | null {
  switch (pmsType) {
    case ExternalPMSType.OPERA:
      return new OperaAdapter()
    case ExternalPMSType.MEWS:
      return new MewsAdapter()
    case ExternalPMSType.CLOUDBEDS:
      return new CloudbedsAdapter()
    case ExternalPMSType.PROTEL:
      return new ProtelAdapter()
    case ExternalPMSType.APALEO:
      return new ApaleoAdapter()
    default:
      return null
  }
}

/**
 * Base PMS Adapter Interface
 */
interface PMSAdapter {
  testConnection(params: {
    apiKey: string
    endpoint?: string
    version?: string
  }): Promise<TestConnectionResult>

  syncBookings?(hotelId: string): Promise<void>
  syncGuests?(hotelId: string): Promise<void>
  syncRooms?(hotelId: string): Promise<void>
}

/**
 * Opera PMS Adapter (stub implementation)
 */
class OperaAdapter implements PMSAdapter {
  async testConnection(params: {
    apiKey: string
    endpoint?: string
    version?: string
  }): Promise<TestConnectionResult> {
    // TODO: Implement actual Opera API connection test
    return {
      success: false,
      message: 'Opera PMS integration coming soon',
      suggestions: [
        'Opera Cloud API integration in development',
        'Expected availability: Q1 2026',
        'Contact support for early access program'
      ]
    }
  }
}

/**
 * Mews PMS Adapter (stub implementation)
 */
class MewsAdapter implements PMSAdapter {
  async testConnection(params: {
    apiKey: string
    endpoint?: string
    version?: string
  }): Promise<TestConnectionResult> {
    // TODO: Implement actual Mews API connection test
    return {
      success: false,
      message: 'Mews PMS integration coming soon',
      suggestions: [
        'Mews Commander API integration in development',
        'Expected availability: Q1 2026',
        'Contact support for early access program'
      ]
    }
  }
}

/**
 * Cloudbeds PMS Adapter (stub implementation)
 */
class CloudbedsAdapter implements PMSAdapter {
  async testConnection(params: {
    apiKey: string
    endpoint?: string
    version?: string
  }): Promise<TestConnectionResult> {
    // TODO: Implement actual Cloudbeds API connection test
    return {
      success: false,
      message: 'Cloudbeds PMS integration coming soon',
      suggestions: [
        'Cloudbeds API integration in development',
        'Expected availability: Q2 2026',
        'Contact support for early access program'
      ]
    }
  }
}

/**
 * Protel PMS Adapter (stub implementation)
 */
class ProtelAdapter implements PMSAdapter {
  async testConnection(params: {
    apiKey: string
    endpoint?: string
    version?: string
  }): Promise<TestConnectionResult> {
    // TODO: Implement actual Protel API connection test
    return {
      success: false,
      message: 'Protel PMS integration coming soon',
      suggestions: [
        'Protel Air API integration in development',
        'Expected availability: Q2 2026',
        'Contact support for early access program'
      ]
    }
  }
}

/**
 * Apaleo PMS Adapter (stub implementation)
 */
class ApaleoAdapter implements PMSAdapter {
  async testConnection(params: {
    apiKey: string
    endpoint?: string
    version?: string
  }): Promise<TestConnectionResult> {
    // TODO: Implement actual Apaleo API connection test
    return {
      success: false,
      message: 'Apaleo PMS integration coming soon',
      suggestions: [
        'Apaleo API integration in development',
        'Expected availability: Q2 2026',
        'Contact support for early access program'
      ]
    }
  }
}
