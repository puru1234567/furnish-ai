import { type ListingLifecycleStatus } from '@/lib/vendor/catalog'

const labels: Record<ListingLifecycleStatus, string> = { active: 'Active', inactive: 'Inactive', discontinued: 'Discontinued', archived: 'Archived', removal_requested: 'Removal requested' }

export function ListingLifecycleBadge({ status }: { status: ListingLifecycleStatus }) { return <span className={`listing-lifecycle listing-lifecycle-${status}`}>{labels[status]}</span> }