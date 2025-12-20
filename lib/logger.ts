/**
 * Simple Logger Utility
 * Provides structured logging with different levels
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogData {
  [key: string]: any
}

class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString()
    const contextStr = this.context ? `[${this.context}]` : ''
    const dataStr = data ? JSON.stringify(data) : ''
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message} ${dataStr}`
  }

  info(message: string, data?: LogData): void {
    console.log(this.formatMessage('info', message, data))
  }

  warn(message: string, data?: LogData): void {
    console.warn(this.formatMessage('warn', message, data))
  }

  error(message: string, data?: LogData): void {
    console.error(this.formatMessage('error', message, data))
  }

  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, data))
    }
  }
}

// Export default logger instance
export const logger = new Logger()

// Export function to create contextual loggers
export function createLogger(context: string): Logger {
  return new Logger(context)
}
