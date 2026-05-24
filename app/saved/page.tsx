import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSavedResults } from '@/lib/services/userDataService'
import { SavedItemActions } from './SavedItemActions'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const savedItems = await getSavedResults(user.id)

  return (
    <>
      <header className="site-header">
        <div className="logo">Furnish<span>AI</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/account" className="btn-skip">Account</Link>
          <Link href="/find" className="btn-skip">← New search</Link>
        </div>
      </header>

      <main className="results-wrapper" style={{ paddingTop: '120px', paddingBottom: '48px' }}>
        <section className="results-main" style={{ width: '100%', maxWidth: '1060px', margin: '0 auto' }}>
          <div className="results-header-shell" style={{ marginBottom: '20px' }}>
            <div className="results-section-title">Your saved pieces</div>
            <div className="results-section-copy">Items you saved across all your searches</div>
          </div>

          {savedItems.length === 0 ? (
            <div className="result-card" style={{ padding: '28px' }}>
              <div className="card-body" style={{ gap: '18px' }}>
                <div className="card-why" style={{ marginBottom: 0 }}>
                  Nothing saved yet — start a room read to find furniture that fits
                </div>
                <div className="card-footer" style={{ justifyContent: 'flex-start' }}>
                  <Link href="/find" className="card-cta">Start room read →</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="results-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {savedItems.map(item => (
                <article key={item.id} className="result-card">
                  <div className="card-body">
                    <div className="card-brand">{item.product_brand}</div>
                    <div className="card-name">{item.product_name}</div>
                    <div className="card-price">{item.product_price.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</div>
                    <div className="card-divider" />
                    <div className="card-why" style={{ marginBottom: 0 }}>
                      <div className="why-label">Why it fits</div>
                      {item.why_it_fits || 'Saved from your recommendation shortlist.'}
                    </div>
                    <div className="card-footer" style={{ gap: '10px' }}>
                      {item.product_url ? (
                        <a href={item.product_url} target="_blank" rel="noreferrer" className="card-cta">
                          View piece →
                        </a>
                      ) : (
                        <span className="card-delivery">Link unavailable</span>
                      )}
                      <SavedItemActions userId={user.id} productId={item.product_id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
