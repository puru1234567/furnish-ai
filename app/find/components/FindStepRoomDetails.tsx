'use client'

import { useEffect, useState } from 'react'
import type { ContextualQuestion, RoomAnalysis } from '@/lib/types'
import { FindProgressSteps } from './FindProgressSteps'
import type { FormData, PhotoSlot, PhotoSlotId } from '../find-page-model'

interface ColorOption {
  id: string
  label: string
  color: string
}

interface IconOption {
  id: string
  label: string
  icon: string
}

interface FindStepRoomDetailsProps {
  form: FormData
  livePillText: string
  echoLine: string
  showProgress?: boolean
  photoSlots: readonly PhotoSlot[]
  photoCount: number
  allPhotosUploaded: boolean
  photoPreviews: Record<PhotoSlotId, string | null>
  roomAnalysis: RoomAnalysis | null
  analysisLoading: boolean
  analysisError: string
  questionsLoading: boolean
  questionsError: string
  contextualQuestions: ContextualQuestion[]
  questionSubIndex: number
  isDraggingSlot: PhotoSlotId | null
  slotInputRefs: React.MutableRefObject<Record<PhotoSlotId, HTMLInputElement | null>>
  wallColors: ColorOption[]
  floorTypes: IconOption[]
  roomLayouts: IconOption[]
  getAnalysisLabel: (value: unknown, fallback?: string) => string
  getAnalysisText: (value: unknown, fallback?: string) => string
  onPhotoChange: (slot: PhotoSlotId, file: File) => void
  onSlotDrop: (event: React.DragEvent, slot: PhotoSlotId) => void
  onDragOverSlot: (slot: PhotoSlotId) => void
  onDragLeaveSlot: () => void
  onClearPhoto: (slot: PhotoSlotId) => void
  onRetryAnalysis: () => void
  onRetryQuestions: () => void
  onSetField: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onSelectAnswer: (questionId: string, optionId: string, questionText: string, optionLabel: string) => void
  onPreviousQuestion: () => void
  onBack: () => void
  onContinue: () => void
}

