'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { AdminIntegration, IntegrationHealth, IntegrationListResult } from '@/lib/admin/integrations'

function label(value: string) { return value.replaceAll('_', ' ') }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }

export function IntegrationsWorkspace() {
  const [vendorId, setVendorId] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const [result, setResult] = useState<IntegrationListResult | null>(null); const [health, setHealth] = useState<IntegrationHealth | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' }); if (vendorId) params.set('vendorId', vendorId); if (status) params.set('status', status)
      const [listRes, healthRes] = await Promise.all([fetch(`/api/admin/integrations?${params}`), fetch('/api/admin/integrations/health')])
      const [list, healthData] = await Promise.all([listRes.json(), healthRes.json()])
      if (!listRes.ok) throw new Error(list.error || 'Unable to load integrations.')
      if (!healthRes.ok) throw new Error(healthData.error || 'Unable to load integration health.')
      setResult(list); setHealth(healthData); setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load integrations.') } finally { setLoading(false) }
  }, [page, status, vendorId])
  useEffect(() => { void load() }, [load])

  return <main className="admin-page"><header className="admin-header"><Link href="/admin" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/integrations/webhooks" className="admin-nav-link">Webhooks</Link><Link href="/admin/settings" className="admin-nav-link">Settings</Link><span className="admin-role-chip">Integrations</span></nav></header><div className="admin-shell">
    <section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">Admin portal / Phase 11</p><h1>Platform integrations.</h1><p>Oversee vendor catalog feeds and webhooks without exposing credentials or bypassing sync business rules.</p></div></section>
    {error ? <div className="admin-config-notice admin-config-error" role="alert">{error}</div> : null}
    <div className="admin-metric-groups"><div className="admin-metric-group"><h3>Integration health</h3><div className="admin-metric-grid">{health ? Object.entries(health).map(([key, value]) => <article className="admin-metric-card" key={key}><span>{label(key)}</span><strong>{value}</strong></article>) : null}</div></div></div>
    <section className="admin-filter-bar"><label><span>Vendor ID</span><input value={vendorId} onChange={(event) => { setPage(1); setVendorId(event.target.value) }} placeholder="Vendor UUID" /></label><label><span>Status</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">All statuses</option>{['disconnected', 'pending_setup', 'connected', 'syncing', 'error', 'paused'].map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label></section>
    <section className="admin-panel admin-vendor-table-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Vendor integrations</p><h2>{result ? `${result.total} integrations` : 'Integrations'}</h2></div><span className="admin-data-note">Credential-free view</span></div>
      {loading ? <p className="admin-empty">Loading integrations...</p> : result?.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Integration</th><th>Vendor</th><th>Status</th><th>Enabled</th><th>Adapter</th><th>Last sync</th><th /></tr></thead><tbody>{result.items.map((item) => <IntegrationRow item={item} key={item.id} />)}</tbody></table></div> : <p className="admin-empty">No integrations match the current filters.</p>}
      <div className="admin-pagination"><button type="button" className="admin-button admin-button-secondary" disabled={!result || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>{result ? `Page ${result.page} of ${result.totalPages}` : 'Page —'}</span><button type="button" className="admin-button admin-button-secondary" disabled={!result || page >= result.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div>
    </section>
  </div></main>
}

function IntegrationRow({ item }: { item: AdminIntegration }) {
  return <tr><td><Link href={`/admin/integrations/${item.id}`} className="admin-table-primary">{item.displayName}</Link><span className="admin-table-secondary">{item.providerKey}</span></td><td>{item.vendorName}</td><td><span className={`admin-status admin-status-${item.status}`}>{label(item.status)}</span></td><td>{item.adminEnabled ? 'Enabled' : <span title={item.disabledReason ?? ''}>Disabled</span>}</td><td>{item.adapterRegistered ? 'Registered' : 'Not configured'}</td><td>{date(item.lastSyncAt)}</td><td><Link href={`/admin/integrations/${item.id}`} className="admin-text-link">Manage</Link></td></tr>
}
