interface FindProgressStepsProps {
  currentStep: number
  livePillText: string
}

const STEP_META = [
  { label: 'Brief', helper: 'Start with one item' },
  { label: 'Room', helper: 'Upload room views' },
  { label: 'Budget', helper: 'Set guardrails' },
  { label: 'Polish', helper: 'Optional refinements' },
]

export function FindProgressSteps({ currentStep, livePillText }: FindProgressStepsProps) {
  const currentMeta = STEP_META[Math.max(0, Math.min(STEP_META.length - 1, currentStep - 1))]

  return (
    <div className="form-chrome">
      <div className="progress-steps">
        {STEP_META.map((stepMeta, index) => {
          const stepNumber = index + 1
          const isDone = stepNumber < currentStep
          const isActive = stepNumber === currentStep

          return [
            <div key={`dot-${stepNumber}`} className={`progress-step ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
              <div className={`step-dot ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                {isDone ? '✓' : stepNumber}
              </div>
              <div className="progress-step-copy">
                <div className="progress-step-label">{stepMeta.label}</div>
                <div className="progress-step-helper">{stepMeta.helper}</div>
              </div>
            </div>,
            index < 3 ? <div key={`line-${stepNumber}`} className={`step-line ${isDone ? 'done' : ''}`}></div> : null,
          ]
        })}
      </div>
      <div className="chrome-meta">
        <div className="live-count">{livePillText}</div>
      </div>
      <div className="progress-step-visibility" aria-live="polite">
        <span className="progress-step-current">Now: {currentMeta.label}</span>
        <span className="progress-step-current-helper">{currentMeta.helper}</span>
      </div>
    </div>
  )
}