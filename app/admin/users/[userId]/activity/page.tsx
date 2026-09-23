'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Activity = { id: string; action: string; metadata: Record<string, unknown>; created_at: string }
function label(value: string) { return value.replaceAll('_', ' ') }
function date(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

export default function UserActivityPage({ params }: { params: Promise<{ userId: string }> }) {
  const [userId, setUserId] = useState(''); const [items, setItems] = useState<Activity[]>([]); const [error, setError] = useState('')
  useEffect(() => { void params.then(({ userId: id }) => setUserId(id)) }, [params])
  useEffect(() => { if (!userId) return; void fetch(`/api/admin/users/${userId}/activity`).then(async (response) => { const data = await response.json() as Activity[] & { error?: string }; if (!response.ok) throw new Error(data.error || 'Unable to load activity.'); setItems(data) }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load activity.')) }, [userId])
  return <main className="admin-page"><header className="admin-header"><Link href="/admin/users" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/users" className="admin-nav-link">Users</Link><span className="admin-role-chip">Activity</span></nav></header><div className="admin-shell"><section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">User activity</p><h1>Audit trail.</h1><p>Account access and role actions for this user.</p></div></section>{error ? <div className="admin-config-notice admin-config-error">{error}</div> : <section className="admin-panel"><div className="admin-list">{items.length ? items.map((item) => <div className="admin-list-row" key={item.id}><div><strong>{label(item.action)}</strong><span>{JSON.stringify(item.metadata)}</span></div><time dateTime={item.created_at}>{date(item.created_at)}</time></div>) : <p className="admin-empty">No activity recorded.</p>}</div></section>}</div></main>
}
