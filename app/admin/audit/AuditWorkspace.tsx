'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { AuditListResult, AuditSeverity } from '@/lib/admin/audit'

function date(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatValue(value: unknown) { if (value === null || value === undefined || value === '') return '—'; return typeof value === 'string' ? value : JSON.stringify(value) }

export function AuditWorkspace() {
  const [actorId, setActorId] = useState(''); const [vendorId, setVendorId] = useState(''); const [action, setAction] = useState(''); const [entityType, setEntityType] = useState(''); const [severity, setSeverity] = useState<AuditSeverity | ''>(''); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState(''); const [page, setPage] = useState(1)
  const [result, setResult] = useState<AuditListResult | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' })
      if (actorId) params.set('actorId', actorId); if (vendorId) params.set('vendorId', vendorId); if (action) params.set('action', action); if (entityType) params.set('entityType', entityType); if (severity) params.set('severity', severity)
      if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString()); if (dateTo) params.set('dateTo', new Date(dateTo).toISOString())
      const response = await fetch(`/api/admin/audit?${params}`); const data = await response.json() as AuditListResult & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Unable to load audit events.'); setResult(data); setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load audit events.') } finally { setLoading(false) }
  }, [action, actorId, dateFrom, dateTo, entityType, page, severity, vendorId])
  useEffect(() => { void load() }, [load])

  function resetPage() { setPage(1) }
  const exportParams = new URLSearchParams(); if (actorId) exportParams.set('actorId', actorId); if (vendorId) exportParams.set('vendorId', vendorId); if (action) exportParams.set('action', action); if (entityType) exportParams.set('entityType', entityType); if (severity) exportParams.set('severity', severity); if (dateFrom) exportParams.set('dateFrom', new Date(dateFrom).toISOString()); if (dateTo) exportParams.set('dateTo', new Date(dateTo).toISOString())

  return <main className="admin-page"><header className="admin-header"><Link href="/admin" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/analytics" className="admin-nav-link">Analytics</Link><span className="admin-role-chip">Audit center</span></nav></header><div className="admin-shell">
    <section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">Admin portal / Phase 10</p><h1>Audit center.</h1><p>Append-only record of administrative actions across vendors, products, users, and platform configuration.</p></div><Link href={`/api/admin/audit/export?${exportParams}`} className="admin-button admin-button-secondary">Export CSV</Link></section>
    <section className="admin-filter-bar">
      <label><span>User (actor ID)</span><input value={actorId} onChange={(event) => { resetPage(); setActorId(event.target.value) }} placeholder="Admin user UUID" /></label>
      <label><span>Vendor ID</span><input value={vendorId} onChange={(event) => { resetPage(); setVendorId(event.target.value) }} placeholder="Vendor UUID" /></label>
      <label><span>Action contains</span><input value={action} onChange={(event) => { resetPage(); setAction(event.target.value) }} placeholder="e.g. catalog.approve" /></label>
      <label><span>Entity type</span><select value={entityType} onChange={(event) => { resetPage(); setEntityType(event.target.value) }}><option value="">All entities</option>{['vendor', 'product', 'vendor_onboarding', 'vendor_document', 'catalog_import', 'bulk_job', 'user', 'support_or_notification'].map((item) => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
      <label><span>Severity</span><select value={severity} onChange={(event) => { resetPage(); setSeverity(event.target.value as AuditSeverity | '') }}><option value="">All severities</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label>
      <label><span>From</span><input type="date" value={dateFrom} onChange={(event) => { resetPage(); setDateFrom(event.target.value) }} /></label>
      <label><span>To</span><input type="date" value={dateTo} onChange={(event) => { resetPage(); setDateTo(event.target.value) }} /></label>
    </section>
    {error ? <div className="admin-config-notice admin-config-error" role="alert">{error}</div> : null}
    <section className="admin-panel admin-vendor-table-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Append-only log</p><h2>{result ? `${result.total} events` : 'Audit events'}</h2></div><span className="admin-data-note">Protected from edits</span></div>
      {loading ? <p className="admin-empty">Loading audit events...</p> : result?.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Vendor</th><th>Severity</th><th>Previous → New</th><th>Reason</th></tr></thead><tbody>{result.items.map((event) => <tr key={event.id}><td>{date(event.createdAt)}</td><td><span className="admin-table-secondary">{event.actorId.slice(0, 8)}</span></td><td>{event.action}</td><td>{event.entityType}<span className="admin-table-secondary">{event.entityId?.slice(0, 8) ?? '—'}</span></td><td>{event.vendorId ? event.vendorId.slice(0, 8) : '—'}</td><td><span className={`admin-status admin-status-${event.severity}`}>{event.severity}</span></td><td>{formatValue(event.previousValue)} → {formatValue(event.newValue)}</td><td>{event.reason ?? '—'}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No audit events match the current filters.</p>}
      <div className="admin-pagination"><button type="button" className="admin-button admin-button-secondary" disabled={!result || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>{result ? `Page ${result.page} of ${result.totalPages}` : 'Page —'}</span><button type="button" className="admin-button admin-button-secondary" disabled={!result || page >= result.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div>
    </section>
  </div></main>
}
