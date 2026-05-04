'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
          <a href="#how" className="nav-overlay-link" onClick={() => setMenuOpen(false)}>
            <span className="nav-link-index">01</span>
            <span className="nav-link-text">The Journey</span>
          </a>
          <a href="#about" className="nav-overlay-link" onClick={() => setMenuOpen(false)}>
            <span className="nav-link-index">02</span>
            <span className="nav-link-text">About</span>
          </a>
          <Link href="/find" className="nav-overlay-link nav-overlay-link--cta" onClick={() => setMenuOpen(false)}>
            <span className="nav-link-index">03</span>
            <span className="nav-link-text">Start matching</span>
          </Link>
        </nav>

        <div className="nav-overlay-footer">
          <span>Room-first furniture matching.</span>
        </div>
      </div>
    </>
  )
}
