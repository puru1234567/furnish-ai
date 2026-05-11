'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { fetchOwnProfile, getDisplayName, type AppProfile } from '@/lib/supabase/profiles'
import { getRoleLabel, getUserRole, type AppRole } from '@/lib/supabase/roles'
import { readSavedResultSummary, type SavedResultSummary } from '@/lib/utils/saved-results'

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [role, setRole] = useState<AppRole>('user')
  const [savedResults, setSavedResults] = useState<SavedResultSummary | null>(null)

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      setUser(currentUser)
      setRole(getUserRole(currentUser))
      setProfile(currentUser ? await fetchOwnProfile(supabase, currentUser.id) : null)
      setSavedResults(readSavedResultSummary())
    })
  }, [supabase])

  const displayName = getDisplayName(user, profile)

  return (
    <main className="min-h-screen px-6 py-24" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--terracotta)]">Account</p>
            <h1 className="mt-3 text-5xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Your FurnishAI workspace
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--warm-grey)]">
              Stay anchored to the landing flow, but use this workspace to revisit results and jump into your role-specific tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="hero-account-chip">{getRoleLabel(role)}</span>
            <Link href="/" className="btn-skip">Home</Link>
            <Link href="/find" className="btn-next">Start room read</Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-[rgba(181,138,82,0.16)] bg-[rgba(255,253,249,0.86)] p-8 shadow-[0_24px_60px_rgba(28,25,23,0.08)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--terracotta)]">Profile</p>
            <h2 className="mt-4 text-3xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-serif)' }}>
              {displayName}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--warm-grey)]">
              Signed in as {getRoleLabel(role).toLowerCase()}. Vendor and admin surfaces become available here automatically when the role changes in Supabase.
            </p>
            <p className="mt-3 text-sm text-[var(--warm-grey)]">
              {user?.email ?? 'Loading account email'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn-skip">Log out</button>
              </form>
              {(role === 'vendor' || role === 'admin') ? <Link href="/vendor" className="btn-skip">Vendor studio</Link> : null}
              {role === 'admin' ? <Link href="/admin" className="btn-skip">Admin console</Link> : null}
            </div>
          </section>

          <section className="rounded-[32px] border border-[rgba(181,138,82,0.16)] bg-[rgba(255,253,249,0.86)] p-8 shadow-[0_24px_60px_rgba(28,25,23,0.08)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--terracotta)]">Previous room read</p>
            {savedResults ? (
              <>
                <h2 className="mt-4 text-3xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {savedResults.roomType} · {savedResults.furnitureType}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--warm-grey)]">
                  {savedResults.summary}
                </p>
                <p className="mt-4 text-sm text-[var(--charcoal)]">
                  {savedResults.itemCount} shortlisted items are ready to review.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/result" className="btn-next">Open saved results</Link>
                  <Link href="/find" className="btn-skip">Run a fresh room read</Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-3xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  No saved shortlist yet
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--warm-grey)]">
                  Complete one room read and the latest shortlist will appear here so users can immediately tell they are signed in and have history.
                </p>
                <div className="mt-8">
                  <Link href="/find" className="btn-next">Start your first room read</Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}