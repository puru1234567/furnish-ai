interface FindProgressStepsProps {
  currentStep: number
  livePillText: string
}

export function FindProgressSteps({ currentStep, livePillText }: FindProgressStepsProps) {
  return (
    <div className="form-chrome">
      <div className="progress-steps">
        {[1, 2, 3, 4, 5].map((stepNumber, index) => {
          const isDone = stepNumber < currentStep
          const isActive = stepNumber === currentStep

          return [
            <div key={`dot-${stepNumber}`} className={`step-dot ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
              {isDone ? '✓' : stepNumber}
            </div>,
            index < 4 ? <div key={`line-${stepNumber}`} className={`step-line ${isDone ? 'done' : ''}`}></div> : null,
          ]
        })}
      </div>
      <div className="live-count">{livePillText}</div>
    </div>
  )
}