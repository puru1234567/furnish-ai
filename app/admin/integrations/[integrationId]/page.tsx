'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { AdminIntegration, AdminSyncError, AdminSyncRun } from '@/lib/admin/integrations'

function label(value: string) { return value.replaceAll('_', ' ') }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }

export default function AdminIntegrationDetailPage({ params }: { params: Promise<{ integrationId: string }> }) {
  const [integrationId, setIntegrationId] = useState(''); const [integration, setIntegration] = useState<AdminIntegration | null>(null); const [runs, setRuns] = useState<AdminSyncRun[]>([]); const [errorsByRun, setErrorsByRun] = useState<Record<string, AdminSyncError[]>>({}); const [expandedRun, setExpandedRun] = useState('')
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [toggleReason, setToggleReason] = useState(''); const [showDisableDialog, setShowDisableDialog] = useState(false)

  useEffect(() => { void params.then(({ integrationId: id }) => setIntegrationId(id)) }, [params])
  const load = useCallback(async () => {
    if (!integrationId) return
    try {
      const [integrationRes, runsRes] = await Promise.all([fetch(`/api/admin/integrations/${integrationId}`), fetch(`/api/admin/integrations/${integrationId}/runs`)])
      const [integrationData, runsData] = await Promise.all([integrationRes.json(), runsRes.json()])
      if (!integrationRes.ok) throw new Error(integrationData.error || 'Unable to load integration.')
      if (!runsRes.ok) throw new Error(runsData.error || 'Unable to load sync runs.')
      setIntegration(integrationData); setRuns(runsData.items ?? []); setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load integration.') }
  }, [integrationId])
  useEffect(() => { void load() }, [load])

  async function toggleErrors(runId: string) {
    if (expandedRun === runId) { setExpandedRun(''); return }
    setExpandedRun(runId)
    if (!errorsByRun[runId]) { const response = await fetch(`/api/admin/integrations/runs/${runId}/errors`); if (response.ok) setErrorsByRun((current) => ({ ...current, [runId]: [] })); const data = await response.json(); setErrorsByRun((current) => ({ ...current, [runId]: data })) }
  }
  async function triggerSync() { if (!window.confirm('Queue a synchronization run for this integration?')) return; const response = await fetch(`/api/admin/integrations/${integrationId}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: ['products', 'inventory', 'pricing'] }) }); const data = await response.json(); if (!response.ok) { setError(data.error || 'Unable to trigger sync.'); return } setMessage(`Sync run ${data.runId} queued.${data.adapterRegistered ? '' : ' No adapter is registered for this provider yet.'}`); void load() }
  async function retryRun(runId: string) { if (!window.confirm('Retry this sync run?')) return; const response = await fetch(`/api/admin/integrations/runs/${runId}/retry`, { method: 'POST' }); const data = await response.json(); if (!response.ok) { setError(data.error || 'Unable to retry sync.'); return } setMessage(`Retry run ${data.runId} queued.`); void load() }
  async function submitToggle(enabled: boolean) { const response = await fetch(`/api/admin/integrations/${integrationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled, reason: toggleReason }) }); const data = await response.json(); if (!response.ok) { setError(data.error || 'Unable to update integration.'); return } setShowDisableDialog(false); setToggleReason(''); setMessage(enabled ? 'Integration enabled.' : 'Integration disabled.'); void load() }

  if (!integration) return <main className="admin-page"><div className="admin-shell"><p className="admin-empty">{error || 'Loading integration...'}</p></div></main>
  return <main className="admin-page"><header className="admin-header"><Link href="/admin/integrations" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/integrations" className="admin-nav-link">Integrations</Link><span className="admin-role-chip">Detail</span></nav></header><div className="admin-shell">
    <section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">Integration record</p><h1>{integration.displayName}</h1><p>{integration.vendorName} · {integration.providerKey} · {integration.adapterRegistered ? 'Adapter registered' : 'No adapter configured for this provider yet'}</p></div><div className="admin-detail-status"><span className={`admin-status admin-status-${integration.status}`}>{label(integration.status)}</span>{integration.adminEnabled ? <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowDisableDialog(true)}>Disable</button> : <button type="button" className="admin-button admin-button-primary" onClick={() => void submitToggle(true)}>Enable</button>}</div></section>
    {message ? <div className="admin-config-notice" role="status">{message}</div> : null}{error ? <div className="admin-config-notice admin-config-error" role="alert">{error}</div> : null}
    <section className="admin-review-actions"><button type="button" className="admin-button admin-button-primary" onClick={() => void triggerSync()}>Trigger synchronization</button></section>
    <section className="admin-panel admin-panel-wide"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Sync history</p><h2>{runs.length} recent runs</h2></div></div>
      {runs.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Started</th><th>Status</th><th>Domains</th><th>Records</th><th>Source</th><th /></tr></thead><tbody>{runs.map((run) => <RunRow run={run} key={run.id} onToggleErrors={() => void toggleErrors(run.id)} onRetry={() => void retryRun(run.id)} expanded={expandedRun === run.id} errors={errorsByRun[run.id]} />)}</tbody></table></div> : <p className="admin-empty">No synchronization runs recorded yet.</p>}
    </section>
  </div>{showDisableDialog ? <div className="admin-dialog-backdrop"><section className="admin-dialog" role="dialog" aria-modal="true"><p className="admin-eyebrow">Confirm disable</p><h2>Disable this integration?</h2><p>New sync requests will be rejected until this integration is re-enabled. This is audited.</p><label>Reason<textarea rows={3} value={toggleReason} onChange={(event) => setToggleReason(event.target.value)} /></label><div className="admin-dialog-actions"><button type="button" className="admin-button admin-button-secondary" onClick={() => setShowDisableDialog(false)}>Cancel</button><button type="button" className="admin-button admin-button-primary" onClick={() => void submitToggle(false)}>Confirm disable</button></div></section></div> : null}</main>
}

function RunRow({ run, onToggleErrors, onRetry, expanded, errors }: { run: AdminSyncRun; onToggleErrors: () => void; onRetry: () => void; expanded: boolean; errors?: AdminSyncError[] }) {
  const canRetry = ['failed', 'completed_with_errors'].includes(run.status)
  return <>
    <tr><td>{date(run.startedAt)}</td><td><span className={`admin-status admin-status-${run.status}`}>{label(run.status)}</span></td><td>{run.domains.join(', ') || '—'}</td><td>{run.succeededRecords}/{run.totalRecords} ({run.failedRecords} failed)</td><td>{label(run.triggerSource)}{run.retryOfRunId ? ' (retry)' : ''}</td><td><div className="admin-document-actions"><button type="button" className="admin-text-link" onClick={onToggleErrors}>{expanded ? 'Hide errors' : 'View errors'}</button>{canRetry ? <button type="button" className="admin-text-link" onClick={onRetry}>Retry</button> : null}</div></td></tr>
    {expanded ? <tr><td colSpan={6}>{errors?.length ? <div className="admin-list">{errors.map((item) => <div className="admin-list-row" key={item.id}><div><strong>{item.errorCode}</strong><span>{item.message}{item.externalRecordId ? ` · Record ${item.externalRecordId}` : ''}</span></div><span>{item.retriable ? 'Retriable' : 'Not retriable'}</span></div>)}</div> : <p className="admin-empty">No errors recorded for this run.</p>}</td></tr> : null}
  </>
}
