import { NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const auth = await requireVendor(); if ('response' in auth) return auth.response
	const { id } = await params
	const { data: integration } = await auth.supabase.from('vendor_integrations').select('id').eq('id', id).eq('vendor_id', auth.user.id).maybeSingle()
	if (!integration) return NextResponse.json({ error: 'Integration not found.' }, { status: 404 })
	const { data: runs, error } = await auth.supabase.from('vendor_integration_sync_runs').select('*, vendor_integration_sync_errors(*)').eq('integration_id', id).order('started_at', { ascending: false })
	if (error) return NextResponse.json({ error: 'Unable to load sync runs.' }, { status: 500 })
	return NextResponse.json({ integrationId: id, runs: (runs ?? []).map((run) => ({ id: run.id, integrationId: id, status: run.status, domains: run.domains ?? [], startedAt: run.started_at, completedAt: run.completed_at, totalRecords: run.total_records, succeededRecords: run.succeeded_records, failedRecords: run.failed_records, attempt: run.attempt, errors: (run.vendor_integration_sync_errors ?? []).map((item: Record<string, unknown>) => ({ id: item.id, runId: run.id, externalRecordId: item.external_record_id, field: item.field, code: item.error_code, message: item.message, retriable: item.retriable, attempt: item.attempt, createdAt: item.created_at })) })) })
}