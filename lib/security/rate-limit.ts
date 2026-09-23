import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(request: NextRequest, name: string, limit: number, windowMs: number): { retryAfter: number } | null {
  const now = Date.now()
  if (buckets.size > 10_000) for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown'
  const key = `${name}:${address}`
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  if (current.count >= limit) return { retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  current.count += 1
  return null
}
