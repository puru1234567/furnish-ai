import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from './authorization'

type AdminClient = SupabaseClient
export type SettingCategory = 'product_rules' | 'upload_limits' | 'allowed_file_types' | 'notifications' | 'approval' | 'catalog' | 'feature_flags' | 'marketplace'
export type SettingValueType = 'number' | 'boolean' | 'string' | 'string_array'
export interface PlatformSetting { key: string; category: SettingCategory; value: unknown; description: string | null; updatedBy: string | null; updatedAt: string }

// Explicit allow-list. Settings writes are rejected for any key not declared here,
// which also keeps this table from ever becoming a home for infrastructure secrets.
const SETTING_TYPES: Record<string, SettingValueType> = {
  max_upload_file_size_mb: 'number',
  allowed_file_types: 'string_array',
  product_min_images_required: 'number',
  product_description_min_length: 'number',
  approval_auto_escalate_after_days: 'number',
  notifications_digest_enabled: 'boolean',
  catalog_default_page_size: 'number',
  marketplace_low_stock_threshold: 'number',
  feature_bulk_operations_enabled: 'boolean',
  feature_scheduled_listings_enabled: 'boolean',
}

function db(): AdminClient { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error('ADMIN_DATA_NOT_CONFIGURED'); return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
function validateValue(key: string, value: unknown): unknown {
  const type = SETTING_TYPES[key]; if (!type) throw new Error('UNKNOWN_SETTING_KEY')
  if (type === 'number' && typeof value !== 'number') throw new Error('INVALID_SETTING_VALUE')
  if (type === 'boolean' && typeof value !== 'boolean') throw new Error('INVALID_SETTING_VALUE')
  if (type === 'string' && typeof value !== 'string') throw new Error('INVALID_SETTING_VALUE')
  if (type === 'string_array' && (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))) throw new Error('INVALID_SETTING_VALUE')
  return value
}

export async function listSettings(): Promise<Record<SettingCategory, PlatformSetting[]>> {
  await requireAdmin('settings.manage'); const client = db()
  const { data, error } = await client.from('platform_settings').select('*').order('category').order('key')
  if (error) throw error
  const grouped = {} as Record<SettingCategory, PlatformSetting[]>
  for (const row of data ?? []) { const category = row.category as SettingCategory; (grouped[category] ??= []).push({ key: row.key, category, value: row.value, description: row.description, updatedBy: row.updated_by, updatedAt: row.updated_at }) }
  return grouped
}

export async function updateSetting(key: string, value: unknown, reason?: string) {
  const { user } = await requireAdmin('settings.manage'); const validated = validateValue(key, value); const client = db()
  const { data: current, error: lookupError } = await client.from('platform_settings').select('*').eq('key', key).maybeSingle()
  if (lookupError) throw lookupError; if (!current) throw new Error('SETTING_NOT_FOUND')
  const { error } = await client.from('platform_settings').update({ value: validated, updated_by: user.id, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) throw error
  const { error: auditError } = await client.from('admin_audit_events').insert({ actor_id: user.id, action: 'settings.updated', entity_type: 'platform_setting', entity_id: null, previous_value: current.value, new_value: validated, reason: reason?.trim() || null, metadata: { key, category: current.category } })
  if (auditError) throw new Error('AUDIT_WRITE_FAILED')
  return { key, value: validated }
}
