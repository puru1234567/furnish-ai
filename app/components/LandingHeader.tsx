'use client'

import Link from 'next/link'

export function LandingHeader() {
  return (
    <header className="site-header">
      <div className="logo-lockup">
        <div className="logo">Furnish<span>AI</span></div>
        <div className="logo-sub">Smart furniture recommendations for real rooms</div>
      </div>
      <nav>
        <a href="#how">How it works</a>
        <a href="#cities">Cities</a>
        <a href="#about">About</a>
      </nav>
      <Link href="/find" className="cta-btn">Find my furniture →</Link>
    </header>
  )
}
