'use client'

import Link from 'next/link'
import { FindProgressSteps } from './FindProgressSteps'
import type { FormData, MicroResponse } from '../find-page-model'

interface FurnitureTypeOption {
  id: string
  label: string
  icon: string
  desc: string
}

interface FindStepSelectionProps {
  form: FormData
  microResponse: MicroResponse | null
  livePillText: string
  furnitureTypes: FurnitureTypeOption[]
  roomOptions: string[]
  inventoryCounts: Record<string, number>
  getFurnitureLabel: (value: string) => string
  onSelectFurniture: (furnitureType: string) => void
  onSelectRoom: (roomType: string) => void
  onContinueManual: () => void
}

export function FindStepSelection({
  form,
  microResponse,
  livePillText,
  furnitureTypes,
  roomOptions,
  inventoryCounts,
  getFurnitureLabel,
  onSelectFurniture,
  onSelectRoom,
  onContinueManual,
}: FindStepSelectionProps) {
  return (
    <div className="page active">
      <FindProgressSteps currentStep={1} livePillText={livePillText} />

      <div className="form-body">
        <div className="form-eyebrow">Step 1 of 5</div>
        <h2 className="form-title">What are you looking for?</h2>

        {(microResponse || form.furnitureType || form.roomType) && (
          <div className={`understanding-card ${microResponse?.tone === 'success' ? 'success' : ''}`}>
            <div className="understanding-title">
              {microResponse?.title ?? (form.furnitureType ? `${getFurnitureLabel(form.furnitureType)} for your ${form.roomType}` : 'Waiting for your first signal')}
            </div>
            {(form.furnitureType || form.roomType) && (
              <div className="understanding-tags">
                {form.furnitureType && <span className="understanding-tag">{getFurnitureLabel(form.furnitureType)}</span>}
                {form.roomType && <span className="understanding-tag">{form.roomType}</span>}
                {form.furnitureType && <span className="understanding-tag">~{inventoryCounts[form.furnitureType] ?? 247} items to start</span>}
              </div>
            )}
          </div>
        )}

        <div className="section-label">Furniture type</div>
        <div className="chip-grid">
          {furnitureTypes.map(furnitureType => (
            <button
              key={furnitureType.id}
              onClick={() => onSelectFurniture(furnitureType.id)}
              className={`chip ${form.furnitureType === furnitureType.id ? 'selected' : ''}`}
            >
              <span className="chip-icon">{furnitureType.icon}</span>
              <span className="chip-label">{furnitureType.label}</span>
              <span className="chip-sub">{furnitureType.desc}</span>
            </button>
          ))}
        </div>

        {form.furnitureType && (
          <div className="room-section-reveal">
            <div className="divider"></div>
            <div className="section-label">Room it will go in</div>
            <div className="toggle-grid">
              {roomOptions.map(room => (
                <button
                  key={room}
                  className={`toggle-chip ${form.roomType === room ? 'selected' : ''}`}
                  onClick={() => onSelectRoom(room)}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="btn-row">
          <Link href="/" className="btn-back">← Home</Link>
          {form.furnitureType && form.roomType && (
            <button className="btn-skip" onClick={onContinueManual}>Continue manually →</button>
          )}
        </div>
      </div>
    </div>
  )
}