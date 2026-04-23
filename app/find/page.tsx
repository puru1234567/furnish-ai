'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { FindStepQuestions } from './components/FindStepQuestions'
import { FindStepRoomDetails } from './components/FindStepRoomDetails'
import { FindStepSelection } from './components/FindStepSelection'
import { ResultsDisplay } from './components/ResultsDisplay'
import type { FormData, MicroResponse, PhotoSlotId } from './find-page-model'
import type {
  ContextualQuestion,
  UserContext,
  StyleTag,
  PurchaseTrigger,
  PainPointType,
  RecommendedItem,
  RecommendationResponse,
  RoomType,
  Urgency,
  RankingPriority,
  RoomAnalysis,
} from '@/lib/types'
import {
  FURNITURE_TYPES,
  ROOM_OPTIONS,
  GUIDE_MESSAGES,
  INVENTORY_COUNTS,
  PAIN_PROFILES,
  STYLES,
  MATERIAL_AVOIDANCES,
  BRANDS,
  CITIES,
  WALL_COLORS,
  FLOOR_TYPES,
  ROOM_LAYOUTS,
  UNIVERSAL_NEEDS,
  FURNITURE_SPECIFIC_NEEDS,
  AVOIDABLE_ISSUES,
  BUDGET_OPTIONS,
  TIMELINES,
  DELIVERIES,
  DEFAULTS,
  PHOTO_SLOTS,
} from './find-page-constants'
import {
  fmt,
  getFurnitureLabel,
  getQuestionOptionLabel,
  getAnalysisLabel,
  getAnalysisText,
} from './find-page-utils'

