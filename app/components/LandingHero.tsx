'use client'

import Link from 'next/link'

export function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="hero-left">
        <div className="hero-badge">AI-Powered Furniture Matching · Mumbai</div>
        <h1 className="hero-h1">Furniture that <em>fits</em> your room exactly.</h1>
        <p className="hero-sub">Answer 4 questions. Upload a room photo. Get 10 ranked recommendations with a personal explanation of why each one works for your space, budget, and life.</p>

        <div className="hero-cta">
          <Link href="/find" className="primary">Find my furniture — It's free</Link>
          <button className="secondary" onClick={() => { /* TODO: scroll to features */ }}>▶ See how it works</button>
        </div>

        <div className="hero-stat-rail">
          <div className="hero-stat-card">
            <span className="hero-stat-label">Room-aware</span>
            <strong>4 views</strong>
            <span>Upload a few angles and let AI read layout, palette, and constraints.</span>
          </div>
          <div className="hero-stat-card accent">
            <span className="hero-stat-label">Shortlist quality</span>
            <strong>Why it fits</strong>
            <span>Every recommendation arrives with reasoning, not just ranking.</span>
          </div>
        </div>

        <div className="social-proof">
          <div className="avatars">
            <div className="av" style={{ background: '#B8935A' }}>AS</div>
            <div className="av" style={{ background: '#5C6B4A' }}>KM</div>
            <div className="av" style={{ background: '#C4623A' }}>RP</div>
            <div className="av" style={{ background: '#8A8178' }}>+58</div>
          </div>
          <p className="sp-text"><strong>4,200+</strong> families matched in Mumbai, Pune, Delhi & Bangalore</p>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-ambient-card hero-ambient-top">
          <span className="hero-ambient-kicker">Room read</span>
          <strong>Warm neutrals · open walkway · modern profile</strong>
        </div>
        <div className="hero-room-card">
          <div className="hrc-img">
            🛋️
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: '10px', fontWeight: 500, padding: '4px 8px', borderRadius: '4px' }}>Modern sofa · Living room</div>
          </div>
          <div className="hrc-name">Oslo 3-Seater Sofa</div>
          <div className="hrc-brand">Urban Ladder · Warm Linen</div>
          <div className="hrc-why">
            ✦ Fits your 14×12 ft living room with 60cm clearance. Linen matches your cream walls. High durability rating for your 2 kids.
          </div>
          <div className="hrc-bottom">
            <div className="hrc-price">₹32,500</div>
            <div className="hrc-rating">★ 4.8 · 218 reviews</div>
          </div>
        </div>
        <div className="hero-ambient-card hero-ambient-bottom">
          <span className="hero-ambient-kicker">Decision support</span>
          <strong>Budget, room, delivery city, and preferences stay in sync.</strong>
        </div>
      </div>
    </section>
  )
}
