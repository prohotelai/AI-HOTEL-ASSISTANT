export class PMSIntegrationError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(message: string, options?: { statusCode?: number; code?: string; cause?: unknown }) {
    super(message)
    this.name = 'PMSIntegrationError'
    this.statusCode = options?.statusCode ?? 400
    this.code = options?.code ?? 'PMS_INTEGRATION_ERROR'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

export function assert(condition: unknown, message: string, options?: { statusCode?: number; code?: string }) {
  if (!condition) {
    throw new PMSIntegrationError(message, options)
  }
}
