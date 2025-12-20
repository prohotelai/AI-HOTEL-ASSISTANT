// ============================================================================
// PMS CONNECTION TESTER
// ============================================================================
// Tests connection to external PMS systems
// ⚠️ Read-only operations only - no data modification
// ============================================================================

import axios, { AxiosInstance } from 'axios'
import {
  PMSConnectionTestRequest,
  PMSConnectionTestResult,
  PMSConnectionError,
  PMSAuthType,
} from '../types/pms.types'

export class PMSConnectionTester {
  
  /**
   * Test connection to external PMS
   */
  static async testConnection(
    request: PMSConnectionTestRequest
  ): Promise<PMSConnectionTestResult> {
    const startTime = Date.now()
    
    try {
      // Validate request
      this.validateRequest(request)
      
      // Create HTTP client with auth
      const client = this.createAuthenticatedClient(request)
      
      // Test connection
      const testEndpoint = request.testEndpoint || '/api/health'
      const response = await client.get(testEndpoint, {
        timeout: 10000, // 10 second timeout
      })
      
      const responseTime = Date.now() - startTime
      
      // Analyze response
      const result = this.analyzeResponse(response, responseTime)
      
      return {
        success: true,
        message: 'Connection successful',
        details: result,
      }
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      return {
        success: false,
        message: this.getErrorMessage(error),
        details: {
          responseTime,
          errorDetails: {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
          },
        },
      }
    }
  }
  
  /**
   * Test specific endpoint
   */
  static async testEndpoint(
    request: PMSConnectionTestRequest,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<PMSConnectionTestResult> {
    try {
      const client = this.createAuthenticatedClient(request)
      
      const startTime = Date.now()
      const response = await client.request({
        method,
        url: endpoint,
        timeout: 10000,
      })
      const responseTime = Date.now() - startTime
      
      return {
        success: true,
        message: `Endpoint ${endpoint} is accessible`,
        details: {
          responseTime,
          status: response.status,
          dataReceived: !!response.data,
        },
      }
      
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to access ${endpoint}`,
        details: {
          errorDetails: {
            message: error.message,
            status: error.response?.status,
          },
        },
      }
    }
  }
  
  /**
   * Discover available endpoints
   */
  static async discoverEndpoints(
    request: PMSConnectionTestRequest
  ): Promise<string[]> {
    // Common PMS API endpoints to test
    const commonEndpoints = [
      '/api/rooms',
      '/api/reservations',
      '/api/bookings',
      '/api/guests',
      '/api/rates',
      '/api/folios',
      '/api/invoices',
    ]
    
    const client = this.createAuthenticatedClient(request)
    const available: string[] = []
    
    for (const endpoint of commonEndpoints) {
      try {
        await client.get(endpoint, { timeout: 5000 })
        available.push(endpoint)
      } catch {
        // Endpoint not available, skip
      }
    }
    
    return available
  }
  
  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
  
  private static validateRequest(request: PMSConnectionTestRequest): void {
    if (!request.hotelId) {
      throw new PMSConnectionError('Hotel ID is required')
    }
    if (!request.pmsName) {
      throw new PMSConnectionError('PMS name is required')
    }
    if (!request.authType) {
      throw new PMSConnectionError('Auth type is required')
    }
    if (!request.credentials) {
      throw new PMSConnectionError('Credentials are required')
    }
  }
  
  private static createAuthenticatedClient(
    request: PMSConnectionTestRequest
  ): AxiosInstance {
    const config: any = {
      baseURL: request.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    }
    
    // Apply authentication based on type
    switch (request.authType) {
      case 'API_KEY':
        if (request.credentials.apiKey) {
          config.headers['X-API-Key'] = request.credentials.apiKey
        }
        if (request.credentials.apiSecret) {
          config.headers['X-API-Secret'] = request.credentials.apiSecret
        }
        break
        
      case 'OAUTH':
        if (request.credentials.token) {
          config.headers['Authorization'] = `Bearer ${request.credentials.token}`
        }
        break
        
      case 'BASIC':
        if (request.credentials.username && request.credentials.password) {
          config.auth = {
            username: request.credentials.username,
            password: request.credentials.password,
          }
        }
        break
        
      case 'CUSTOM':
        // Custom auth fields from credentials
        if (request.credentials.customFields) {
          Object.entries(request.credentials.customFields).forEach(([key, value]) => {
            config.headers[key] = value
          })
        }
        break
    }
    
    return axios.create(config)
  }
  
  private static analyzeResponse(response: any, responseTime: number) {
    return {
      responseTime,
      status: response.status,
      apiVersion: response.headers['x-api-version'] || response.data?.version,
      supportedModules: this.detectModules(response.data),
    }
  }
  
  private static detectModules(data: any): string[] {
    // Try to detect what modules are available
    const modules: string[] = []
    
    if (data?.endpoints) {
      const endpoints = Array.isArray(data.endpoints) ? data.endpoints : Object.keys(data.endpoints)
      
      if (endpoints.some((e: string) => e.includes('room'))) modules.push('rooms')
      if (endpoints.some((e: string) => e.includes('booking') || e.includes('reservation'))) modules.push('bookings')
      if (endpoints.some((e: string) => e.includes('guest'))) modules.push('guests')
      if (endpoints.some((e: string) => e.includes('invoice') || e.includes('folio'))) modules.push('invoices')
    }
    
    return modules
  }
  
  private static getErrorMessage(error: any): string {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused - PMS server not reachable'
    }
    if (error.code === 'ETIMEDOUT') {
      return 'Connection timeout - PMS server not responding'
    }
    if (error.response?.status === 401) {
      return 'Authentication failed - invalid credentials'
    }
    if (error.response?.status === 403) {
      return 'Access forbidden - insufficient permissions'
    }
    if (error.response?.status === 404) {
      return 'Endpoint not found - check PMS configuration'
    }
    
    return error.message || 'Unknown connection error'
  }
}
