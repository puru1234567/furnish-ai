export type IntegrationStatus = 'disconnected' | 'pending_setup' | 'connected' | 'syncing' | 'error' | 'paused'
export type SyncRunStatus = 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled'
export type SyncDirection = 'pull' | 'push' | 'bidirectional'
export type SyncDomain = 'products' | 'inventory' | 'pricing'

export interface VendorIntegration { id: string; vendorId: string; displayName: string; providerKey: string; status: IntegrationStatus; direction: SyncDirection; domains: SyncDomain[]; lastSyncAt: string | null; nextSyncAt: string | null; lastError: string | null; createdAt: string; updatedAt: string }
export interface SyncError { id: string; runId: string; externalRecordId: string | null; field: string | null; code: string; message: string; retriable: boolean; attempt: number; createdAt: string }
export interface SyncRun { id: string; integrationId: string; status: SyncRunStatus; domains: SyncDomain[]; startedAt: string | null; completedAt: string | null; totalRecords: number; succeededRecords: number; failedRecords: number; attempt: number; errors: SyncError[] }
export interface ExternalProductRecord { externalId: string; payload: unknown }
export interface MappedProductRecord { externalId: string; product: Record<string, unknown>; inventory?: Record<string, unknown>; pricing?: Record<string, unknown> }
export interface VendorAuthContext { integrationId: string; accessToken?: string; credentialReference?: string; expiresAt?: string }

export interface VendorAuthenticator { authenticate(integration: VendorIntegration): Promise<VendorAuthContext>; refresh?(context: VendorAuthContext): Promise<VendorAuthContext> }
export interface VendorCatalogAdapter { providerKey: string; pullProducts?(context: VendorAuthContext): Promise<ExternalProductRecord[]>; pullInventory?(context: VendorAuthContext): Promise<ExternalProductRecord[]>; pullPricing?(context: VendorAuthContext): Promise<ExternalProductRecord[]>; pushProduct?(context: VendorAuthContext, record: MappedProductRecord): Promise<void>; verifyWebhook?(request: Request, context: VendorAuthContext): Promise<boolean> }
export interface VendorCatalogMapper { mapProducts(records: ExternalProductRecord[]): Promise<MappedProductRecord[]>; mapInventory?(records: ExternalProductRecord[]): Promise<MappedProductRecord[]>; mapPricing?(records: ExternalProductRecord[]): Promise<MappedProductRecord[]> }
export interface VendorCatalogValidator { validate(records: MappedProductRecord[], domains: SyncDomain[]): Promise<SyncError[]> }
export interface VendorSyncOrchestrator { run(integration: VendorIntegration, domains: SyncDomain[], direction: SyncDirection): Promise<SyncRun>; retry(runId: string): Promise<SyncRun> }

export interface VendorIntegrationService { list(vendorId: string): Promise<VendorIntegration[]>; get(vendorId: string, integrationId: string): Promise<VendorIntegration | null>; requestSync(vendorId: string, integrationId: string, domains: SyncDomain[]): Promise<SyncRun>; listRuns(vendorId: string, integrationId: string): Promise<SyncRun[]> }

/** Registry seam for adding providers without changing catalog orchestration. */
export class VendorAdapterRegistry { private readonly adapters = new Map<string, VendorCatalogAdapter>(); register(adapter: VendorCatalogAdapter) { this.adapters.set(adapter.providerKey, adapter) } get(providerKey: string) { return this.adapters.get(providerKey) } }

export const vendorAdapterRegistry = new VendorAdapterRegistry()

/** No provider is registered until authentication and payload contracts are approved. */
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, init)
	const body = await response.json().catch(() => null)
	if (!response.ok) throw new Error(body?.error ?? 'Unable to load integrations.')
	return body as T
}

export const vendorIntegrationService: VendorIntegrationService = {
	async list(_vendorId) { const result = await apiRequest<{ integrations: VendorIntegration[] }>('/api/vendor/integrations'); return result.integrations },
	async get(_vendorId, integrationId) { return apiRequest<VendorIntegration | null>(`/api/vendor/integrations/${integrationId}`) },
	async requestSync(_vendorId, integrationId, domains) { return apiRequest<SyncRun>(`/api/vendor/integrations/${integrationId}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains }) }) },
	async listRuns(_vendorId, integrationId) { const result = await apiRequest<{ runs: SyncRun[] }>(`/api/vendor/integrations/${integrationId}/runs`); return result.runs },
}