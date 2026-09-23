import { IMPORT_STATUS_LABELS, type ImportStatus } from '@/lib/vendor/imports'

export function ImportStatusBadge({ status }: { status: ImportStatus }) { return <span className={`import-status import-status-${status}`}>{IMPORT_STATUS_LABELS[status]}</span> }