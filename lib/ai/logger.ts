/**
 * logger.ts
 * Universal logging utility for API endpoints and processing pipelines.
 * Logs to console with timestamps, structured output for debugging.
 */

export interface LogEntry {
  timestamp: string
  endpoint: string
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR'
  stage: string
  message: string
  data?: Record<string, unknown>
  duration?: number
}

const formatTimestamp = (): string => {
  const now = new Date()
  return now.toISOString().split('T')[1]?.slice(0, 12) ?? ''
}

const colorize = (level: string): string => {
  const colors: Record<string, string> = {
    INFO: '\x1b[36m',   // Cyan
    DEBUG: '\x1b[35m',  // Magenta
    WARN: '\x1b[33m',   // Yellow
    ERROR: '\x1b[31m',  // Red
  }
  return colors[level] ?? '\x1b[37m'
}

const reset = '\x1b[0m'

export class ApiLogger {
  private endpoint: string
  private requestStart: number

  constructor(endpoint: string) {
    this.endpoint = endpoint
    this.requestStart = Date.now()
  }

  info(stage: string, message: string, data?: Record<string, unknown>) {
    const duration = Date.now() - this.requestStart
    const color = colorize('INFO')
    console.log(
      `${color}[${formatTimestamp()}]${reset} INFO | ${this.endpoint} | ${stage}: ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  }

  debug(stage: string, message: string, data?: Record<string, unknown>) {
    const duration = Date.now() - this.requestStart
    const color = colorize('DEBUG')
    console.log(
      `${color}[${formatTimestamp()}]${reset} DEBUG | ${this.endpoint} | ${stage}: ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  }

  warn(stage: string, message: string, data?: Record<string, unknown>) {
    const duration = Date.now() - this.requestStart
    const color = colorize('WARN')
    console.warn(
      `${color}[${formatTimestamp()}]${reset} WARN | ${this.endpoint} | ${stage}: ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  }

  error(stage: string, message: string, error?: Error | Record<string, unknown>) {
    const duration = Date.now() - this.requestStart
    const color = colorize('ERROR')
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
    console.error(
      `${color}[${formatTimestamp()}]${reset} ERROR | ${this.endpoint} | ${stage}: ${message}`,
      errorData ? JSON.stringify(errorData, null, 2) : ''
    )
  }

  success(stage: string, message: string, data?: Record<string, unknown>) {
    const duration = Date.now() - this.requestStart
    const color = '\x1b[32m' // Green
    console.log(
      `${color}[${formatTimestamp()}]${reset} ✓ SUCCESS | ${this.endpoint} | ${stage}: ${message} (${duration}ms)`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  }
}
