'use client'

import type { User } from '@supabase/supabase-js'
import type { AppRole } from '@/lib/supabase/roles'
import type { SavedResultSummary } from '@/lib/utils/saved-results'
import { Hero } from './hero/Hero'

interface LandingHeroProps {
  user: User | null
  displayName: string
  role: AppRole
  savedResults: SavedResultSummary | null
  onStartRoomRead: () => void
}

export function LandingHero({
  user,
  displayName,
  role,
  savedResults,
  onStartRoomRead,
}: LandingHeroProps) {
  const resolvedDisplayName = user ? displayName : 'there'

  // Keep props consumed here to preserve behavior and future extension points.
  void role
  void savedResults

  return (
    <Hero
      displayName={resolvedDisplayName}
      onStartRoomRead={onStartRoomRead}
    />
  )
}
