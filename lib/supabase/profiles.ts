import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getUserRole, type AppRole } from '@/lib/supabase/roles'

export interface AppProfile {
  id: string
  email: string
  role: AppRole
  full_name: string | null
}

export async function fetchOwnProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as AppProfile
}

export async function upsertOwnProfileName(
  supabase: SupabaseClient,
  user: User,
  fullName: string
): Promise<void> {
  const trimmedName = fullName.trim()
  if (!trimmedName) return

  await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        role: getUserRole(user),
        full_name: trimmedName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
}

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmedValue = value.trim()
  return trimmedValue || null
}

export function getDisplayName(user: User | null, profile: AppProfile | null): string {
  const profileName = normalizeDisplayName(profile?.full_name)
  if (profileName) return profileName

  const metadataName = normalizeDisplayName(user?.user_metadata?.full_name)
    ?? normalizeDisplayName(user?.user_metadata?.name)
    ?? normalizeDisplayName(user?.user_metadata?.display_name)
  if (metadataName) return metadataName

  const email = profile?.email ?? user?.email ?? ''
  if (!email) return 'Member'

  return email.split('@')[0]
}