export default function FindPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(DEFAULTS)
  const [results, setResults] = useState<RecommendedItem[]>([])
  const [meta, setMeta] = useState<Pick<RecommendationResponse, 'summary' | 'archetypeLabel' | 'contextInsights' | 'flaggedIssues'>>({ summary: '', archetypeLabel: '', contextInsights: [], flaggedIssues: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [compareItems, setCompareItems] = useState<string[]>([])
  const [priceFilter, setPriceFilter] = useState(45000)

  const [roomPhotos, setRoomPhotos] = useState<Record<PhotoSlotId, File | null>>({ front: null, left: null, right: null, back: null })
  const [photoPreviews, setPhotoPreviews] = useState<Record<PhotoSlotId, string | null>>({ front: null, left: null, right: null, back: null })
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [contextualQuestions, setContextualQuestions] = useState<ContextualQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState('')
  const [questionSubIndex, setQuestionSubIndex] = useState(0)
  const [microResponse, setMicroResponse] = useState<MicroResponse | null>(null)
  const [loadingStageIndex, setLoadingStageIndex] = useState(0)
  const [passiveCtx, setPassiveCtx] = useState<{ device: string; timeLabel: string; isReturn: boolean; refSource: string } | null>(null)
  const stepRef = useRef(0)
  const questionSubIndexRef = useRef(0)
  const stepEnteredAt = useRef<number>(Date.now())
  const hesitations = useRef<Record<number, number>>({})
  const [isDraggingSlot, setIsDraggingSlot] = useState<PhotoSlotId | null>(null)
  const slotInputRefs = useRef<Record<PhotoSlotId, HTMLInputElement | null>>({ front: null, left: null, right: null, back: null })
  const microResponseTimeoutRef = useRef<number | null>(null)

  const photoCount = Object.values(roomPhotos).filter(Boolean).length
  const allPhotosUploaded = photoCount === 4
  const getPhotoSlotLabel = (slotId: PhotoSlotId) => PHOTO_SLOTS.find(slot => slot.id === slotId)?.label ?? slotId

  const showMicroResponse = useCallback((title: string, detail: string, tone: MicroResponse['tone'] = 'info') => {
    if (microResponseTimeoutRef.current) {
      window.clearTimeout(microResponseTimeoutRef.current)
    }
    setMicroResponse({ title, detail, tone })
    microResponseTimeoutRef.current = window.setTimeout(() => {
      setMicroResponse(null)
      microResponseTimeoutRef.current = null
    }, 3200)
  }, [])

  const generateContextualQuestions = async (analysis: RoomAnalysis | null) => {
    setQuestionsLoading(true)
    setQuestionsError('')
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          furnitureType: form.furnitureType,
          roomType: form.roomType,
          roomAnalysis: analysis,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch((): { error?: string } => ({}))
        throw new Error(err.error ?? 'Failed to generate follow-up questions')
      }

      const data = await res.json() as { questions?: ContextualQuestion[] }
      setContextualQuestions(Array.isArray(data.questions) ? data.questions.slice(0, 4) : [])
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        showMicroResponse('Questions ready', `I found ${Math.min(data.questions.length, 4)} follow-ups based on your room and ${getFurnitureLabel(form.furnitureType)} choice.`, 'success')
      }
    } catch (e: unknown) {
      setQuestionsError(e instanceof Error ? e.message : 'Failed to generate follow-up questions')
      setContextualQuestions([])
    } finally {
      setQuestionsLoading(false)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })

  const compressImageFile = async (file: File, maxWidth = 1280, quality = 0.72): Promise<string> => {
    const sourceDataUrl = await fileToDataUrl(file)

    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))

        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Failed to create image compression context'))
          return
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.onerror = () => reject(new Error('Failed to decode image for compression'))
      image.src = sourceDataUrl
    })
  }

  const compressImageFileForApi = async (file: File): Promise<string> => {
    // Higher quality for vision API (92%+ confidence) — still compressed but better quality
    return compressImageFile(file, 1920, 0.92)
  }

  const handlePhotoFile = useCallback((slot: PhotoSlotId, file: File) => {
    if (!file.type.startsWith('image/')) return
    const nextCount = Math.min(4, photoCount + (roomPhotos[slot] ? 0 : 1))
    setRoomPhotos(prev => ({ ...prev, [slot]: file }))
    showMicroResponse('Photo added', `${getPhotoSlotLabel(slot)} uploaded. ${nextCount} of 4 room views are ready for analysis.`, 'success')
    void compressImageFile(file)
      .then(dataUrl => {
        setPhotoPreviews(prev => {
          const next = { ...prev, [slot]: dataUrl }
          const allFilled = Object.values(next).every(v => v !== null)
          if (allFilled) {
            triggerRoomAnalysis(Object.values(next) as string[])
          }
          return next
        })
      })
      .catch(error => {
        console.error('[photo-compression]', error)
        setAnalysisError(error instanceof Error ? error.message : 'Failed to prepare image')
      })
  }, [compressImageFile, photoCount, roomPhotos, showMicroResponse])

  const triggerRoomAnalysis = async (previews: string[]) => {
    setAnalysisLoading(true)
    setAnalysisError('')
    setRoomAnalysis(null)
    setContextualQuestions([])
    setQuestionsError('')
    try {
      // Use higher quality images for API (92%+ confidence) instead of preview versions
      const apiImages = await Promise.all(
        Object.values(roomPhotos)
          .filter(Boolean)
          .map(file => file ? compressImageFileForApi(file) : null)
      ).then(images => images.filter(Boolean) as string[])

      const res = await fetch('/api/analyze-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: apiImages, furnitureType: form.furnitureType, roomType: form.roomType }),
      })
      if (!res.ok) {
        const err = await res.json().catch((): { error?: string } => ({}))
        throw new Error(err.error ?? 'Room analysis failed')
      }
      const data: RoomAnalysis = await res.json()
      setRoomAnalysis(data)
      showMicroResponse('Room understood', data.roomSummary, 'success')
      await generateContextualQuestions(data)
    } catch (e: unknown) {
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const clearPhoto = (slot: PhotoSlotId) => {
    setRoomPhotos(prev => ({ ...prev, [slot]: null }))
    setPhotoPreviews(prev => ({ ...prev, [slot]: null }))
    setRoomAnalysis(null)
    setContextualQuestions([])
    setQuestionsError('')
    setAnalysisError('')
    showMicroResponse('Photo removed', `${getPhotoSlotLabel(slot)} cleared. Add it again if you want a fuller room read.`, 'info')
    if (slotInputRefs.current[slot]) slotInputRefs.current[slot]!.value = ''
  }

  const handleSlotDrop = useCallback((e: React.DragEvent, slot: PhotoSlotId) => {
    e.preventDefault()
    setIsDraggingSlot(null)
    const file = e.dataTransfer.files[0]
    if (file) handlePhotoFile(slot, file)
  }, [handlePhotoFile])

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(p => ({ ...p, [k]: v }))
  const toggleArray = (key: 'materialsToAvoid' | 'trustedBrands' | 'painPoint' | 'mustHaveFeatures' | 'pastIssues' | 'universalMaterials', val: string | PainPointType) => {
    setForm(p => {
      const arr = p[key]
      if (Array.isArray(arr)) {
        return { ...p, [key]: arr.includes(val as never) ? arr.filter(x => x !== val) : [...arr, val as never] }
      }
      return p
    })
  }

  const next = () => {
    hesitations.current[stepRef.current] = (Date.now() - stepEnteredAt.current) / 1000
    stepEnteredAt.current = Date.now()
    setStep(s => s + 1)
  }
  const back = () => {
    stepEnteredAt.current = Date.now()
    setStep(s => s - 1)
  }
  const reset = () => { setStep(0); setForm(DEFAULTS); setResults([]); setError(''); setCompareItems([]); setCompareMode(false); setRoomPhotos({ front: null, left: null, right: null, back: null }); setPhotoPreviews({ front: null, left: null, right: null, back: null }); setRoomAnalysis(null); setContextualQuestions([]); setQuestionsError(''); setAnalysisError(''); setQuestionSubIndex(0) }

  const continueFromRoomStep = async () => {
    setQuestionSubIndex(0)
    if (contextualQuestions.length === 0 && !questionsLoading) {
      await generateContextualQuestions(roomAnalysis)
    }
    next()
  }

  const submit = async () => {
    // Map form data to UserContext
    setLoading(true); setError(''); setStep(99)
    try {
      const roomSqftFromAnalysis = roomAnalysis?.estimatedWidthFt && roomAnalysis?.estimatedDepthFt
        ? roomAnalysis.estimatedWidthFt * roomAnalysis.estimatedDepthFt
        : form.roomWidth * form.roomDepth

      const ctx: UserContext = {
        roomType: form.roomType as RoomType,
        roomSqft: roomSqftFromAnalysis,
        city: form.city,
        deliveryOk: true,
        furnitureType: form.furnitureType,
        budget: form.budget,
        budgetMax: form.budgetMax,
        purchaseTrigger: 'new_home' as PurchaseTrigger,
        existingFurnitureDesc: roomAnalysis?.existingFurniture.join(', ') ?? '',
        painPoint: form.painPoint,
        stylePreference: [] as StyleTag[],
        useCase: [],
        alreadyRejected: '',
        roomContext: roomAnalysis ? {
          summary: roomAnalysis.roomSummary,
          furnitureNeeds: roomAnalysis.furnitureNeeds,
          spatialConstraints: roomAnalysis.spatialConstraints,
          existingFurniture: roomAnalysis.existingFurniture,
          lighting: roomAnalysis.lighting,
        } : undefined,
        contextualAnswers: Object.keys(form.contextualAnswers).length > 0 ? form.contextualAnswers : undefined,
        urgency: 'next_month' as Urgency,
        rankingPriority: 'quality' as RankingPriority,
      }
      
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      })
      
      if (!res.ok) {
        const errData = await res.json().catch((): { error?: string } => ({}))
        setError(errData.error || 'API failed')
        setStep(101)
        return
      }
      
      const data: RecommendationResponse = await res.json()
      setResults(data.items ?? [])
      setMeta({
        summary: data.summary,
        archetypeLabel: data.archetypeLabel,
        contextInsights: data.contextInsights ?? [],
        flaggedIssues: data.flaggedIssues ?? []
      })
      setStep(100)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Something went wrong')
      setStep(101)
    } finally {
      setLoading(false)
    }
  }

  const toggleCompare = (itemId: string) => {
    if (compareItems.includes(itemId)) {
      setCompareItems(compareItems.filter(id => id !== itemId))
    } else if (compareItems.length < 2) {
      setCompareItems([...compareItems, itemId])
    }
  }

  // Sync step/questionSubIndex to refs for stable keyboard handler
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { questionSubIndexRef.current = questionSubIndex }, [questionSubIndex])

  // Passive context signals
  useEffect(() => {
    const ua = navigator.userAgent
    const isMobile = /Mobi|Android/i.test(ua)
    const hour = new Date().getHours()
    const timeLabel = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
    const refSource = document.referrer.includes('google') ? 'Google'
      : document.referrer.includes('instagram') ? 'Instagram'
      : document.referrer ? 'Link' : 'Direct'
    const isReturn = sessionStorage.getItem('furnish-visited') === 'true'
    sessionStorage.setItem('furnish-visited', 'true')
    setPassiveCtx({ device: isMobile ? 'Mobile' : 'Desktop', timeLabel, isReturn, refSource })
  }, [])

  useEffect(() => {
    if (!loading) {
      setLoadingStageIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setLoadingStageIndex(prev => (prev + 1) % 4)
    }, 1600)

    return () => window.clearInterval(intervalId)
  }, [loading])

  useEffect(() => () => {
    if (microResponseTimeoutRef.current) {
      window.clearTimeout(microResponseTimeoutRef.current)
    }
  }, [])

  // Keyboard navigation (Enter = advance, ArrowUp/Backspace = back)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = stepRef.current
      if (e.key === 'Enter' && s >= 0 && s <= 4) {
        if (s === 2) {
          const qi = questionSubIndexRef.current
          if (qi < contextualQuestions.length - 1) setQuestionSubIndex(qi + 1)
          else next()
        } else {
          next()
        }
      }
      if ((e.key === 'ArrowUp' || e.key === 'Backspace') && s > 0 && s <= 4) {
        if (s === 2 && questionSubIndexRef.current > 0) {
          setQuestionSubIndex(qi => qi - 1)
        } else {
          back()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextualQuestions.length])

  // Derived display values
  const livePillText = form.furnitureType
    ? `✦ ${INVENTORY_COUNTS[form.furnitureType] ?? 247} ${form.furnitureType}s in ${form.city}`
    : '✦ 247 items available'
  const echoLine = form.furnitureType
    ? `${INVENTORY_COUNTS[form.furnitureType] ?? '—'} ${form.furnitureType}s · ${form.roomType} · ${form.city}`
    : ''
  const currentGuide = GUIDE_MESSAGES[step] ?? GUIDE_MESSAGES[0]
  const guideSuffix = step === 2 && contextualQuestions[questionSubIndex]?.reasoning
    ? contextualQuestions[questionSubIndex].reasoning!
    : currentGuide.why
  const selectedContextualCount = Object.keys(form.contextualAnswers).length
  const currentQuestion = contextualQuestions[questionSubIndex]
  const currentQuestionAnswer = currentQuestion ? form.contextualAnswers[currentQuestion.id] : undefined
  const budgetFitEstimate = Math.max(6, Math.round((INVENTORY_COUNTS[form.furnitureType] ?? 247) * Math.min(1, form.budget / 90000)))
  const loadingStages = [
    `Checking ${form.city} inventory for ${getFurnitureLabel(form.furnitureType || 'sofa')}`,
    'Scoring for room constraints, delivery, and budget fit',
    'Writing short why-it-fits explanations for the best options',
    'Packaging primary and stretch picks for review',
  ]

  return (
    <>
      <header className="site-header">
        <div className="logo">Furnish<span>AI</span></div>
        <Link href="/" className="btn-skip">← Back to home</Link>
      </header>

      {step === 0 && (
        <FindStepSelection
          form={form}
          microResponse={microResponse}
          livePillText={livePillText}
          furnitureTypes={FURNITURE_TYPES}
          roomOptions={ROOM_OPTIONS}
          inventoryCounts={INVENTORY_COUNTS}
          getFurnitureLabel={getFurnitureLabel}
          onSelectFurniture={furnitureType => {
            set('furnitureType', furnitureType)
            const selected = FURNITURE_TYPES.find(item => item.id === furnitureType)
            showMicroResponse('Furniture locked in', `I’ll start from ${INVENTORY_COUNTS[furnitureType] ?? 247} ${selected?.label.toLowerCase() ?? furnitureType} options and narrow from there.`, 'success')
          }}
          onSelectRoom={roomType => {
            set('roomType', roomType)
            showMicroResponse('Room context added', `${getFurnitureLabel(form.furnitureType || 'furniture')} · ${roomType}`, 'success')
            setTimeout(next, 380)
          }}
          onContinueManual={next}
        />
      )}

      {step === 1 && (
        <FindStepRoomDetails
          form={form}
          livePillText={livePillText}
          echoLine={echoLine}
          photoSlots={PHOTO_SLOTS}
          photoCount={photoCount}
          allPhotosUploaded={allPhotosUploaded}
          photoPreviews={photoPreviews}
          roomAnalysis={roomAnalysis}
          analysisLoading={analysisLoading}
          analysisError={analysisError}
          questionsLoading={questionsLoading}
          contextualQuestions={contextualQuestions}
          isDraggingSlot={isDraggingSlot}
          slotInputRefs={slotInputRefs}
          wallColors={WALL_COLORS}
          floorTypes={FLOOR_TYPES}
          roomLayouts={ROOM_LAYOUTS}
          getAnalysisLabel={getAnalysisLabel}
          getAnalysisText={getAnalysisText}
          onPhotoChange={handlePhotoFile}
          onSlotDrop={handleSlotDrop}
          onDragOverSlot={setIsDraggingSlot}
          onDragLeaveSlot={() => setIsDraggingSlot(null)}
          onClearPhoto={clearPhoto}
          onRetryAnalysis={() => {
            const previews = Object.values(photoPreviews).filter(Boolean) as string[]
            if (previews.length === 4) {
              void triggerRoomAnalysis(previews)
            }
          }}
          onSetField={set}
          onBack={back}
          onSkip={next}
          onContinue={() => { void continueFromRoomStep() }}
        />
      )}

      {step === 2 && (
        <FindStepQuestions
          form={form}
          livePillText={livePillText}
          echoLine={echoLine}
          furnitureTypeLabel={form.furnitureType}
          selectedContextualCount={selectedContextualCount}
          contextualQuestions={contextualQuestions}
          questionSubIndex={questionSubIndex}
          questionsLoading={questionsLoading}
          questionsError={questionsError}
          getQuestionOptionLabel={getQuestionOptionLabel}
          onRetry={() => { void generateContextualQuestions(roomAnalysis) }}
          onSelectAnswer={(questionId, optionId, questionText, optionLabel) => {
            set('contextualAnswers', { ...form.contextualAnswers, [questionId]: optionId })
            showMicroResponse('Answer saved', `${questionText} → ${optionLabel}`, 'success')
            setTimeout(() => {
              if (questionSubIndex < contextualQuestions.length - 1) {
                setQuestionSubIndex(current => current + 1)
              } else {
                next()
              }
            }, 320)
          }}
          onPreviousQuestion={() => setQuestionSubIndex(current => current - 1)}
          onBack={back}
          onContinue={next}
        />
      )}

      {/* ═════════════════════════════════
          STEP 3: BUDGET & CONSTRAINTS
          (Matches HTML Step 4 exactly)
          ═════════════════════════════════ */}
      {step === 3 && (
        <div className="page active">
          {/* PROGRESS BAR */}
          <div className="form-chrome">
            <div className="progress-steps">
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot active">4</div>
              <div className="step-line"></div>
              <div className="step-dot pending">5</div>
            </div>
            <div className="live-count">{livePillText}</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            {echoLine && <div className="echo-panel">{echoLine}</div>}
            <div className="form-eyebrow">Step 4 of 5</div>
            <h2 className="form-title">Budget & when you need it</h2>

            <div className="understanding-card success">
              <div className="understanding-title">Targeting around {fmt(form.budget)}</div>
              
              <div className="understanding-tags">
                <span className="understanding-tag">~{budgetFitEstimate} items in range</span>
                <span className="understanding-tag">{form.timeline}</span>
                <span className="understanding-tag">{form.deliveryPreference}</span>
              </div>
            </div>

            {/* BUDGET SLIDER */}
            <div className="slider-wrap">
              <div className="slider-value">
                ₹<span id="sliderVal">{form.budget.toLocaleString('en-IN')}</span> <span>max budget</span>
              </div>
              <div className="slider-labels">
                <span>₹5,000</span>
                <span>₹5 lakh</span>
              </div>
              <input
                type="range"
                min="5000"
                max="500000"
                step="1000"
                value={form.budget}
                onChange={e => set('budget', Number(e.target.value))}
              />
              <div className="slider-hint">
                ↑ Most sofas matching your filters: ₹22k – ₹38k · <span id="sliderCount">34</span> items in range
              </div>
            </div>

            {/* BUDGET FLEXIBILITY */}
            <div className="section-label">Budget flexibility</div>
            <div className="budget-split">
              {BUDGET_OPTIONS.map((opt, idx) => (
                <button
                  key={idx}
                  className={`budget-option ${form.budgetFlexibility === opt.label ? 'selected' : ''}`}
                  onClick={() => set('budgetFlexibility', opt.label)}
                >
                  <div className="bo-title">{opt.label}</div>
                  <div className="bo-sub">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* TIMELINE */}
            <div className="section-label">When do you need it?</div>
            <div className="toggle-grid">
              {TIMELINES.map((t, idx) => (
                <button
                  key={idx}
                  className={`toggle-chip ${form.timeline === t ? 'selected' : ''}`}
                  onClick={() => set('timeline', t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* DELIVERY PREFERENCE */}
            <div className="section-label">Delivery preference</div>
            <div className="toggle-grid">
              {DELIVERIES.map((d, idx) => (
                <button
                  key={idx}
                  className={`toggle-chip ${form.deliveryPreference === d ? 'selected' : ''}`}
                  onClick={() => set('deliveryPreference', d)}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* BUTTONS */}
            <div className="btn-row">
              <button className="btn-back" onClick={back}>
                ← Back
              </button>
              <button className="btn-next" onClick={next}>
                Continue → <span>Final touches</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════
          STEP 4: REFINEMENTS (OPTIONAL)
          (Matches HTML Step 5 exactly)
          ═════════════════════════════════ */}
      {step === 4 && (
        <div className="page active">
          {/* PROGRESS BAR */}
          <div className="form-chrome">
            <div className="progress-steps">
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot active">5</div>
            </div>
            <div className="live-count">{livePillText}</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            {echoLine && <div className="echo-panel">{echoLine}</div>}
            <div className="form-eyebrow">Step 5 of 5 — optional</div>
            <h2 className="form-title">Fine-tune <span className="optional-tag">all optional — skip to results</span></h2>

            {/* MATERIALS TO AVOID */}
            <div className="section-label">Materials to avoid</div>
            <div className="toggle-grid">
              {MATERIAL_AVOIDANCES.map((m, idx) => (
                <button
                  key={idx}
                  className={`toggle-chip ${form.materialsToAvoid.includes(m) ? 'selected' : ''}`}
                  onClick={() => toggleArray('materialsToAvoid', m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="divider"></div>

            {/* AESTHETIC STYLE */}
            <div className="section-label">Aesthetic style <span className="optional-tag">optional</span></div>
            <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  className={`chip ${form.aestheticStyle === s.id ? 'selected' : ''}`}
                  onClick={() => set('aestheticStyle', s.id)}
                >
                  <span className="chip-icon">{s.icon}</span>
                  <span className="chip-label">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="divider"></div>

            {/* TRUSTED BRANDS */}
            <div className="section-label">Brands you trust (or avoid) <span className="optional-tag">optional</span></div>
            <div className="toggle-grid" style={{ marginBottom: '8px' }}>
              {BRANDS.map((b, idx) => (
                <button
                  key={idx}
                  className={`toggle-chip ${form.trustedBrands.includes(b) ? 'selected' : ''}`}
                  onClick={() => toggleArray('trustedBrands', b)}
                >
                  {b}
                </button>
              ))}
            </div>


            <div className="divider"></div>

            {/* ADDITIONAL NOTES */}
            <div className="text-input-wrap">
              <label>Anything else we should know? <span className="optional-tag">optional freetext</span></label>
              <textarea
                rows={3}
                placeholder="e.g. I need it to fit a corner wall, or my cat will scratch anything with texture"
                value={form.additionalNotes}
                onChange={e => set('additionalNotes', e.target.value)}
              />
            </div>

            {/* BUTTONS */}
            <div className="btn-row">
              <button className="btn-back" onClick={back}>
                ← Back
              </button>
              <button
                className="btn-next"
                onClick={submit}
                disabled={loading}
                style={{ fontSize: '15px', padding: '15px 36px', background: 'var(--charcoal)' }}
              >
                {loading ? '⏳ Finding...' : '✦ Get my recommendations'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════
          LOADING STATE (step 99)
          ═════════════════════════════════ */}
      {step === 99 && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '100px', paddingBottom: '100px', background: 'var(--cream)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h1 style={{ fontSize: '32px', fontFamily: "'DM Serif Display', serif", color: 'var(--charcoal)', marginBottom: '14px', textAlign: 'center' }}>
            Finding your matches
          </h1>
          <div className="loading-story-card">
            <div className="loading-story-label">Status</div>
            <div className="loading-story-title">{loadingStages[loadingStageIndex]}</div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════
          ERROR STATE (step 101)
          ═════════════════════════════════ */}
      {step === 101 && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '100px', paddingBottom: '100px', background: 'var(--cream)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h1 style={{ fontSize: '36px', fontFamily: "'DM Serif Display', serif", color: 'var(--charcoal)', marginBottom: '14px', textAlign: 'center' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--terracotta-dark)', textAlign: 'center', maxWidth: '500px', marginBottom: '24px' }}>
            {error}
          </p>
          <div className="btn-row" style={{ justifyContent: 'center', gap: '12px' }}>
            <button onClick={reset} className="btn-back" style={{ flex: '0 1 auto' }}>
              Start over
            </button>
            <button onClick={back} className="btn-next" style={{ flex: '0 1 auto' }}>
              Back to last step
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════
          RESULTS PAGE (step 100)
          ═════════════════════════════════ */}
      {step === 100 && (
        <ResultsDisplay
          results={results}
          meta={meta}
          form={form}
          roomAnalysis={roomAnalysis}
          priceFilter={priceFilter}
          compareMode={compareMode}
          compareItems={compareItems}
          onPriceFilterChange={setPriceFilter}
          onCompareToggle={toggleCompare}
          onCompareModeToggle={() => setCompareMode(!compareMode)}
          onCityChange={city => set('city', city)}
          onReset={reset}
        />
      )}

      {/* ✦ TOP PROGRESS BAR */}
      {step >= 0 && step <= 4 && (
        <div id="top-progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
      )}

      {/* ✦ GUIDE BUBBLE — fixed bottom-left */}
      {step >= 0 && step <= 4 && (
        <div id="guide-bubble">
          <div className="guide-avatar">✦</div>
          <div className="guide-bubble-body">
            <div className="guide-bubble-text">{currentGuide.main}</div>
            <div className="guide-why">{guideSuffix}</div>
          </div>
        </div>
      )}

      {microResponse && step >= 0 && step <= 4 && (
        <div className={`micro-response ${microResponse.tone === 'success' ? 'success' : ''}`}>
          <div className="micro-response-label">System reply</div>
          <div className="micro-response-title">{microResponse.title}</div>
          <div className="micro-response-body">{microResponse.detail}</div>
        </div>
      )}

      {/* ✦ PASSIVE CONTEXT HUD — fixed top-right */}
      {passiveCtx && step >= 0 && step <= 4 && (
        <div id="context-hud">
          <div className="hud-row"><span className="hud-key">Device</span><span className="hud-val">{passiveCtx.device}</span></div>
          <div className="hud-row"><span className="hud-key">Time</span><span className="hud-val">{passiveCtx.timeLabel}</span></div>
          <div className="hud-row"><span className="hud-key">Session</span><span className="hud-val">{passiveCtx.isReturn ? 'Returning' : 'New'}</span></div>
          <div className="hud-row"><span className="hud-key">Source</span><span className="hud-val">{passiveCtx.refSource}</span></div>
          {Object.keys(hesitations.current).length > 0 && (
            <div className="hud-row hud-hesit">
              <span className="hud-key">Time per step</span>
              <span className="hud-val">
                {Object.entries(hesitations.current).map(([s, t]) => `Q${Number(s) + 1}: ${t.toFixed(1)}s`).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
