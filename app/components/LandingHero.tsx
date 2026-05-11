'use client'

import Link from 'next/link'
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
          <button type="button" className="primary" onClick={onStartRoomRead}>Start your room read</button>
          <a href="#how" className="secondary">See the journey</a>
        </div>

        {user ? (
          <div className="mt-6 max-w-[620px] rounded-[28px] border border-[rgba(181,138,82,0.18)] bg-[rgba(255,253,249,0.82)] p-5 shadow-[0_18px_40px_rgba(28,25,23,0.07)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--terracotta)]">Signed in</p>
                <p className="mt-2 text-lg text-[var(--charcoal)]">
                  {displayName} · {role}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--warm-grey)]">
                  {savedResults
                    ? `Last room read: ${savedResults.roomType} ${savedResults.furnitureType}, ${savedResults.itemCount} shortlisted items.`
                    : 'You are logged in. Start a room read whenever you are ready.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {savedResults ? (
                  <Link href="/result" className="secondary">
                    Resume previous results
                  </Link>
                ) : null}
                <Link href="/account" className="secondary">
                  Open account
                </Link>
                <Link href="/find" className="primary">
                  Continue to room read
                </Link>
              </div>
            </div>

            {savedResults ? (
              <p className="mt-4 text-sm leading-6 text-[var(--warm-grey)]">{savedResults.summary}</p>
            ) : null}
          </div>
        ) : null}

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
          <div className="avatars">
            <div className="av" style={{ background: '#B8935A' }}>AS</div>
            <div className="av" style={{ background: '#5C6B4A' }}>KM</div>
            <div className="av" style={{ background: '#C4623A' }}>RP</div>
            <div className="av" style={{ background: '#8A8178' }}>+58</div>
          </div>
          <p className="sp-text"><strong>4,200+</strong> room-led matches across Mumbai, Pune, Delhi & Bangalore</p>
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
