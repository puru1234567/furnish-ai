import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

type AdminClient = SupabaseClient
export type UploadKind = 'document' | 'image' | 'catalog_import'
export interface UploadValidationResult { detectedMimeType: string; extension: string; sizeBytes: number; maxBytes: number }

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024
const DEFAULT_TYPES: Record<UploadKind, readonly string[]> = {
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  catalog_import: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
}
const EXTENSIONS: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
}

function db(): AdminClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}
async function settings(): Promise<{ maxBytes: number; allowed: string[] }> {
  const client = db(); if (!client) return { maxBytes: DEFAULT_MAX_BYTES, allowed: [] }
  const { data } = await client.from('platform_settings').select('key, value').in('key', ['max_upload_file_size_mb', 'allowed_file_types'])
  const maxMb = Number(data?.find((item) => item.key === 'max_upload_file_size_mb')?.value)
  const configuredTypes = data?.find((item) => item.key === 'allowed_file_types')?.value
  return { maxBytes: Number.isFinite(maxMb) && maxMb > 0 ? maxMb * 1024 * 1024 : DEFAULT_MAX_BYTES, allowed: Array.isArray(configuredTypes) ? configuredTypes.filter((item): item is string => typeof item === 'string') : [] }
}
async function detectMime(file: File, extension: string): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return extension === '.doc' ? 'application/msword' : null
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return extension === '.xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : extension === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : null
  if (extension === '.csv') { const sample = new TextDecoder().decode(bytes); return sample.includes('\u0000') ? null : 'text/csv' }
  return null
}

export async function validateUpload(file: File, kind: UploadKind): Promise<UploadValidationResult> {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`; const config = await settings(); const detectedMimeType = await detectMime(file, extension); const allowed = config.allowed.length ? config.allowed : [...DEFAULT_TYPES[kind]]
  if (file.size > config.maxBytes) throw new Error('UPLOAD_TOO_LARGE')
  if (!detectedMimeType || !allowed.includes(detectedMimeType) || !DEFAULT_TYPES[kind].includes(detectedMimeType) || !EXTENSIONS[detectedMimeType]?.includes(extension)) throw new Error('UPLOAD_TYPE_NOT_ALLOWED')
  return { detectedMimeType, extension, sizeBytes: file.size, maxBytes: config.maxBytes }
}
