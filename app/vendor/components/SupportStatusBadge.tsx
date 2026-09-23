import type { SupportTicketStatus } from '@/lib/vendor/support'

export function SupportStatusBadge({ status }: { status: SupportTicketStatus }) { return <span className={`support-status support-status-${status}`}>{status.replaceAll('_', ' ')}</span> }