'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { AdminWebhookEvent } from '@/lib/admin/integrations'

function date(value: string | null) { return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }

export default function AdminWebhooksPage() {
  const [items, setItems] = useState<AdminWebhookEvent[]>([]); const [error, setError] = useState('')
  useEffect(() => { void fetch('/api/admin/integrations/webhooks').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load webhook events.'); setItems(data.items ?? []) }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load webhook events.')) }, [])
  return <main className="admin-page"><header className="admin-header"><Link href="/admin/integrations" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/integrations" className="admin-nav-link">Integrations</Link><span className="admin-role-chip">Webhooks</span></nav></header><div className="admin-shell">
    <section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">Admin portal / Phase 11</p><h1>Webhook events.</h1><p>Review inbound provider events across every vendor integration.</p></div></section>
    {error ? <div className="admin-config-notice admin-config-error">{error}</div> : <section className="admin-panel admin-vendor-table-panel">{items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Received</th><th>Integration</th><th>Event</th><th>Verified</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{date(item.receivedAt)}</td><td><Link href={`/admin/integrations/${item.integrationId}`} className="admin-text-link">{item.integrationId.slice(0, 8)}</Link></td><td>{item.eventType ?? '—'}</td><td>{item.signatureVerified ? 'Verified' : 'Unverified'}</td><td>{item.processingStatus}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No webhook events recorded yet.</p>}</section>}
  </div></main>
}
