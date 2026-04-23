'use client'

import type { ContextualQuestion } from '@/lib/types'
import { FindProgressSteps } from './FindProgressSteps'
import type { FormData } from '../find-page-model'

interface FindStepQuestionsProps {
  form: FormData
  livePillText: string
  echoLine: string
  furnitureTypeLabel: string
  selectedContextualCount: number
  contextualQuestions: ContextualQuestion[]
  questionSubIndex: number
  questionsLoading: boolean
  questionsError: string
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
  furnitureTypeLabel,
  selectedContextualCount,
  contextualQuestions,
  questionSubIndex,
  questionsLoading,
  questionsError,
  getQuestionOptionLabel,
  onRetry,
  onSelectAnswer,
  onPreviousQuestion,
  onBack,
  onContinue,
}: FindStepQuestionsProps) {
  const question = contextualQuestions[questionSubIndex]

  return (
    <div className="page active">
      <FindProgressSteps currentStep={3} livePillText={livePillText} />

      <div className="form-body">
        {echoLine && <div className="echo-panel">{echoLine}</div>}
        <div className="form-eyebrow">Step 3 of 5</div>
        <h2 className="form-title">A few quick questions about your {furnitureTypeLabel || 'sofa'}</h2>
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
          <div className="question-single">
            <div className="question-counter">Question {questionSubIndex + 1} of {contextualQuestions.length}</div>
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
          <button className="btn-next" onClick={onContinue}>Continue → <span>Budget</span></button>
        </div>
      </div>
    </div>
  )
}