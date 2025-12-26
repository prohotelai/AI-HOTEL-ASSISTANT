import { PMSIntegrationError } from '../errors'

export type RetryOptions = {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
}

export class RESTAdapter {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private retryOptions: Required<RetryOptions>

  constructor(
    baseURL: string,
    defaultHeaders: Record<string, string> = {},
    retryOptions: RetryOptions = {}
  ) {
    this.baseURL = baseURL.replace(/\/$/, '')
    this.defaultHeaders = defaultHeaders
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${path}`
    const method = options.method ?? 'GET'
    const headers = { ...this.defaultHeaders, ...options.headers }

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    let lastError: Error | null = null
    let delay = this.retryOptions.initialDelay

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      const controller = new AbortController()
      const timeout = options.timeout ?? 30000

      try {
        const response = (await Promise.race([
          fetch(url, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              controller.abort()
              reject(
                new PMSIntegrationError('PMS API request timed out', {
                  statusCode: 504,
                  code: 'TIMEOUT',
                })
              )
            }, timeout)
          ),
        ])) as Response

        if (!response.ok) {
          // Check if status code is retryable
          if (
            this.retryOptions.retryableStatusCodes.includes(response.status) &&
            attempt < this.retryOptions.maxRetries
          ) {
            const errorText = await response.text().catch(() => 'Unknown error')
            lastError = new PMSIntegrationError(
              `PMS API request failed: ${response.status} ${errorText}`,
              {
                statusCode: response.status,
                code: `HTTP_${response.status}`,
              }
            )

            // Wait before retrying
            await this.sleep(delay)
            delay = Math.min(delay * this.retryOptions.backoffMultiplier, this.retryOptions.maxDelay)
            continue
          }

          // Non-retryable error
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new PMSIntegrationError(`PMS API request failed: ${response.status} ${errorText}`, {
            statusCode: response.status,
            code: `HTTP_${response.status}`,
          })
        }

        // Success
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          return await response.json()
        }

        return (await response.text()) as T
      } catch (error) {

        if (error instanceof PMSIntegrationError) {
          throw error
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new PMSIntegrationError('PMS API request timed out', {
            statusCode: 504,
            code: 'TIMEOUT',
            cause: error,
          })
        }

        lastError = error as Error

        // Retry on network errors
        if (attempt < this.retryOptions.maxRetries) {
          await this.sleep(delay)
          delay = Math.min(delay * this.retryOptions.backoffMultiplier, this.retryOptions.maxDelay)
          continue
        }

        throw new PMSIntegrationError('PMS API request failed', {
          statusCode: 502,
          code: 'NETWORK_ERROR',
          cause: lastError,
        })
      }
    }

    throw new PMSIntegrationError('PMS API request failed after retries', {
      statusCode: 502,
      code: 'MAX_RETRIES_EXCEEDED',
      cause: lastError,
    })
  }

  async get<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'GET', headers })
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, headers })
  }

  async put<T = unknown>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, headers })
  }

  async patch<T = unknown>(
    path: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, headers })
  }

  async delete<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', headers })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Example: Cloudbeds REST adapter
export class CloudbedsRESTAdapter extends RESTAdapter {
  constructor(apiKey: string) {
    super(
      'https://api.cloudbeds.com/v1',
      {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'AI-Hotel-Assistant/1.0',
      },
      {
        maxRetries: 3,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      }
    )
  }

  async getReservations(propertyId: string, since?: Date) {
    const params = new URLSearchParams({ propertyId })
    if (since) {
      params.append('modifiedSince', since.toISOString())
    }
    return this.get(`/reservations?${params.toString()}`)
  }

  async getRooms(propertyId: string) {
    return this.get(`/properties/${propertyId}/rooms`)
  }

  async getGuests(propertyId: string) {
    return this.get(`/properties/${propertyId}/guests`)
  }
}

// Example: Opera PMS REST adapter (Oracle Hospitality)
export class OperaRESTAdapter extends RESTAdapter {
  constructor(apiKey: string, hotelCode: string) {
    super(
      `https://opera-pms.oracle.com/api/v1/${hotelCode}`,
      {
        'x-api-key': apiKey,
        'User-Agent': 'AI-Hotel-Assistant/1.0',
      },
      {
        maxRetries: 2,
        initialDelay: 2000,
      }
    )
  }

  async getReservations(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams()
    if (startDate) {
      params.append('arrivalStart', startDate.toISOString().split('T')[0])
    }
    if (endDate) {
      params.append('arrivalEnd', endDate.toISOString().split('T')[0])
    }
    return this.get(`/reservations?${params.toString()}`)
  }

  async getRoomInventory() {
    return this.get('/rooms/inventory')
  }

  async getGuestProfiles() {
    return this.get('/guests/profiles')
  }
}
