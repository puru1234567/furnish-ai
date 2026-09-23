import { ONBOARDING_STEPS, type OnboardingStepId, type OnboardingStepStatus } from '@/lib/vendor/onboarding'
import { VendorStatusBadge } from './VendorStatusBadge'

interface VendorProgressProps { activeStep: OnboardingStepId; statuses: Record<OnboardingStepId, OnboardingStepStatus>; onSelect: (step: OnboardingStepId) => void }

export function VendorProgress({ activeStep, statuses, onSelect }: VendorProgressProps) {
  return <nav className="vendor-progress" aria-label="Onboarding progress"><div className="vendor-progress-heading"><p className="vendor-eyebrow">Your journey</p><h2>Onboarding steps</h2><div className="vendor-status-legend" aria-label="Status legend"><VendorStatusBadge status="completed" /><VendorStatusBadge status="in_progress" /><VendorStatusBadge status="pending" /><VendorStatusBadge status="action_required" /></div></div><ol>{ONBOARDING_STEPS.map((step, index) => <li key={step.id} className={activeStep === step.id ? 'is-active' : ''}><button type="button" onClick={() => onSelect(step.id)} aria-current={activeStep === step.id ? 'step' : undefined}><span className="vendor-step-number">{String(index + 1).padStart(2, '0')}</span><span className="vendor-step-copy"><strong>{step.label}</strong><small>{step.description}</small></span><VendorStatusBadge status={statuses[step.id]} /></button></li>)}</ol></nav>
}