import type { User } from '@supabase/supabase-js'

export type AppRole = 'user' | 'vendor' | 'admin'

export function getUserRole(user: Pick<User, 'app_metadata'> | null | undefined): AppRole {
  const role = user?.app_metadata?.role
  if (role === 'vendor' || role === 'admin') {
    return role
  }

  return 'user'
}

export function getRoleLabel(role: AppRole): string {
  if (role === 'admin') return 'Admin'
  if (role === 'vendor') return 'Vendor'
  return 'Member'
}