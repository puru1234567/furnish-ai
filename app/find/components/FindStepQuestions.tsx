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

  useEffect(() => {
    setQuestionAnimKey(current => current + 1)
  }, [questionSubIndex])

  return (
    <div className="page active">
      {showProgress && <FindProgressSteps currentStep={3} livePillText={livePillText} />}

      <div className="form-body journey-form-body question-journey-body">
        {echoLine && <div className="echo-panel">{echoLine}</div>}
        <div className="form-eyebrow">Step 3 of 5</div>
        <h2 className="form-title">A few quick questions about your {furnitureTypeLabel || 'sofa'}</h2>
        <p className="form-sub">One tap per answer. Each choice updates the shortlist.</p>

        {(selectedContextualCount > 0 || roomAnalysis) && (
          <div className="understanding-tags compact-step-tags">
            {selectedContextualCount > 0 && <span className="understanding-tag">{selectedContextualCount} saved</span>}
            {contextualQuestions
              .filter(current => form.contextualAnswers[current.id])
              .slice(-2)
              .map(current => (
                <span key={current.id} className="understanding-tag">
                  {getQuestionOptionLabel(current, form.contextualAnswers[current.id])}
                </span>
              ))}
            {roomAnalysis?.styleProfile && (
              <span className="understanding-tag">{getAnalysisLabel(roomAnalysis.styleProfile, 'Room read')}</span>
            )}
          </div>
        )}

        {roomAnalysis && !questionsLoading && (
          <div className="analysis-panel success question-room-context">
            <div className="analysis-header">
              <div className="analysis-badge">✦ AI Room Context</div>
              <div className="analysis-confidence">{Math.round(roomAnalysis.confidenceScore * 100)}% confidence</div>
            </div>
            <div className="question-room-summary">{roomAnalysis.roomSummary}</div>
            <div className="analysis-grid">
              <div className="analysis-cell">
                <div className="analysis-cell-label">Wall Color</div>
                <div className="analysis-cell-value">{getAnalysisLabel(roomAnalysis.wallColor)}</div>
              </div>
              <div className="analysis-cell">
                <div className="analysis-cell-label">Floor</div>
                <div className="analysis-cell-value">{getAnalysisLabel(roomAnalysis.floorType)}</div>
              </div>
              <div className="analysis-cell">
                <div className="analysis-cell-label">Layout</div>
                <div className="analysis-cell-value">{getAnalysisText(roomAnalysis.roomLayout)}</div>
              </div>
              <div className="analysis-cell">
                <div className="analysis-cell-label">Lighting</div>
                <div className="analysis-cell-value">{getAnalysisText(roomAnalysis.lighting)}</div>
              </div>
              <div className="analysis-cell">
                <div className="analysis-cell-label">Style</div>
                <div className="analysis-cell-value">{getAnalysisLabel(roomAnalysis.styleProfile)}</div>
              </div>
              {roomAnalysis.estimatedWidthFt && roomAnalysis.estimatedDepthFt && (
                <div className="analysis-cell">
                  <div className="analysis-cell-label">Est. Size</div>
                  <div className="analysis-cell-value">~{roomAnalysis.estimatedWidthFt} × {roomAnalysis.estimatedDepthFt} ft</div>
                </div>
              )}
            </div>
            {roomAnalysis.existingFurniture?.length > 0 && (
              <div className="analysis-sub-section">
                <div className="analysis-sub-label">Existing Furniture</div>
                <div className="understanding-tags">
                  {roomAnalysis.existingFurniture.map((item, i) => (
                    <span key={i} className="understanding-tag">{item}</span>
                  ))}
                </div>
              </div>
            )}
            {roomAnalysis.softFurnishings?.length > 0 && (
              <div className="analysis-sub-section">
                <div className="analysis-sub-label">Soft Furnishings</div>
                <div className="understanding-tags">
                  {roomAnalysis.softFurnishings.map((item, i) => (
                    <span key={i} className="understanding-tag">{item}</span>
                  ))}
                </div>
              </div>
            )}
            {roomAnalysis.spatialConstraints?.length > 0 && (
              <div className="analysis-sub-section">
                <div className="analysis-sub-label">Spatial Constraints</div>
                <div className="understanding-tags">
                  {roomAnalysis.spatialConstraints.map((item, i) => (
                    <span key={i} className="understanding-tag">{item}</span>
                  ))}
                </div>
              </div>
            )}
            {roomAnalysis.furnitureNeeds?.length > 0 && (
              <div className="analysis-sub-section">
                <div className="analysis-sub-label">Furniture Needs</div>
                <div className="understanding-tags">
                  {roomAnalysis.furnitureNeeds.map((item, i) => (
                    <span key={i} className="understanding-tag">{item}</span>
                  ))}
                </div>
              </div>
            )}
            {roomAnalysis.colorPalette?.length > 0 && (
              <div className="analysis-sub-section">
                <div className="analysis-sub-label">Color Palette</div>
                <div className="understanding-tags">
                  {roomAnalysis.colorPalette.map((color, i) => (
                    <span key={i} className="understanding-tag">{color}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!questionsLoading && contextualQuestions.length === 0 && !questionsError && (
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: 'var(--warm-white)', border: '1px solid var(--sand)', color: 'var(--warm-grey)', lineHeight: '1.6' }}>
            No follow-up questions were generated yet. Continue and we will still use the room context.
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
              <div className="journey-question-hint">Tap once to answer</div>
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

        <div className="btn-row">
          <button className="btn-back" onClick={onBack}>← Back</button>
          {canContinueManually && <button className="btn-next" onClick={onContinue}>Continue → <span>Budget</span></button>}
        </div>
      </div>
    </div>
  )
}