'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { fetchOwnProfile, getDisplayName, type AppProfile } from '@/lib/supabase/profiles'
import { getRoleLabel, getUserRole, type AppRole } from '@/lib/supabase/roles'
import { upsertOwnProfileName } from '@/lib/supabase/profiles'
import type { SavedResult, SavedSearch } from '@/lib/types'

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [role, setRole] = useState<AppRole>('user')
  const [savedItemCount, setSavedItemCount] = useState(0)
  const [savedItems, setSavedItems] = useState<SavedResult[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      setUser(currentUser)
      setRole(getUserRole(currentUser))
      setProfile(currentUser ? await fetchOwnProfile(supabase, currentUser.id) : null)

      if (!currentUser) {
        setSavedItems([])
        setSavedSearches([])
        return
      }

      const [{ count }, { data: items }, { data: searches }] = await Promise.all([
        supabase
          .from('saved_results')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUser.id),
        supabase
          .from('saved_results')
          .select('id, product_name, product_brand, product_price, product_url, saved_at')
          .eq('user_id', currentUser.id)
          .order('saved_at', { ascending: false })
          .limit(5),
        supabase
          .from('saved_searches')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      setSavedItemCount(count ?? 0)
      setSavedItems((items ?? []) as SavedResult[])
      setSavedSearches((searches ?? []) as SavedSearch[])
    })
  }, [supabase])

  const displayName = getDisplayName(user, profile)
  const memberSince = useMemo(() => {
    if (!user?.created_at) return 'Member'
    const joined = new Date(user.created_at)
    return `Member since ${joined.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  }, [user?.created_at])

  const topStyle = profile?.role === 'admin' ? 'Power user' : 'Adaptive'

  function handleEditClick() {
    setEditFullName(profile?.full_name ?? displayName)
    setIsEditMode(true)
  }

  async function handleSaveProfile() {
    if (!user || !editFullName.trim()) return
    setIsSaving(true)
    try {
      await upsertOwnProfileName(supabase, user, editFullName)
      setProfile({ ...profile!, full_name: editFullName.trim() })
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setIsEditMode(false)
    setEditFullName('')
  }

  return (
    <>
      <header className="site-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'absolute', left: '24px' }}>
          <Link href="/" className="logo logo-active">Furnish<span>AI</span></Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'absolute', paddingTop: '22px' }}>
          <Link href="/" className="btn-skip">Home</Link>
          <Link href="/find" className="btn-skip">← New search</Link>
        </div>
      </header>

      <main className="account-page-shell">
        <div className="account-page-inner">
        {isEditMode ? (
          <section className="account-edit-panel">
            <div className="account-edit-header">
              <h2>Edit Profile</h2>
              <button onClick={handleCancelEdit} className="account-edit-close">✕</button>
            </div>
            <div className="account-edit-form">
              <div className="account-form-group">
                <label htmlFor="fullName">Display name</label>
                <input
                  id="fullName"
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="account-form-input"
                />
              </div>
              <div className="account-form-group">
                <label>Email</label>
                <div className="account-form-value">{user?.email ?? 'Loading...'}</div>
              </div>
              <div className="account-form-actions">
                <button onClick={handleSaveProfile} disabled={isSaving} className="btn-next">
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
                <button onClick={handleCancelEdit} className="btn-skip">Cancel</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="account-hero">
            <div className="account-hero-top">
              <div className="account-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</div>
              <div className="account-identity">
                <p className="account-kicker">Account overview</p>
                <h1 className="account-name">{displayName}</h1>
                <p className="account-meta">{user?.email ?? 'Loading account email'} · {memberSince}</p>
              </div>
              <div className="account-hero-actions">
                <button onClick={handleEditClick} className="account-edit-button">✎ Edit</button>
                <span className="account-role-chip">{getRoleLabel(role)}</span>
              </div>
            </div>

          <div className="account-stat-grid">
            <Link href="/saved" className="account-stat-card account-stat-link">
              <span className="account-stat-value">{savedItemCount}</span>
              <span className="account-stat-label">Saved items</span>
            </Link>
            <div className="account-stat-card">
              <span className="account-stat-value">{savedSearches.length}</span>
              <span className="account-stat-label">Saved searches</span>
            </div>
            <div className="account-stat-card">
              <span className="account-stat-value">{topStyle}</span>
              <span className="account-stat-label">Personalization mode</span>
            </div>
          </div>

          <div className="account-action-row">
            {(role === 'vendor' || role === 'admin') ? <Link href="/vendor" className="btn-skip">Vendor studio</Link> : null}
            {role === 'admin' ? <Link href="/admin" className="btn-skip">Admin console</Link> : null}
          </div>
        </section>
        )}

        {!isEditMode && (
        <section className="account-content-grid">
          <article className="account-panel">
            <div className="account-panel-head">
              <p className="account-kicker">Recent searches</p>
              <h2 className="account-panel-title">Your saved search snapshots</h2>
            </div>
            <p className="account-panel-copy">
              Save captures your shortlist context so you can resume quickly, compare options, and continue from where you left off.
            </p>
            <div className="account-search-list">
              {savedSearches.length > 0 ? savedSearches.map((search) => (
                <div key={search.id} className="account-search-row">
                  <div>
                    <p className="account-search-title">
                      {(search.furniture_type || 'Furniture').toString()} · {(search.room_type || 'Room').toString()}
                    </p>
                    <p className="account-search-sub">
                      {(search.city || 'City').toString()} · {search.result_count} results · budget ₹{(search.budget ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <Link href="/result" className="account-inline-link">Open</Link>
                </div>
              )) : (
                <div className="account-empty-state">No saved searches yet. Run a room read and tap Save to build your search library.</div>
              )}
            </div>
          </article>

          <article className="account-panel">
            <div className="account-panel-head">
              <p className="account-kicker">Bookmarked items</p>
              <h2 className="account-panel-title">Your recent saved furniture</h2>
            </div>
            <p className="account-panel-copy">
              Quickly reopen the pieces you bookmarked and continue comparing options from where you left off.
            </p>
            <div className="account-bookmark-list">
              {savedItems.length > 0 ? savedItems.map((item) => (
                <div key={item.id} className="account-bookmark-row">
                  <div>
                    <p className="account-bookmark-title">{item.product_name}</p>
                    <p className="account-bookmark-sub">
                      {item.product_brand} · ₹{item.product_price.toLocaleString('en-IN')} · saved {new Date(item.saved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  {item.product_url ? (
                    <a href={item.product_url} target="_blank" rel="noreferrer" className="account-inline-link">View</a>
                  ) : (
                    <Link href="/saved" className="account-inline-link">Open saved</Link>
                  )}
                </div>
              )) : (
                <div className="account-empty-state">No bookmarked items yet. Save any recommended piece and it will appear here.</div>
              )}
            </div>
            <div className="account-bookmark-footer">
              <Link href="/saved" className="btn-next">See all saved items</Link>
            </div>
          </article>
        </section>
        )}
      </div>
    </main>

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
              <Link href="/find" className="home-footer-link">Find Furniture</Link>
              <Link href="/saved" className="home-footer-link">Saved</Link>
            </div>

            <div className="home-footer-link-column">
              <span className="home-footer-label">Company</span>
              <Link href="/vendor" className="home-footer-link">Vendors</Link>
              <Link href="/admin" className="home-footer-link">Admin</Link>
            </div>

            <div className="home-footer-link-column">
              <span className="home-footer-label">Account</span>
              {user ? (
                <form action="/auth/signout" method="post" style={{ margin: 0 }}>
                  <button type="submit" className="home-footer-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                    Sign Out
                  </button>
                </form>
              ) : (
                <>
                  <Link href="/login" className="home-footer-link">Login</Link>
                  <Link href="/signup" className="home-footer-link">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="home-footer-bottom">
          <p>© 2026 FurnishAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
    </>
  )
}