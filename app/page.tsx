'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { fetchOwnProfile, getDisplayName, type AppProfile } from '@/lib/supabase/profiles'
import { getUserRole, type AppRole } from '@/lib/supabase/roles'
import { readSavedResultSummary, type SavedResultSummary } from '@/lib/utils/saved-results'
import { LandingHeader } from './components/LandingHeader'
import { LandingHero } from './components/LandingHero'
import { FeaturesStrip } from './components/FeaturesStrip'
import { AuthModal } from './components/AuthModal'

type AuthMode = 'login' | 'signup'
type ToastState = { kind: 'login' | 'signup'; message: string } | null

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [role, setRole] = useState<AppRole>('user')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [nextPath, setNextPath] = useState('/find')
  const [savedResults, setSavedResults] = useState<SavedResultSummary | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  async function syncUserState(currentUser: User | null) {
    setUser(currentUser)
    setRole(getUserRole(currentUser))
    setSavedResults(currentUser ? readSavedResultSummary() : null)

    if (!currentUser) {
      setProfile(null)
      return null
    }

    const nextProfile = await fetchOwnProfile(supabase, currentUser.id)
    setProfile(nextProfile)
    return nextProfile
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      void syncUserState(currentUser)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      void syncUserState(nextUser)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')
    const next = params.get('next')

    if (auth === 'login' || auth === 'signup') {
      setAuthMode(auth)
      setAuthModalOpen(true)
    }

    if (next) {
      setNextPath(next)
    }
  }, [])

  function clearAuthQueryParams() {
    const params = new URLSearchParams(window.location.search)
    params.delete('auth')
    params.delete('next')
    const query = params.toString()
    window.history.replaceState({}, '', query ? `/?${query}` : '/')
  }

  function openAuthModal(mode: AuthMode, requestedPath = '/find') {
    setAuthMode(mode)
    setNextPath(requestedPath)
    setAuthModalOpen(true)
    const params = new URLSearchParams(window.location.search)
    params.set('auth', mode)
    params.set('next', requestedPath)
    window.history.replaceState({}, '', `/?${params.toString()}`)
  }

  function closeAuthModal() {
    setAuthModalOpen(false)
    clearAuthQueryParams()
  }

  function handleStartRoomRead() {
    if (user) {
      window.location.href = '/find'
      return
    }

    openAuthModal('login', '/find')
  }

  function handleSignedIn(eventType: 'login' | 'signup') {
    void supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      const nextProfile = await syncUserState(currentUser)
      const displayName = getDisplayName(currentUser, nextProfile)
      setToast({
        kind: eventType,
        message: eventType === 'signup'
          ? `Welcome, ${displayName}. Your account is ready.`
          : `Welcome back, ${displayName}.`,
      })
      closeAuthModal()
    })
  }

  const displayName = getDisplayName(user, profile)

  return (
    <>
      <LandingHeader
        user={user}
        displayName={displayName}
        role={role}
        hasSavedResults={Boolean(savedResults)}
        onOpenLogin={() => openAuthModal('login')}
        onOpenSignup={() => openAuthModal('signup')}
        onStartMatching={handleStartRoomRead}
      />
      <LandingHero
        user={user}
        displayName={displayName}
        role={role}
        savedResults={savedResults}
        onStartRoomRead={handleStartRoomRead}
      />
      <FeaturesStrip />
      {toast ? (
        <div className={`auth-toast auth-toast--${toast.kind}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onClose={closeAuthModal}
        onModeChange={setAuthMode}
        onSignedIn={handleSignedIn}
      />
    </>
  )
}
