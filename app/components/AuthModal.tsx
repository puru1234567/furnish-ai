'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { upsertOwnProfileName } from '@/lib/supabase/profiles'

type AuthMode = 'login' | 'signup'

interface AuthModalProps {
  isOpen: boolean
  mode: AuthMode
  onClose: () => void
  onModeChange: (mode: AuthMode) => void
  onSignedIn: (eventType: 'login' | 'signup') => void
}

export function AuthModal({
  isOpen,
  mode,
  onClose,
  onModeChange,
  onSignedIn,
}: AuthModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setSuccess(null)
      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSignedIn('login')
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const hasSession = Boolean(data.session)

    if (hasSession) {
      if (data.user && fullName.trim()) {
        await upsertOwnProfileName(supabase, data.user, fullName)
      }
      setLoading(false)
      onSignedIn('signup')
      return
    }

    const { data: loginData, error: autoLoginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!autoLoginError && loginData.user && fullName.trim()) {
      await upsertOwnProfileName(supabase, loginData.user, fullName)
    }

    setLoading(false)

    if (!autoLoginError) {
      onSignedIn('signup')
      return
    }

    setSuccess('Account created. Automatic sign-in is blocked because email confirmation is still enabled in Supabase. Disable Confirm email in Auth settings if you want immediate login after signup.')
  }

  return (
    <div className="auth-modal-root" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <button
        type="button"
        aria-label="Close authentication window"
        className="auth-modal-backdrop"
        onClick={onClose}
      />

      <div className="auth-modal-panel">
        <div className="auth-modal-aside">
          <div>
            <p className="auth-modal-kicker">FurnishAI access</p>
            <h2 id="auth-modal-title" className="auth-modal-aside-title" style={{ fontFamily: 'var(--font-serif)' }}>
              Sign in when you&apos;re ready to start the room read.
            </h2>
          </div>

          <div className="auth-modal-aside-body">
            <div className="auth-modal-aside-card">
              <p className="auth-modal-kicker">What unlocks after login</p>
              <ul className="auth-modal-benefits">
                <li>Room-read recommendations tied to your session</li>
                <li>A quicker return to your last shortlist on the home page</li>
                <li>Role-aware access for vendor and admin portals</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="auth-modal-main">
          <div className="auth-modal-header">
            <div>
              <Link href="/" className="auth-modal-brand" style={{ fontFamily: 'var(--font-serif)' }}>
                FurnishAI
              </Link>
              <p className="auth-modal-copy">
                Stay on the home page, sign in when needed, then continue at your pace.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="auth-modal-close"
              aria-label="Close authentication window"
            >
              ×
            </button>
          </div>

          <div className="auth-modal-toggle">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={`auth-modal-toggle-button${mode === 'login' ? ' auth-modal-toggle-button--active' : ''}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className={`auth-modal-toggle-button${mode === 'signup' ? ' auth-modal-toggle-button--active' : ''}`}
            >
              Sign up
            </button>
          </div>

          <div className="auth-modal-intro">
            <h3 className="auth-modal-title" style={{ fontFamily: 'var(--font-serif)' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h3>
            <p className="auth-modal-copy auth-modal-copy--compact">
              {mode === 'login'
                ? 'Log in, close the window, and continue from the landing page.'
                : 'Create a shopper account here. Vendor and admin access stay invite-only.'}
            </p>
          </div>

          <form className="auth-modal-form" onSubmit={mode === 'login' ? handleLogin : handleSignup}>
            {mode === 'signup' ? (
              <div className="auth-modal-field">
                <label htmlFor="auth-full-name" className="auth-modal-label">
                  Full name
                </label>
                <input
                  id="auth-full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  className="auth-modal-input"
                  placeholder="What should we call you?"
                />
              </div>
            ) : null}

            <div className="auth-modal-field">
              <label htmlFor="auth-email" className="auth-modal-label">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="auth-modal-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="auth-modal-field">
              <label htmlFor="auth-password" className="auth-modal-label">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="auth-modal-input"
                placeholder="Minimum 8 characters"
              />
            </div>

            {mode === 'signup' ? (
              <div className="auth-modal-field">
                <label htmlFor="auth-confirm-password" className="auth-modal-label">
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  className="auth-modal-input"
                  placeholder="Repeat your password"
                />
              </div>
            ) : null}

            {error ? (
              <p className="auth-modal-message auth-modal-message--error">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="auth-modal-message auth-modal-message--success">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="auth-modal-submit"
            >
              {loading ? (mode === 'login' ? 'Logging in…' : 'Creating account…') : (mode === 'login' ? 'Log in' : 'Create account')}
            </button>
          </form>

          <div className="auth-modal-footer-copy">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button type="button" onClick={() => onModeChange('signup')} className="auth-modal-inline-action">
                  Sign up instead
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => onModeChange('login')} className="auth-modal-inline-action">
                  Log in instead
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}