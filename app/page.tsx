'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isAuthEnabled } from '@/lib/config/auth-config'
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
  const authEnabled = isAuthEnabled()
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
    if (!authEnabled) {
      setUser(null)
      setProfile(null)
      setRole('user')
      setSavedResults(readSavedResultSummary())
      return
    }

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      void syncUserState(currentUser)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      void syncUserState(nextUser)
    })

    return () => subscription.unsubscribe()
  }, [authEnabled, supabase])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!authEnabled) {
      clearAuthQueryParams()
      setAuthModalOpen(false)
      return
    }

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
  }, [authEnabled])

  function clearAuthQueryParams() {
    const params = new URLSearchParams(window.location.search)
    params.delete('auth')
    params.delete('next')
    const query = params.toString()
    window.history.replaceState({}, '', query ? `/?${query}` : '/')
  }

  function openAuthModal(mode: AuthMode, requestedPath = '/find') {
    if (!authEnabled) {
      window.location.href = requestedPath
      return
    }

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
    if (!authEnabled || user) {
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
    <div className="home-page-wrapper">
      <LandingHeader
        authEnabled={authEnabled}
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

      <section className="home-insert home-stats-block" aria-label="Platform highlights">
        <div className="home-insert-shell">
          <div className="home-insert-kicker">Snapshot</div>
          <h2 className="home-insert-title">Signals that keep the shortlist practical</h2>
          <div className="home-stats-grid">
            <article className="home-stat-card">
              <div className="home-stat-value">4</div>
              <div className="home-stat-label">Room angles captured before scoring</div>
            </article>
            <article className="home-stat-card">
              <div className="home-stat-value">3</div>
              <div className="home-stat-label">Focused rounds from room read to shortlist</div>
            </article>
            <article className="home-stat-card">
              <div className="home-stat-value">1</div>
              <div className="home-stat-label">Unified shortlist view for compare and save</div>
            </article>
            <article className="home-stat-card">
              <div className="home-stat-value">100%</div>
              <div className="home-stat-label">Recommendations anchored to room context</div>
            </article>
          </div>
        </div>
      </section>

      <section className="home-insert home-categories-block" aria-label="Furniture category shortcuts">
        <div className="home-insert-shell">
          <div className="home-insert-kicker">Category shortcuts</div>
          <h2 className="home-insert-title">Start from the category you have in mind</h2>
          <p className="home-insert-copy">These shortcuts keep the first step focused while the room analysis handles fit and constraints.</p>
          <div className="home-shortcuts-grid" role="list" aria-label="Category shortcuts list">
            <span className="home-shortcut-pill" role="listitem">Sofas and sectionals</span>
            <span className="home-shortcut-pill" role="listitem">Beds and storage beds</span>
            <span className="home-shortcut-pill" role="listitem">Dining tables</span>
            <span className="home-shortcut-pill" role="listitem">Study desks</span>
            <span className="home-shortcut-pill" role="listitem">TV units</span>
            <span className="home-shortcut-pill" role="listitem">Accent chairs</span>
          </div>
        </div>
      </section>

      <FeaturesStrip />

      <footer className="home-footer-block" aria-label="Site footer">
        <div className="home-footer-shell">
          <div className="home-footer-main">
            <div className="home-footer-brand">
              <div className="home-footer-logo-row">
                <span className="home-footer-logo-mark" aria-hidden="true">✦</span>
                <span className="home-footer-logo-text">FurnishAI</span>
              </div>
              <p className="home-footer-copy">
                AI-powered furniture discovery. Find pieces that actually fit your room, style, and constraints.
              </p>
            </div>

            <div className="home-footer-links-grid">
              <div className="home-footer-link-column">
                <span className="home-footer-label">Product</span>
                <a href="/find" className="home-footer-link">Find Furniture</a>
                <a href="/saved" className="home-footer-link">Saved</a>
              </div>

              <div className="home-footer-link-column">
                <span className="home-footer-label">Company</span>
                <a href="/vendor" className="home-footer-link">Vendors</a>
                <a href="/admin" className="home-footer-link">Admin</a>
              </div>

              <div className="home-footer-link-column">
                <span className="home-footer-label">Account</span>
                <a href="/login" className="home-footer-link">Login</a>
                <a href="/signup" className="home-footer-link">Sign Up</a>
              </div>
            </div>
          </div>

          <div className="home-footer-bottom">
            <p>© 2026 FurnishAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {authEnabled && toast ? (
        <div className={`auth-toast auth-toast--${toast.kind}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      {authEnabled ? (
        <AuthModal
          isOpen={authModalOpen}
          mode={authMode}
          onClose={closeAuthModal}
          onModeChange={setAuthMode}
          onSignedIn={handleSignedIn}
        />
      ) : null}
    </div>
  )
}
