/**
 * file-logger.ts
 * Writes structured log lines to disk alongside the normal terminal output.
 *
 * Dev mode  — one shared file: logs/dev.log
 *             Appended on every request (survives hard refreshes, no rotation).
 *
 * Prod mode — one file per user: logs/users/<userId>.log   (userId = auth UID)
 *             Falls back to logs/anon.log for unauthenticated requests.
 *             Appended with ISO timestamps on every event.
 *
 * Purge     — files whose last-modified time is >24 h old are deleted before
 *             each write. Safe to run on every request (stat is cheap).
 *
 * This module is Node.js-only (Next.js server routes / API routes).
 * It must never be imported on the client side.
 */

import fs from 'fs'
import path from 'path'

// ── Config ────────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production'
const LOGS_DIR = path.resolve(process.cwd(), 'logs')
const USERS_DIR = path.join(LOGS_DIR, 'users')
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/** Delete any file inside `dir` whose mtime is older than MAX_AGE_MS. */
function purgeOldLogs(dir: string): void {
  try {
    if (!fs.existsSync(dir)) return
    const now = Date.now()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const filePath = path.join(dir, entry.name)
      try {
        const { mtimeMs } = fs.statSync(filePath)
        if (now - mtimeMs > MAX_AGE_MS) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // If stat or unlink fails, skip silently
      }
    }
  } catch {
    // Purge errors must never surface to callers
  }
}

/** Resolve the target log file path for the current environment. */
function resolveLogFile(userId?: string | null): string {
  if (IS_PROD) {
    ensureDir(USERS_DIR)
    purgeOldLogs(USERS_DIR)
    const safe = userId?.replace(/[^a-zA-Z0-9_-]/g, '_') ?? 'anon'
    return path.join(USERS_DIR, `${safe}.log`)
  }

  ensureDir(LOGS_DIR)
  purgeOldLogs(LOGS_DIR)
  return path.join(LOGS_DIR, 'dev.log')
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface FileLogEntry {
  ts: string          // ISO timestamp
  env: 'dev' | 'prod'
  endpoint: string
  level: string
  stage: string
  message: string
  userId?: string
  data?: unknown
  durationMs?: number
}

/**
 * Append one log line to disk. Fire-and-forget — never throws.
 */
export function writeLogLine(entry: FileLogEntry, userId?: string | null): void {
  try {
    const logFile = resolveLogFile(userId)
    const line = JSON.stringify({ ...entry, userId: userId ?? undefined }) + '\n'
    fs.appendFileSync(logFile, line, 'utf8')
  } catch {
    // File I/O errors must never break the request
  }
}
