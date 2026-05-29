/**
 * logger.ts
 * Universal logging utility for API endpoints and processing pipelines.
 * Logs to console with timestamps AND writes every entry to disk via FileLogger.
 *
 * Dev  — all requests append to logs/dev.log
 * Prod — each user gets their own logs/users/<userId>.log
 * Both — files older than 24 h are purged automatically before each write.
 */

import { writeLogLine } from './file-logger'

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
  return new Date().toISOString()
}

const colorize = (level: string): string => {
  const colors: Record<string, string> = {
    INFO: '\x1b[36m',    // Cyan
    DEBUG: '\x1b[35m',   // Magenta
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    SUCCESS: '\x1b[32m', // Green
  }
  return colors[level] ?? '\x1b[37m'
}

const reset = '\x1b[0m'
const IS_PROD = process.env.NODE_ENV === 'production'

export class ApiLogger {
  private endpoint: string
  private requestStart: number
  private userId: string | null

  /**
   * @param endpoint  e.g. 'POST /api/recommend'
   * @param userId    Pass the authenticated user's ID so prod logs are separated per user.
   *                  Can be set later via setUserId() once the auth check resolves.
   */
  constructor(endpoint: string, userId?: string | null) {
    this.endpoint = endpoint
    this.requestStart = Date.now()
    this.userId = userId ?? null
  }

  /** Call after the auth check resolves to attach the user to subsequent log lines. */
  setUserId(userId: string | null) {
    this.userId = userId
  }

  // ── Private helper ─────────────────────────────────────────────────────────

  private write(
    level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'SUCCESS',
    stage: string,
    message: string,
    data?: Record<string, unknown> | null,
  ) {
    const ts = formatTimestamp()
    const durationMs = Date.now() - this.requestStart
    const color = colorize(level)

    // Terminal output (colour, compact)
    const prefix = `${color}[${ts}]${reset} ${level} | ${this.endpoint} | ${stage}: ${message}`
    if (level === 'ERROR') {
      console.error(prefix, data ? JSON.stringify(data, null, 2) : '')
    } else if (level === 'WARN') {
      console.warn(prefix, data ? JSON.stringify(data, null, 2) : '')
    } else {
      console.log(
        level === 'SUCCESS'
          ? `${prefix} (${durationMs}ms)`
          : prefix,
        data ? JSON.stringify(data, null, 2) : ''
      )
    }

    // File output (always; fire-and-forget)
    writeLogLine(
      {
        ts,
        env: IS_PROD ? 'prod' : 'dev',
        endpoint: this.endpoint,
        level,
        stage,
        message,
        data: data ?? undefined,
        durationMs,
      },
      this.userId,
    )
  }

  // ── Public log methods ─────────────────────────────────────────────────────

  info(stage: string, message: string, data?: Record<string, unknown>) {
    this.write('INFO', stage, message, data)
  }

  debug(stage: string, message: string, data?: Record<string, unknown>) {
    this.write('DEBUG', stage, message, data)
  }

  warn(stage: string, message: string, data?: Record<string, unknown>) {
    this.write('WARN', stage, message, data)
  }

  error(stage: string, message: string, error?: Error | Record<string, unknown>) {
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
    this.write('ERROR', stage, message, errorData as Record<string, unknown> | null)
  }

  success(stage: string, message: string, data?: Record<string, unknown>) {
    this.write('SUCCESS', stage, message, data)
  }
}
