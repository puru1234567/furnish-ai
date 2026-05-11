import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { AppRole } from '@/lib/supabase/roles'

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

export async function updateOwnProfileName(
  supabase: SupabaseClient,
  userId: string,
  fullName: string
): Promise<void> {
  const trimmedName = fullName.trim()
  if (!trimmedName) return

  await supabase
    .from('profiles')
    .update({ full_name: trimmedName })
    .eq('id', userId)
}

export function getDisplayName(user: User | null, profile: AppProfile | null): string {
  const fullName = profile?.full_name?.trim()
  if (fullName) return fullName

  const email = profile?.email ?? user?.email ?? ''
  if (!email) return 'Member'

  return email.split('@')[0]
}