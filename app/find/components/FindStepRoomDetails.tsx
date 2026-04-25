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
      <FindProgressSteps currentStep={2} livePillText={livePillText} />

      <div className="form-body">
        {echoLine && <div className="echo-panel">{echoLine}</div>}
        <div className="form-eyebrow">Step 2 of 5</div>
        <h2 className="form-title">Tell us about your room</h2>
        <p className="form-sub">Upload up to 4 room photos for AI analysis, or fill in details below.</p>

        <div className={`understanding-card ${roomAnalysis ? 'success' : ''}`}>
          <div className="understanding-title">
            {roomAnalysis
              ? 'I have room context now'
              : photoCount > 0
                ? `${photoCount} room views captured`
                : 'I can work from photos or your manual answers'}
          </div>
          <div className="understanding-tags">
            <span className="understanding-tag">{photoCount}/4 photos</span>
            {roomAnalysis?.lighting && <span className="understanding-tag">{getAnalysisText(roomAnalysis.lighting)}</span>}
            {roomAnalysis?.spatialConstraints?.[0] && <span className="understanding-tag">{roomAnalysis.spatialConstraints[0]}</span>}
          </div>
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
          <div className="analysis-panel success">
            <div className="analysis-header">
              <div className="analysis-badge">✦ AI Room Context</div>
              <div className="analysis-confidence">{Math.round(roomAnalysis.confidenceScore * 100)}% confidence</div>
            </div>
            <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(92,107,74,.08)', color: 'var(--charcoal)', fontSize: '14px', lineHeight: '1.6' }}>
              {roomAnalysis.roomSummary}
            </div>
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

        <div className="upload-or">OR ANSWER MANUALLY</div>

        <div className="section-label">Wall color</div>
        <div className="toggle-grid" style={{ marginBottom: '24px', opacity: roomAnalysis ? 0.5 : 1, pointerEvents: roomAnalysis ? 'none' : 'auto' }}>
          {wallColors.map(wallColor => (
            <button
              key={wallColor.id}
              className={`toggle-chip ${form.wallColor === wallColor.id ? 'selected' : ''}`}
              onClick={() => onSetField('wallColor', wallColor.id)}
              disabled={!!roomAnalysis}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: wallColor.color, border: '1px solid #ccc', display: 'inline-block' }}></span>
              {wallColor.label}
            </button>
          ))}
        </div>

        <div className="section-label">Floor type</div>
        <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px', opacity: roomAnalysis ? 0.5 : 1, pointerEvents: roomAnalysis ? 'none' : 'auto' }}>
          {floorTypes.map(floorType => (
            <button
              key={floorType.id}
              className={`chip ${form.floorType === floorType.id ? 'selected' : ''}`}
              onClick={() => onSetField('floorType', floorType.id)}
              disabled={!!roomAnalysis}
              style={{ textAlign: 'center', padding: '14px 8px' }}
            >
              <span className="chip-icon">{floorType.icon}</span>
              <span className="chip-label" style={{ fontSize: '12px' }}>{floorType.label}</span>
            </button>
          ))}
        </div>

        <div className="section-label">Room layout & rough size</div>
        <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px', opacity: roomAnalysis ? 0.5 : 1, pointerEvents: roomAnalysis ? 'none' : 'auto' }}>
          {roomLayouts.map(roomLayout => (
            <button
              key={roomLayout.id}
              className={`chip ${form.roomLayout === roomLayout.id ? 'selected' : ''}`}
              onClick={() => onSetField('roomLayout', roomLayout.id)}
              disabled={!!roomAnalysis}
              style={{ textAlign: 'center', padding: '14px 8px' }}
            >
              <span className="chip-icon">{roomLayout.icon}</span>
              <span className="chip-label" style={{ fontSize: '12px' }}>{roomLayout.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px', opacity: roomAnalysis ? 0.5 : 1, pointerEvents: roomAnalysis ? 'none' : 'auto' }}>
          <div className="text-input-wrap" style={{ marginBottom: '0' }}>
            <label>Room width (feet)</label>
            <input type="number" placeholder="e.g. 14" value={form.roomWidth} onChange={event => onSetField('roomWidth', Number(event.target.value))} disabled={!!roomAnalysis} />
          </div>
          <div className="text-input-wrap" style={{ marginBottom: '0' }}>
            <label>Room depth (feet)</label>
            <input type="number" placeholder="e.g. 12" value={form.roomDepth} onChange={event => onSetField('roomDepth', Number(event.target.value))} disabled={!!roomAnalysis} />
          </div>
        </div>

        <div className="btn-row">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button className="btn-skip" onClick={onSkip}>Skip this step</button>
            <button className="btn-next" onClick={onContinue} disabled={analysisLoading || questionsLoading}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}