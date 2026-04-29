'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FindProgressSteps } from './FindProgressSteps'
import { FURNITURE_TYPES } from '../find-page-constants'
import { getFurnitureLabel } from '../find-page-utils'
import { parseFurnitureRequest } from '../parse-intake'

interface FindStepPromptIntakeProps {
  initialBudget: number
  livePillText: string
  onConfirm: (payload: { furnitureType: string; budget: number; requestText: string }) => void
}

export function FindStepPromptIntake({
  initialBudget,
  livePillText,
  onConfirm,
}: FindStepPromptIntakeProps) {
  const [requestText, setRequestText] = useState('')
  const [budgetValue, setBudgetValue] = useState(String(initialBudget))
  const [errorMessage, setErrorMessage] = useState('')
  const [candidateIds, setCandidateIds] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState<'idle' | 'unknown' | 'multi'>('idle')

  const candidateOptions = useMemo(
    () => FURNITURE_TYPES.filter(item => candidateIds.includes(item.id)),
    [candidateIds]
  )

  const confirmSelection = (furnitureType: string) => {
    const parsedBudget = Number(budgetValue)
    if (!Number.isFinite(parsedBudget) || parsedBudget < 1000) {
      setErrorMessage('Enter a realistic budget to continue.')
      return
    }

    setErrorMessage('')
    onConfirm({ furnitureType, budget: parsedBudget, requestText })
  }

  const handleSubmit = () => {
    const parsed = parseFurnitureRequest(requestText)

    if (parsed.issue === 'missing_request') {
      setErrorMessage('Describe the furniture you want before continuing.')
      setCandidateIds([])
      setSelectionMode('idle')
      return
    }

    if (parsed.issue === 'multi_item') {
      setErrorMessage('I found multiple furniture items. Choose one to continue.')
      setCandidateIds(parsed.candidates)
      setSelectionMode('multi')
      return
    }

    if (parsed.issue === 'unknown_item' || !parsed.furnitureType) {
      setErrorMessage('I could not confidently map that to a supported furniture type. Pick one to continue.')
      setCandidateIds(FURNITURE_TYPES.map(item => item.id))
      setSelectionMode('unknown')
      return
    }

    confirmSelection(parsed.furnitureType)
  }

  return (
    <div className="page active">
      <FindProgressSteps currentStep={1} livePillText={livePillText} />

      <div className="form-body journey-form-body">
        <div className="journey-spotlight">
          <div className="journey-spotlight-copy">
            <div className="journey-spotlight-label">Design-led discovery</div>
            <div className="journey-spotlight-title">Tell us one thing you want. We will build the rest around your room.</div>
            <div className="journey-spotlight-sub">Start with the furniture item and budget. The next steps use room photos and follow-up questions to shape a shortlist that feels intentional, not generic.</div>
          </div>
          <div className="journey-spotlight-rail">
            <div className="journey-mini-card">
              <span className="journey-mini-kicker">Step 1</span>
              <strong>Item + budget</strong>
              <span>Start with the one purchase you want right now.</span>
            </div>
            <div className="journey-mini-card">
              <span className="journey-mini-kicker">Step 2</span>
              <strong>Room context</strong>
              <span>Upload views so the AI reads layout, color, and constraints.</span>
            </div>
            <div className="journey-mini-card accent">
              <span className="journey-mini-kicker">Outcome</span>
              <strong>Shortlist with reasons</strong>
              <span>Get ranked recommendations with stretch options and trade-offs.</span>
            </div>
          </div>
        </div>

        <div className="form-eyebrow">Step 1 of 5</div>
        <h2 className="form-title">Tell us what you want</h2>
        <p className="form-sub">
          Start with one furniture item and your budget. We will infer the rest later from your room photos and follow-up questions.
        </p>

        <div className="understanding-card intake-card">
          <div className="understanding-title">One item at a time works best</div>
          <div className="understanding-tags">
            <span className="understanding-tag">Examples: “Need a compact sofa for around 30k”</span>
            <span className="understanding-tag">“Looking for a desk under 18k”</span>
          </div>
        </div>

        <div className="text-input-wrap">
          <label htmlFor="intake-request">What furniture are you looking for?</label>
          <textarea
            id="intake-request"
            rows={4}
            placeholder="e.g. Need a warm modern sofa for my home, nothing bulky"
            value={requestText}
            onChange={event => setRequestText(event.target.value)}
          />
        </div>

        <div className="text-input-wrap">
          <label htmlFor="intake-budget">Budget</label>
          <div className="intake-budget-wrap">
            <span className="intake-budget-prefix">₹</span>
            <input
              id="intake-budget"
              type="number"
              min={1000}
              step={500}
              value={budgetValue}
              onChange={event => setBudgetValue(event.target.value)}
              placeholder="30000"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="intake-feedback error">{errorMessage}</div>
        )}

        {selectionMode !== 'idle' && candidateOptions.length > 0 && (
          <div className="intake-choices">
            <div className="section-label">Choose one item to continue</div>
            <div className="chip-grid intake-choice-grid">
              {candidateOptions.map(option => (
                <button
                  key={option.id}
                  className="chip"
                  onClick={() => confirmSelection(option.id)}
                >
                  <span className="chip-icon">{option.icon}</span>
                  <span className="chip-label">{option.label}</span>
                  <span className="chip-sub">Continue with {getFurnitureLabel(option.id).toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="btn-row">
          <Link href="/" className="btn-back">← Home</Link>
          <button className="btn-next" onClick={handleSubmit}>
            Understand my request →
          </button>
        </div>
      </div>
    </div>
  )
}