export function FindStepRoomDetails({
  form,
  livePillText,
  echoLine,
  showProgress = true,
  photoSlots,
  photoCount,
  allPhotosUploaded,
  photoPreviews,
  roomAnalysis,
  analysisLoading,
  analysisError,
  questionsLoading,
  questionsError,
  contextualQuestions,
  questionSubIndex,
  isDraggingSlot,
  slotInputRefs,
  wallColors,
  floorTypes,
  roomLayouts,
  getAnalysisLabel,
  getAnalysisText,
  onPhotoChange,
  onSlotDrop,
  onDragOverSlot,
  onDragLeaveSlot,
  onClearPhoto,
  onRetryAnalysis,
  onRetryQuestions,
  onSetField,
  onSelectAnswer,
  onPreviousQuestion,
  onBack,
  onContinue,
}: FindStepRoomDetailsProps) {
  const [questionAnimKey, setQuestionAnimKey] = useState(0)
  const [showUploadsView, setShowUploadsView] = useState(false)

  useEffect(() => {
    setQuestionAnimKey(k => k + 1)
  }, [questionSubIndex])

  useEffect(() => {
    if (!allPhotosUploaded) {
      setShowUploadsView(false)
    }
  }, [allPhotosUploaded])

  // Format furniture needs into readable labels
  const formatFurnitureNeed = (need: string) => {
    const labels: Record<string, string> = {
      'needs_primary_seating': 'Primary seating',
      'needs_work_surface': 'Work surface',
      'needs_storage': 'Storage',
      'needs_extra_storage': 'Extra storage',
      'needs_dining': 'Dining',
      'needs_accent': 'Accent piece',
      'needs_coffee_table': 'Coffee table',
      'needs_side_tables': 'Side tables',
      'needs_entertainment': 'Entertainment unit',
      'needs_bed_frame': 'Bed frame',
    }
    return labels[need] || need.replace(/needs_/g, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
  }

  const getColorName = (inputColor: string) => {
    const hex = inputColor.trim().toUpperCase()
    const colorMap: Record<string, string> = {
      '#F5F5DC': 'Beige',
      '#964B00': 'Brown',
      '#788F3C': 'Olive Green',
      '#6495ED': 'Cornflower Blue',
      '#FFFFFF': 'White',
      '#000000': 'Black',
      '#808080': 'Gray',
      '#C0C0C0': 'Silver',
      '#FFD700': 'Gold',
      '#FFA500': 'Orange',
      '#FFFF00': 'Yellow',
      '#008000': 'Green',
      '#0000FF': 'Blue',
      '#800080': 'Purple',
      '#FFC0CB': 'Pink',
      '#A52A2A': 'Dark Brown',
      '#D2B48C': 'Tan',
      '#8B4513': 'Saddle Brown',
      '#DEB887': 'Burlywood',
      '#F4A460': 'Sandy Brown',
      '#2F4F4F': 'Charcoal',
      '#556B2F': 'Moss Green',
      '#B0C4DE': 'Light Steel Blue',
      '#708090': 'Slate Gray',
    }

    return colorMap[hex] ?? 'Custom tone'
  }

  const question = contextualQuestions[questionSubIndex]

  // Flip to analysis when all photos are uploaded; allow reverse flip back to uploads
  const isFlipped = allPhotosUploaded && !showUploadsView

  const goToUploads = () => {
    setShowUploadsView(true)
  }

  const goToAnalysis = () => {
    if (!allPhotosUploaded) return
    setShowUploadsView(false)
  }

  const handleClearRoomPhotos = () => {
    photoSlots.forEach(slot => onClearPhoto(slot.id))
    setShowUploadsView(false)
  }

  // Continue button label
  const continueLabel = !allPhotosUploaded
    ? 'Skip photos → Budget'
    : analysisLoading
      ? 'Analyzing…'
      : questionsLoading
        ? 'Loading questions…'
        : 'Continue → Budget'

  return (
    <div className="page active">
      {showProgress && <FindProgressSteps currentStep={2} livePillText={livePillText} />}

      <div className="form-body journey-form-body room-journey-body">
        {echoLine && <div className="echo-panel">{echoLine}</div>}
        <div className="form-eyebrow">Step 2 of 4</div>
        <h2 className="form-title">Tell us about your room</h2>
        <p className="form-sub">Add room context, then upload photos — the AI will read the rest.</p>

        {/* ── 2. ROOM DIMENSIONS ──────────────────────── */}
        <section className="find-section-group">
          <div className="upload-or">OPTIONAL: ADD ROOM DIMENSIONS</div>
          <div className="find-group-helper">If known, add approximate dimensions to improve size filtering.</div>
          <div className="room-dimension-grid">
            <div className="text-input-wrap compact">
              <label>Room width (feet)</label>
              <input
                type="number"
                placeholder="e.g. 14"
                value={form.roomWidth}
                onChange={event => onSetField('roomWidth', Number(event.target.value))}
              />
            </div>
            <div className="text-input-wrap compact">
              <label>Room depth (feet)</label>
              <input
                type="number"
                placeholder="e.g. 12"
                value={form.roomDepth}
                onChange={event => onSetField('roomDepth', Number(event.target.value))}
              />
            </div>
          </div>
        </section>

        {/* ── 3. HIDDEN FILE INPUTS ───────────────────── */}
        {photoSlots.map(slot => (
          <input
            key={slot.id}
            ref={element => { slotInputRefs.current[slot.id] = element }}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) onPhotoChange(slot.id, file)
            }}
          />
        ))}

        {/* ── 4. PHOTO FLIP PANEL ─────────────────────── */}
        <section className="find-section-group">
          <div className="section-label" style={{ marginTop: '28px' }}>Room photos</div>
          <div className="find-group-helper">Upload up to 4 room views. Analysis starts automatically when all slots are filled.</div>

          <div className={`photo-flip-panel${isFlipped ? ' flipped' : ''}`}>
            <div className="photo-flip-inner">

            {/* FRONT ── upload grid */}
            <div className="photo-flip-front">
              {allPhotosUploaded && showUploadsView && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 12px', border: '1px solid rgba(74,103,65,0.18)', borderRadius: '10px', background: 'rgba(255,255,255,0.82)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--warm-grey)', lineHeight: '1.6' }}>
                    You are viewing uploads. Replace any photo card, then return to room context.
                  </div>
                  <button type="button" className="btn-skip" style={{ whiteSpace: 'nowrap', fontSize: '12px' }} onClick={goToAnalysis}>
                    Back to room context →
                  </button>
                </div>
              )}

              {allPhotosUploaded && showUploadsView ? (
                <div style={{ marginBottom: '14px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(74,103,65,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--warm-grey)', lineHeight: '1.6' }}>
                    Want to restart room understanding from scratch? Clear all photos and upload fresh room shots.
                  </div>
                  <button
                    type="button"
                    className="upload-btn"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={handleClearRoomPhotos}
                  >
                    Clear room photos
                  </button>
                </div>
              ) : (
                <div className="photo-progress">
                  <div className="photo-progress-bar">
                    <div className="photo-progress-fill" style={{ width: `${(photoCount / 4) * 100}%` }} />
                  </div>
                  <div className="photo-progress-label">
                    {photoCount === 0 && 'Upload photos from each wall for AI room analysis'}
                    {photoCount > 0 && photoCount < 4 && `${photoCount} of 4 photos uploaded — ${4 - photoCount} more to go`}
                    {allPhotosUploaded && 'All 4 photos ready — AI analysis starting…'}
                  </div>
                </div>
              )}

              <div className="photo-slot-grid">
                {photoSlots.map(slot => {
                  const preview = photoPreviews[slot.id]
                  const isDragging = isDraggingSlot === slot.id
                  return (
                    <div
                      key={slot.id}
                      className={`photo-slot${preview ? ' filled' : ''}${isDragging ? ' dragging' : ''}`}
                      onDrop={event => onSlotDrop(event, slot.id)}
                      onDragOver={event => { event.preventDefault(); onDragOverSlot(slot.id) }}
                      onDragLeave={onDragLeaveSlot}
                    >
                      {preview ? (
                        <>
                          <img src={preview} alt={slot.label} className="slot-img" />
                          <div className="slot-overlay">
                            <span className="slot-label-filled">{slot.label}</span>
                            <button type="button" className="slot-remove" onClick={() => onClearPhoto(slot.id)}>✕</button>
                          </div>
                        </>
                      ) : (
                        <button type="button" className="slot-empty" onClick={() => slotInputRefs.current[slot.id]?.click()}>
                          <span className="slot-icon">{slot.icon}</span>
                          <span className="slot-name">{slot.label}</span>
                          <span className="slot-hint">{slot.hint}</span>
                          <span className="slot-add">+ Add photo</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* BACK ── loader then room-read result */}
            <div className="photo-flip-back">
              {analysisLoading && (
                <div className="photo-flip-loading">
                  <div className="analysis-spinner photo-flip-spinner" />
                  <div className="photo-flip-loading-title">Reading your room…</div>
                  <div className="photo-flip-loading-sub">AI is analyzing colors, layout and spatial constraints</div>
                </div>
              )}

              {analysisError && !analysisLoading && (
                <div className="photo-flip-loading">
                  <span style={{ fontSize: '28px' }}>⚠️</span>
                  <div className="photo-flip-loading-title">Analysis failed</div>
                  <div className="photo-flip-loading-sub">{analysisError}</div>
                  <button type="button" className="upload-btn" style={{ marginTop: '12px' }} onClick={onRetryAnalysis}>
                    Retry analysis
                  </button>
                </div>
              )}

              {roomAnalysis && !analysisLoading && (
                <div className="photo-flip-result">
                  <div style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.98)', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid rgba(74,103,65,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="analysis-badge" style={{ marginBottom: '4px' }}>✦ AI Room Context</div>
                      <div style={{ fontSize: '12px', color: 'var(--warm-grey)', fontWeight: '500' }}>{Math.round(roomAnalysis.confidenceScore * 100)}% AI confidence</div>
                    </div>
                    <button type="button" className="btn-skip" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={goToUploads}>
                      📷 View uploads
                    </button>
                  </div>
                  <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--warm-grey)', lineHeight: '1.6', padding: '8px 10px', borderRadius: '8px', background: 'rgba(245,248,244,0.9)', border: '1px solid rgba(74,103,65,0.14)' }}>
                    If this read looks off, use "View uploads" and tap any photo card to replace it for better room context.
                  </div>
                  <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--charcoal)', lineHeight: '1.8', fontStyle: 'italic', borderLeft: '3px solid var(--moss)', paddingLeft: '12px' }}>
                    {roomAnalysis.roomSummary}
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Room Details</div>
                  </div>
                  <div className="analysis-grid">
                    <div className="analysis-cell" style={{ borderRadius: '10px' }}>
                      <div className="analysis-cell-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Wall Color</div>
                      <div className="analysis-cell-value" style={{ fontSize: '13px', fontWeight: '500' }}>{getAnalysisLabel(roomAnalysis.wallColor)}</div>
                    </div>
                    <div className="analysis-cell" style={{ borderRadius: '10px' }}>
                      <div className="analysis-cell-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Floor</div>
                      <div className="analysis-cell-value" style={{ fontSize: '13px', fontWeight: '500' }}>{getAnalysisLabel(roomAnalysis.floorType)}</div>
                    </div>
                    <div className="analysis-cell" style={{ borderRadius: '10px' }}>
                      <div className="analysis-cell-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Layout</div>
                      <div className="analysis-cell-value" style={{ fontSize: '13px', fontWeight: '500' }}>{getAnalysisText(roomAnalysis.roomLayout)}</div>
                    </div>
                    <div className="analysis-cell" style={{ borderRadius: '10px' }}>
                      <div className="analysis-cell-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Lighting</div>
                      <div className="analysis-cell-value" style={{ fontSize: '13px', fontWeight: '500' }}>{getAnalysisText(roomAnalysis.lighting)}</div>
                    </div>
                    <div className="analysis-cell" style={{ borderRadius: '10px' }}>
                      <div className="analysis-cell-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Style</div>
                      <div className="analysis-cell-value" style={{ fontSize: '13px', fontWeight: '500' }}>{getAnalysisLabel(roomAnalysis.styleProfile)}</div>
                    </div>
                    {roomAnalysis.estimatedWidthFt && roomAnalysis.estimatedDepthFt && (
                      <div className="analysis-cell" style={{ borderRadius: '10px' }}>
                        <div className="analysis-cell-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Est. Size</div>
                        <div className="analysis-cell-value" style={{ fontSize: '13px', fontWeight: '500' }}>~{roomAnalysis.estimatedWidthFt} × {roomAnalysis.estimatedDepthFt} ft</div>
                      </div>
                    )}
                  </div>
                  {roomAnalysis.existingFurniture?.length > 0 && (
                    <div style={{ marginTop: '18px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Existing Furniture</div>
                      <div className="understanding-tags" style={{ gap: '7px' }}>
                        {roomAnalysis.existingFurniture.map((item, i) => (
                          <span key={i} className="understanding-tag" style={{ fontSize: '12px' }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {roomAnalysis.softFurnishings?.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Soft Furnishings</div>
                      <div className="understanding-tags" style={{ gap: '7px' }}>
                        {roomAnalysis.softFurnishings.map((item, i) => (
                          <span key={i} className="understanding-tag" style={{ fontSize: '12px' }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {roomAnalysis.spatialConstraints?.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Spatial Constraints</div>
                      <div className="understanding-tags" style={{ gap: '7px' }}>
                        {roomAnalysis.spatialConstraints.map((item, i) => (
                          <span key={i} className="understanding-tag" style={{ fontSize: '12px' }}>{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {roomAnalysis.furnitureNeeds?.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>What This Room Needs</div>
                      <div className="understanding-tags" style={{ gap: '7px' }}>
                        {roomAnalysis.furnitureNeeds.map((item, i) => (
                          <span key={i} className="understanding-tag" style={{ fontSize: '12px' }}>{formatFurnitureNeed(item)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {roomAnalysis.colorPalette?.length > 0 && (
                    <div style={{ marginTop: '16px', marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Color Palette</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {roomAnalysis.colorPalette.map((color, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: color, border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} title={color} />
                            <span style={{ fontSize: '11px', color: 'var(--warm-grey)' }}>{getColorName(color)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            </div>
          </div>
        </section>

        {/* ── 5. INLINE QUESTIONS (below flip, after photos uploaded) ── */}
        {allPhotosUploaded && (
          <section className="find-section-group find-section-group--compact inline-questions-section">
            <div className="find-group-helper">Answer the generated prompts to sharpen ranking confidence.</div>
            {questionsLoading && (
              <div className="analysis-panel loading" style={{ marginTop: '20px' }}>
                <div className="analysis-spinner" />
                <div>
                  <div className="analysis-title">Generating questions…</div>
                </div>
              </div>
            )}

            {questionsError && !questionsLoading && (
              <div className="analysis-panel error" style={{ marginTop: '20px' }}>
                <span>⚠️</span>
                <div>
                  <div className="analysis-title">Could not generate questions</div>
                  <div className="analysis-sub">{questionsError}</div>
                  <button type="button" className="upload-btn" style={{ marginTop: '8px' }} onClick={onRetryQuestions}>
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!questionsLoading && question && (
              <div className="question-single" key={questionAnimKey} style={{ marginTop: '20px' }}>
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

            {!questionsLoading && contextualQuestions.length === 0 && !questionsError && roomAnalysis && (
              <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: 'var(--warm-white)', border: '1px solid var(--sand)', color: 'var(--warm-grey)', fontSize: '13px', lineHeight: '1.6' }}>
                Room read complete. No follow-up questions needed — continue to budget.
              </div>
            )}
          </section>
        )}

        {/* ── 6. BUTTONS ─────────────────────────────── */}
        <div className="btn-row" style={{ marginTop: '28px' }}>
          <button className="btn-back" onClick={onBack}>← Back</button>
          <button
            className="btn-next"
            onClick={onContinue}
            disabled={analysisLoading || questionsLoading}
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  )
}