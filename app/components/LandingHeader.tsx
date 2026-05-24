'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AppRole } from '@/lib/supabase/roles'
import { getRoleLabel } from '@/lib/supabase/roles'

type MenuItem = {
  href?: string
  action?: () => void
  label: string
  index: string
  cta?: boolean
}

interface LandingHeaderProps {
  authEnabled: boolean
  user: User | null
  displayName: string
  role: AppRole
  hasSavedResults: boolean
  onOpenLogin: () => void
  onOpenSignup: () => void
  onStartMatching: () => void
}

export function LandingHeader({
  authEnabled,
  user,
  displayName,
  role,
  hasSavedResults,
  onOpenLogin,
  onOpenSignup,
  onStartMatching,
}: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isSignedIn = authEnabled && Boolean(user)

  const menuItems: MenuItem[] = isSignedIn
    ? (() => {
        const items: MenuItem[] = [
          { href: '/find', label: 'Start matching', index: '01', cta: true },
          { href: '/saved', label: 'Saved', index: '02' },
        ]

        if (hasSavedResults) {
          items.push({ href: '/result', label: 'Saved results', index: '03' })
        }

        items.push({ href: '/account', label: 'Account', index: hasSavedResults ? '04' : '03' })

        if (role === 'vendor' || role === 'admin') {
          items.push({ href: '/vendor', label: 'Vendor studio', index: hasSavedResults ? '05' : '04' })
        }

        if (role === 'admin') {
          items.push({ href: '/admin', label: 'Admin console', index: hasSavedResults ? '06' : '05' })
        }

        return items
      })()
    : [
        { href: '#how', label: 'The Journey', index: '01' },
        { href: '#about', label: 'About', index: '02' },
        { action: onStartMatching, label: 'Start matching', index: '03', cta: true },
      ]

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('.landing-hero') as HTMLElement | null
      const scrollLimit = hero ? Math.max(300, hero.offsetHeight * 0.48) : 480
      const progress = Math.min(window.scrollY / scrollLimit, 1)

      document.documentElement.style.setProperty('--landing-brand-progress', progress.toFixed(3))
      setScrolled(progress > 0.92)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.documentElement.style.setProperty('--landing-brand-progress', '0')
    }
  }, [])

  return (
    <>
      {/* Single fixed brand wordmark — travels from hero-size to header-size */}
      <Link
        href="/"
        className={`brand-wordmark${scrolled ? ' brand-wordmark--scrolled' : ''}`}
        aria-label="Furnish AI home"
      >
        <span className="brand-wordmark-furnish">Furnish</span>
        <span className="brand-wordmark-ai">AI</span>
      </Link>

      {/* Menu button — fixed on page, travels into header just like brand-wordmark */}
      <button
        className={`site-header-menu-btn${menuOpen ? ' site-header-menu-btn--open' : ''}${scrolled ? ' site-header-menu-btn--scrolled' : ''}`}
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation"
      >
        <span className="menu-btn-label">Menu</span>
        <span className="menu-btn-icon" aria-hidden="true">
          <span /><span />
        </span>
      </button>

      {authEnabled ? (
        <div className={`site-header-auth-rail${scrolled ? ' site-header-auth-rail--scrolled' : ''}`}>
          {isSignedIn ? (
            <>
              <span className="site-header-user-label">
                <span className="site-header-user-icon">👤</span>
                <span className="site-header-user-name">{displayName}</span>
              </span>
              <form action="/auth/signout" method="post">
                <button type="submit" className="site-header-auth-link site-header-auth-link--button">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <button type="button" className="site-header-auth-link site-header-auth-link--button" onClick={onOpenLogin}>
                Log in
              </button>
              <button type="button" className="site-header-auth-link site-header-auth-link--primary" onClick={onOpenSignup}>
                Sign up
              </button>
            </>
          )}
        </div>
      ) : null}

      <header className={`site-header site-header--landing${scrolled ? ' site-header--scrolled' : ''}${menuOpen ? ' site-header--menu-open' : ''}`}>
        {/* Invisible placeholder keeps the 3-column grid intact */}
        <div className="site-header-logo-placeholder" aria-hidden="true" />
      </header>

      {/* Full overlay nav */}
      <div
        className={`nav-overlay${menuOpen ? ' nav-overlay--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="nav-overlay-gradient nav-overlay-gradient--terracotta" />
        <div className="nav-overlay-gradient nav-overlay-gradient--moss" />
        <div className="nav-overlay-gradient nav-overlay-gradient--gold" />
        <button
          className="nav-overlay-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        >
          <span>Close</span>
          <span className="close-icon" aria-hidden="true">✕</span>
        </button>

        <nav className="nav-overlay-links">
          {menuItems.map(item =>
            item.href?.startsWith('#') ? (
              <a key={item.label} href={item.href} className={`nav-overlay-link${item.cta ? ' nav-overlay-link--cta' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-link-index">{item.index}</span>
                <span className="nav-link-text">{item.label}</span>
              </a>
            ) : item.href ? (
              <Link key={item.label} href={item.href} className={`nav-overlay-link${item.cta ? ' nav-overlay-link--cta' : ''}`} onClick={() => setMenuOpen(false)}>
                <span className="nav-link-index">{item.index}</span>
                <span className="nav-link-text">{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`nav-overlay-link${item.cta ? ' nav-overlay-link--cta' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setMenuOpen(false)
                  item.action?.()
                }}
              >
                <span className="nav-link-index">{item.index}</span>
                <span className="nav-link-text">{item.label}</span>
              </button>
            )
          )}
        </nav>

        <div className="nav-overlay-footer">
          <span>{isSignedIn ? `${getRoleLabel(role)} navigation active.` : 'Room-first furniture matching.'}</span>
        </div>
      </div>
    </>
  )
}
