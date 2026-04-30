'use client'

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
  contextualQuestions: ContextualQuestion[]
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
  onSetField: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  onBack: () => void
  onSkip: () => void
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
  contextualQuestions,
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
  onSetField,
  onBack,
  onSkip,
  onContinue,
}: FindStepRoomDetailsProps) {
  return (
    <div className="page active">
      {showProgress && <FindProgressSteps currentStep={2} livePillText={livePillText} />}

      <div className="form-body journey-form-body room-journey-body">
        {echoLine && <div className="echo-panel">{echoLine}</div>}
        <div className="form-eyebrow">Step 2 of 5</div>
        <h2 className="form-title">Tell us about your room</h2>
        <p className="form-sub">Upload up to four photos. If not, add rough dimensions and continue.</p>

        <div className="understanding-tags compact-step-tags">
          <span className="understanding-tag">{photoCount}/4 photos</span>
          {roomAnalysis?.lighting && <span className="understanding-tag">{getAnalysisText(roomAnalysis.lighting)}</span>}
          {roomAnalysis?.spatialConstraints?.[0] && <span className="understanding-tag">{roomAnalysis.spatialConstraints[0]}</span>}
        </div>

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

        <div className="photo-progress">
          <div className="photo-progress-bar">
            <div className="photo-progress-fill" style={{ width: `${(photoCount / 4) * 100}%` }} />
          </div>
          <div className="photo-progress-label">
            {photoCount === 0 && 'Upload photos from each wall for AI room analysis'}
            {photoCount > 0 && photoCount < 4 && `${photoCount} of 4 photos uploaded — ${4 - photoCount} more to go`}
            {allPhotosUploaded && !analysisLoading && !roomAnalysis && 'Sending to AI for analysis…'}
            {analysisLoading && '✦ AI is analyzing your room…'}
            {roomAnalysis && `✓ Room analyzed · ${Math.round(roomAnalysis.confidenceScore * 100)}% confidence`}
          </div>
        </div>

        <div className="photo-slot-grid">
          {photoSlots.map(slot => {
            const preview = photoPreviews[slot.id]
            const isDragging = isDraggingSlot === slot.id

            return (
              <div
                key={slot.id}
                className={`photo-slot${preview ? ' filled' : ''}${isDragging ? ' dragging' : ''}`}
                onDrop={event => onSlotDrop(event, slot.id)}
                onDragOver={event => {
                  event.preventDefault()
                  onDragOverSlot(slot.id)
                }}
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

        {analysisLoading && (
          <div className="analysis-panel loading">
            <div className="analysis-spinner" />
            <div>
              <div className="analysis-title">Analyzing your room…</div>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="analysis-panel error">
            <span>⚠️</span>
            <div>
              <div className="analysis-title">Analysis failed</div>
              <div className="analysis-sub">{analysisError}</div>
              <button type="button" className="upload-btn" style={{ marginTop: '8px' }} onClick={onRetryAnalysis}>
                Retry analysis
              </button>
            </div>
          </div>
        )}

        {roomAnalysis && !analysisLoading && (
          <div className="analysis-panel success room-analysis-preview">
            <div className="analysis-header">
              <div className="analysis-badge">✦ Room read complete</div>
              <div className="analysis-confidence">{Math.round(roomAnalysis.confidenceScore * 100)}% confidence</div>
            </div>
            <div className="analysis-sub">Room context is ready. Next we ask only what the images cannot answer.</div>
          </div>
        )}

        <div className="upload-or">OPTIONAL: ADD ROOM DIMENSIONS</div>

        <div className="room-dimension-grid">
          <div className="text-input-wrap compact">
            <label>Room width (feet)</label>
            <input type="number" placeholder="e.g. 14" value={form.roomWidth} onChange={event => onSetField('roomWidth', Number(event.target.value))} />
          </div>
          <div className="text-input-wrap compact">
            <label>Room depth (feet)</label>
            <input type="number" placeholder="e.g. 12" value={form.roomDepth} onChange={event => onSetField('roomDepth', Number(event.target.value))} />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <div className="room-step-actions">
            <button className="btn-skip" onClick={onSkip}>Use dimensions only</button>
            <button className="btn-next" onClick={onContinue} disabled={analysisLoading || questionsLoading}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}