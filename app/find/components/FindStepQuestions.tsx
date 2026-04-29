'use client'

import { useEffect, useState } from 'react'
import type { ContextualQuestion, RoomAnalysis } from '@/lib/types'
import { FindProgressSteps } from './FindProgressSteps'
import type { FormData } from '../find-page-model'

interface FindStepQuestionsProps {
  form: FormData
  livePillText: string
  echoLine: string
  showProgress?: boolean
  furnitureTypeLabel: string
  selectedContextualCount: number
  roomAnalysis: RoomAnalysis | null
  contextualQuestions: ContextualQuestion[]
  questionSubIndex: number
  questionsLoading: boolean
  questionsError: string
  getAnalysisLabel: (value: unknown, fallback?: string) => string
  getAnalysisText: (value: unknown, fallback?: string) => string
  getQuestionOptionLabel: (question: ContextualQuestion | undefined, optionId: string | undefined) => string
  onRetry: () => void
  onSelectAnswer: (questionId: string, optionId: string, questionText: string, optionLabel: string) => void
  onPreviousQuestion: () => void
  onBack: () => void
  onContinue: () => void
}

export function FindStepQuestions({
  form,
  livePillText,
  echoLine,
  showProgress = true,
  furnitureTypeLabel,
  selectedContextualCount,
  roomAnalysis,
  contextualQuestions,
  questionSubIndex,
  questionsLoading,
  questionsError,
  getAnalysisLabel,
  getAnalysisText,
  getQuestionOptionLabel,
  onRetry,
  onSelectAnswer,
  onPreviousQuestion,
  onBack,
  onContinue,
}: FindStepQuestionsProps) {
  const question = contextualQuestions[questionSubIndex]
  const canContinueManually = contextualQuestions.length === 0 || !!questionsError
  const [questionAnimKey, setQuestionAnimKey] = useState(0)
  useEffect(() => { setQuestionAnimKey(k => k + 1) }, [questionSubIndex])

  return (
    <div className="page active">
      {showProgress && <FindProgressSteps currentStep={3} livePillText={livePillText} />}

      <div className="form-body journey-form-body question-journey-body">
        {echoLine && <div className="echo-panel">{echoLine}</div>}
        <div className="form-eyebrow">Step 3 of 5</div>
        <h2 className="form-title">A few quick questions about your {furnitureTypeLabel || 'sofa'}</h2>

        <div className="journey-spotlight journey-step-spotlight">
          <div className="journey-spotlight-copy">
            <div className="journey-spotlight-label">Ranking signals</div>
            <div className="journey-spotlight-title">We only ask what can actually reshuffle the shortlist.</div>
            <div className="journey-spotlight-sub">
              Borrowing from single-focus questionnaire patterns, each question stays isolated, answerable in one tap, and tied to a ranking decision like comfort, size tolerance, or finish preference.
            </div>
          </div>
          <div className="journey-spotlight-rail">
            <div className="journey-mini-card">
              <span className="journey-mini-kicker">Captured</span>
              <strong>{selectedContextualCount} signal{selectedContextualCount === 1 ? '' : 's'} so far</strong>
              <span>Every answer is saved immediately and pushes the shortlist in a different direction.</span>
            </div>
            <div className="journey-mini-card">
              <span className="journey-mini-kicker">Context</span>
              <strong>Room read stays visible</strong>
              <span>The AI room summary remains on-screen so the questions feel grounded in your space.</span>
            </div>
            <div className="journey-mini-card accent">
              <span className="journey-mini-kicker">Outcome</span>
              <strong>Reasons get sharper</strong>
              <span>The final results explain why each recommendation fits the room and your answers together.</span>
            </div>
          </div>
        </div>

        <div className={`understanding-card ${selectedContextualCount > 0 ? 'success' : ''}`}>
          <div className="understanding-title">
            {selectedContextualCount > 0
              ? `${selectedContextualCount} preference signal${selectedContextualCount > 1 ? 's' : ''} captured`
              : 'These answers reshape ranking, not just filtering'}
          </div>
          {selectedContextualCount > 0 && (
            <div className="understanding-tags">
              {contextualQuestions
                .filter(current => form.contextualAnswers[current.id])
                .slice(-3)
                .map(current => (
                  <span key={current.id} className="understanding-tag">
                    {getQuestionOptionLabel(current, form.contextualAnswers[current.id])}
                  </span>
                ))}
            </div>
          )}
        </div>

        {roomAnalysis && !questionsLoading && (
          <div className="analysis-panel success question-room-context">
            <div className="analysis-header">
              <div className="analysis-badge">✦ AI Room Context</div>
              <div className="analysis-confidence">{Math.round(roomAnalysis.confidenceScore * 100)}% confidence</div>
            </div>
            <div className="question-room-summary">{roomAnalysis.roomSummary}</div>
            <div className="analysis-grid">
              <div className="analysis-item"><span className="ai-label">Wall color</span><span className="ai-value">{getAnalysisLabel(roomAnalysis.wallColor)}</span></div>
              <div className="analysis-item"><span className="ai-label">Floor type</span><span className="ai-value">{getAnalysisLabel(roomAnalysis.floorType)}</span></div>
              <div className="analysis-item"><span className="ai-label">Layout</span><span className="ai-value">{getAnalysisText(roomAnalysis.roomLayout)}</span></div>
              <div className="analysis-item"><span className="ai-label">Dimensions</span><span className="ai-value">{roomAnalysis.estimatedWidthFt && roomAnalysis.estimatedDepthFt ? `~${roomAnalysis.estimatedWidthFt} × ${roomAnalysis.estimatedDepthFt} ft` : 'Not detected'}</span></div>
              <div className="analysis-item"><span className="ai-label">Style</span><span className="ai-value">{getAnalysisLabel(roomAnalysis.styleProfile, 'Not detected')}</span></div>
              <div className="analysis-item"><span className="ai-label">Lighting</span><span className="ai-value">{getAnalysisText(roomAnalysis.lighting)}</span></div>
            </div>
            {Array.isArray(roomAnalysis.colorPalette) && roomAnalysis.colorPalette.length > 0 && (
              <div className="analysis-palette">
                <span className="ai-label">Color palette</span>
                <div className="palette-swatches">
                  {roomAnalysis.colorPalette.map((hex, index) => (
                    <span key={index} className="palette-swatch" style={{ background: hex }} title={hex} />
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(roomAnalysis.existingFurniture) && roomAnalysis.existingFurniture.length > 0 && (
              <div className="analysis-furniture">
                <span className="ai-label">Existing furniture</span>
                <div className="ra-tags" style={{ marginTop: '6px' }}>
                  {roomAnalysis.existingFurniture.map((item, index) => (
                    <span key={index} className="ra-tag">{item}</span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(roomAnalysis.softFurnishings) && roomAnalysis.softFurnishings.length > 0 && (
              <div className="analysis-furniture">
                <span className="ai-label">🪟 Window treatments & textiles</span>
                <div className="ra-tags" style={{ marginTop: '6px' }}>
                  {roomAnalysis.softFurnishings.map((item, index) => (
                    <span key={index} className="ra-tag" style={{ background: 'rgba(139,111,86,.10)' }}>{item}</span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(roomAnalysis.spatialConstraints) && roomAnalysis.spatialConstraints.length > 0 && (
              <div className="analysis-constraints">
                <span className="ai-label">⚠ Spatial constraints</span>
                <div className="ra-tags" style={{ marginTop: '6px' }}>
                  {roomAnalysis.spatialConstraints.map((constraint, index) => (
                    <span key={index} className="ra-tag" style={{ background: '#FEF3CD' }}>{constraint}</span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(roomAnalysis.furnitureNeeds) && roomAnalysis.furnitureNeeds.length > 0 && (
              <div className="analysis-furniture">
                <span className="ai-label">Likely need signals</span>
                <div className="ra-tags" style={{ marginTop: '6px' }}>
                  {roomAnalysis.furnitureNeeds.map((item, index) => (
                    <span key={index} className="ra-tag" style={{ background: 'rgba(92,107,74,.12)' }}>{item.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {questionsLoading && (
          <div className="analysis-panel loading" style={{ marginBottom: '24px' }}>
            <div className="analysis-spinner" />
            <div>
              <div className="analysis-title">Generating questions…</div>
            </div>
          </div>
        )}

        {questionsError && (
          <div className="analysis-panel error" style={{ marginBottom: '24px' }}>
            <span>⚠️</span>
            <div>
              <div className="analysis-title">Could not generate questions</div>
              <div className="analysis-sub">{questionsError}</div>
              <button type="button" className="upload-btn" style={{ marginTop: '8px' }} onClick={onRetry}>
                Retry
              </button>
            </div>
          </div>
        )}

        {!questionsLoading && question && (
          <div className="question-single" key={questionAnimKey}>
            <div className="journey-question-meta">
              <div className="question-counter">Question {questionSubIndex + 1} of {contextualQuestions.length}</div>
              <div className="journey-question-hint">Tap once to answer and continue</div>
            </div>
            <div className="question-text">{question.question}</div>
            <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: '0' }}>
              {question.options.map(option => (
                <button
                  key={option.id}
                  className={`chip ${form.contextualAnswers[question.id] === option.id ? 'selected' : ''}`}
                  onClick={() => onSelectAnswer(question.id, option.id, question.question, option.label)}
                >
                  <span className="chip-label">{option.label}</span>
                </button>
              ))}
            </div>
            {questionSubIndex > 0 && (
              <button className="btn-skip" style={{ marginTop: '16px', fontSize: '13px' }} onClick={onPreviousQuestion}>
                ← Previous question
              </button>
            )}
          </div>
        )}

        {!questionsLoading && contextualQuestions.length === 0 && !questionsError && (
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: 'var(--warm-white)', border: '1px solid var(--sand)', color: 'var(--warm-grey)', lineHeight: '1.6' }}>
            No follow-up questions were generated yet. Continue and we will still use the room context, or go back and re-run room analysis.
          </div>
        )}

        <div className="btn-row">
          <button className="btn-back" onClick={onBack}>← Back</button>
          {canContinueManually && <button className="btn-next" onClick={onContinue}>Continue → <span>Budget</span></button>}
        </div>
      </div>
    </div>
  )
}