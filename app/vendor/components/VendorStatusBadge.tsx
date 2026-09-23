import type { OnboardingStepStatus } from '@/lib/vendor/onboarding'

const labels: Record<OnboardingStepStatus, string> = { completed: 'Completed', in_progress: 'In progress', pending: 'Pending', action_required: 'Action required' }

export function VendorStatusBadge({ status }: { status: OnboardingStepStatus }) {
  return <span className={`vendor-status vendor-status-${status}`}>{labels[status]}</span>
}