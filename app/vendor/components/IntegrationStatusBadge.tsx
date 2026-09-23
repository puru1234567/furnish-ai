import type { IntegrationStatus } from '@/lib/vendor/integrations'

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) { return <span className={`integration-status integration-status-${status}`}>{status.replaceAll('_', ' ')}</span> }