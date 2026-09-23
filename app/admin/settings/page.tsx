'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { PlatformSetting } from '@/lib/admin/settings'

function label(value: string) { return value.replaceAll('_', ' '); }

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, PlatformSetting[]> | null>(null); const [drafts, setDrafts] = useState<Record<string, string>>({}); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings'); const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load settings.')
      setSettings(data); setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  function draftValue(setting: PlatformSetting) { return drafts[setting.key] ?? (Array.isArray(setting.value) ? setting.value.join(', ') : String(setting.value)) }
  async function save(setting: PlatformSetting) {
    const raw = draftValue(setting)
    let value: unknown = raw
    if (typeof setting.value === 'boolean') value = raw === 'true'
    else if (typeof setting.value === 'number') value = Number(raw)
    else if (Array.isArray(setting.value)) value = raw.split(',').map((item) => item.trim()).filter(Boolean)
    const reason = window.prompt('Reason for this configuration change (optional but audited):') ?? ''
    const response = await fetch(`/api/admin/settings/${setting.key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value, reason }) })
    const data = await response.json()
    if (!response.ok) { setError(data.error || 'Unable to update setting.'); return }
    setMessage(`${setting.key} updated.`); void load()
  }
  return <main className="admin-page"><header className="admin-header"><Link href="/admin" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/integrations" className="admin-nav-link">Integrations</Link><span className="admin-role-chip">System settings</span></nav></header><div className="admin-shell">
    <section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">Admin portal / Phase 11</p><h1>Platform settings.</h1><p>Business-level configuration only. Infrastructure secrets are never stored or displayed here.</p></div></section>
    {message ? <div className="admin-config-notice" role="status">{message}</div> : null}{error ? <div className="admin-config-notice admin-config-error" role="alert">{error}</div> : null}
    {settings ? Object.entries(settings).map(([category, items]) => <section className="admin-panel" key={category}><div className="admin-panel-heading"><div><p className="admin-eyebrow">{label(category)}</p><h2>{items.length} settings</h2></div></div><div className="admin-config-list">{(items as PlatformSetting[]).map((setting) => <div className="admin-config-row" key={setting.key}><div><strong>{label(setting.key)}</strong><span>{setting.description}</span></div><div className="admin-document-actions"><input value={draftValue(setting)} onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))} /><button type="button" className="admin-text-link" onClick={() => void save(setting)}>Save</button></div></div>)}</div></section>) : <p className="admin-empty">{loading ? 'Loading settings...' : 'No settings available.'}</p>}
  </div></main>
}
