'use client'

import type { User } from '@supabase/supabase-js'
import type { AppRole } from '@/lib/supabase/roles'
import type { SavedResultSummary } from '@/lib/utils/saved-results'

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
  return (
    <section className="landing-hero">
      <div className="hero-orbit hero-orbit-left" />
      <div className="hero-orbit hero-orbit-right" />
      <div className="hero-left">
        <div className="hero-badge"><span className="hero-badge-dot" />A room-aware way to choose furniture</div>
        <h1 className="hero-h1">The shortlist begins with the <em>room.</em></h1>
        <p className="hero-sub">Upload your space, answer a few focused questions, and get furniture recommendations that feel considered, calm, and actually right for the room.</p>

        <div className="hero-cta">
          <button
            type="button"
            className="primary"
            onClick={onStartRoomRead}
          >
            Start your room read
          </button>
          <a href="#how" className="secondary">See the journey</a>
        </div>

        <div className="hero-journey-strip">
          <div className="hero-journey-step">
            <span className="hero-journey-index hero-journey-index--terracotta">I</span>
            <div>
              <strong>Show the room</strong>
              <span>Upload a few angles</span>
            </div>
          </div>
          <div className="hero-journey-step">
            <span className="hero-journey-index hero-journey-index--gold">II</span>
            <div>
              <strong>Refine what matters</strong>
              <span>Answer only ranking questions</span>
            </div>
          </div>
          <div className="hero-journey-step">
            <span className="hero-journey-index hero-journey-index--moss">III</span>
            <div>
              <strong>Review the shortlist</strong>
              <span>Compare, save, and share</span>
            </div>
          </div>
        </div>

        <div className="social-proof">
          <p className="hero-sub">Currently in early access · Mumbai, Pune, Delhi & Bangalore</p>
        </div>
      </div>

      <div className="hero-right" aria-hidden="true">
        <div className="hero-atmosphere-card hero-atmosphere-primary">
          <div className="hero-atmosphere-label">Why it fits</div>
          <div className="hero-atmosphere-title">A calmer, room-aware shortlist</div>
          <p className="hero-atmosphere-copy">The system uses the room first, then asks a few questions only when they can change the ranking.</p>
        </div>
      </div>
    </section>
  )
}
