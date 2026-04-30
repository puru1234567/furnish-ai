'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FindStepQuestions } from './components/FindStepQuestions'
import { FindStepRoomDetails } from './components/FindStepRoomDetails'
import { FindStepPromptIntake } from './components/FindStepPromptIntake'
import { ResultsDisplay } from './components/ResultsDisplay'
import type { FormData, PhotoSlotId } from './find-page-model'
import type {
  UserContext,
  StyleTag,
  PurchaseTrigger,
  PainPointType,
  RoomType,
  Urgency,
  RankingPriority,
} from '@/lib/types'
import {
  FURNITURE_TYPES,
  ROOM_OPTIONS,
  INVENTORY_COUNTS,
  STYLES,
  MATERIAL_AVOIDANCES,
  BRANDS,
  WALL_COLORS,
  FLOOR_TYPES,
  ROOM_LAYOUTS,
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
import {
  useMicroResponse,
  useImageCompression,
  useRoomPhotos,
  useRoomAnalysisFlow,
  usePageNavigation,
  useFurnitureRecommendation,
  useLoadingAnimation,
  useKeyboardNavigation,
} from './hooks'

export default function FindPage() {
  // Form state
  const router = useRouter()
  const [form, setForm] = useState<FormData>(DEFAULTS)
  const sectionRefs = useRef<Record<'room' | 'questions' | 'budget' | 'refine' | 'results', HTMLDivElement | null>>({
    room: null,
    questions: null,
    budget: null,
    refine: null,
    results: null,
  })
  const roomAutoAdvanceRef = useRef(false)

  // Micro-response toasts
  const { microResponse, showMicroResponse } = useMicroResponse()

  // Image compression utilities
  const { compressImageFile, compressImageFileForApi } = useImageCompression()

  // Room photo management
  const {
    roomPhotos,
    setRoomPhotos,
    photoPreviews,
    setPhotoPreviews,
    isDraggingSlot,
    setIsDraggingSlot,
    slotInputRefs,
    photoCount,
    allPhotosUploaded,
    clearPhoto,
  } = useRoomPhotos()

  // Room analysis + questions flow
  const {
    roomAnalysis,
    analysisLoading,
    analysisError,
    contextualQuestions,
    questionsLoading,
    questionsError,
    triggerRoomAnalysis,
    generateContextualQuestions,
    resetAnalysis,
  } = useRoomAnalysisFlow({
    roomPhotos,
    compressImageFileForApi,
    onShowMessage: showMicroResponse,
  })

  // Navigation and step tracking
  const {
    step,
    setStep,
    questionSubIndex,
    setQuestionSubIndex,
    next,
    back,
    incrementQuestionSubIndex,
    decrementQuestionSubIndex,
    stepRef,
    questionSubIndexRef,
  } = usePageNavigation()

  // Recommendation API + results
  const {
    results,
    meta,
    loading,
    error,
    compareMode,
    setCompareMode,
    compareItems,
    priceFilter,
    setPriceFilter,
    sortBy,
    setSortBy,
    getRecommendations,
    toggleCompare,
    resetRecommendations,
  } = useFurnitureRecommendation()

  // Loading animation
  const loadingStageIndex = useLoadingAnimation(loading)

  // Keyboard navigation
  useKeyboardNavigation({
    stepRef,
    questionSubIndexRef,
    contextualQuestionsLength: contextualQuestions.length,
    onNext: next,
    onBack: back,
    onNextQuestion: incrementQuestionSubIndex,
    onPreviousQuestion: decrementQuestionSubIndex,
  })

  // Form helpers
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

  // Photo upload handler (with retry logic for compression)
  const handlePhotoFile = useCallback((slot: PhotoSlotId, file: File) => {
    if (!file.type.startsWith('image/')) return
    const nextCount = Math.min(4, photoCount + (roomPhotos[slot] ? 0 : 1))
    setRoomPhotos(prev => ({ ...prev, [slot]: file }))
    const slotLabel = PHOTO_SLOTS.find(s => s.id === slot)?.label ?? slot
    showMicroResponse('Photo added', `${slotLabel} uploaded. ${nextCount} of 4 room views are ready for analysis.`, 'success')
    
    // Compress for preview with retry (max 2 attempts)
    const compressWithRetry = async (f: File, attempt = 1): Promise<string> => {
      try {
        return await compressImageFile(f)
      } catch (error) {
        if (attempt < 2) {
          console.warn(`[photo-compression] Attempt ${attempt} failed, retrying...`, error)
          await new Promise(resolve => setTimeout(resolve, 500))
          return compressWithRetry(f, attempt + 1)
        }
        throw error
      }
    }
    
    void compressWithRetry(file)
      .then(dataUrl => {
        setPhotoPreviews(prev => {
          const next = { ...prev, [slot]: dataUrl }
          const allFilled = Object.values(next).every(v => v !== null)
          if (allFilled) {
            void triggerRoomAnalysis(form.furnitureType, form.roomType)
          }
          return next
        })
      })
      .catch(error => {
        console.error('[photo-compression] Failed after retries:', error)
        // Even if preview fails, the photo file is still in roomPhotos
        // It will be compressed with higher quality during API analysis
        showMicroResponse(
          'Photo preview skipped', 
          `${slotLabel} will be analyzed with high quality during room analysis.`, 
          'info'
        )
      })
  }, [compressImageFile, photoCount, roomPhotos, setRoomPhotos, setPhotoPreviews, triggerRoomAnalysis, form.furnitureType, form.roomType, showMicroResponse])

  const handleSlotDrop = useCallback((e: React.DragEvent, slot: PhotoSlotId) => {
    e.preventDefault()
    setIsDraggingSlot(null)
    const file = e.dataTransfer.files[0]
    if (file) handlePhotoFile(slot, file)
  }, [handlePhotoFile, setIsDraggingSlot])

  // Room step continuation: trigger analysis if needed, then advance
  const continueFromRoomStep = useCallback(async () => {
    setQuestionSubIndex(0)
    
    // If room analysis hasn't been done yet, trigger it now
    if (!roomAnalysis && !analysisLoading) {
      console.log('[room-step] Room analysis not yet triggered, triggering now with uploaded photos')
      await triggerRoomAnalysis(form.furnitureType, form.roomType)
    } else if (roomAnalysis && contextualQuestions.length === 0 && !questionsLoading) {
      // If analysis is done but questions haven't been generated, generate them
      await generateContextualQuestions(roomAnalysis, form.furnitureType, form.roomType)
    }
    
    next()
  }, [roomAnalysis, analysisLoading, contextualQuestions.length, questionsLoading, triggerRoomAnalysis, generateContextualQuestions, form.furnitureType, form.roomType, setQuestionSubIndex, next])

  // Submit and get recommendations
  const submit = useCallback(async () => {
    if (!form.furnitureType) {
      setStep(0)
      showMicroResponse('Furniture type missing', 'Tell us which furniture item you want before continuing.', 'error')
      return
    }

    setStep(99)
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
        additionalNotes: form.additionalNotes.trim() || undefined,
        roomContext: roomAnalysis
          ? {
              summary: roomAnalysis.roomSummary,
              furnitureNeeds: roomAnalysis.furnitureNeeds,
              spatialConstraints: roomAnalysis.spatialConstraints,
              existingFurniture: roomAnalysis.existingFurniture,
              lighting: roomAnalysis.lighting,
            }
          : undefined,
        contextualAnswers: Object.keys(form.contextualAnswers).length > 0 ? form.contextualAnswers : undefined,
        urgency: 'next_month' as Urgency,
        rankingPriority: 'quality' as RankingPriority,
      }

      const data = await getRecommendations(ctx)
      try {
        sessionStorage.setItem('furnish_ai_results', JSON.stringify({
          results: data?.items ?? [],
          meta: {
            summary: data?.summary ?? '',
            archetypeLabel: data?.archetypeLabel ?? '',
            contextInsights: data?.contextInsights ?? [],
            flaggedIssues: data?.flaggedIssues ?? [],
          },
          form,
          roomAnalysis,
        }))
      } catch {
        // ignore serialisation errors — navigate anyway
      }
      router.push('/result')
    } catch (e: unknown) {
      console.error('[submit]', e)
      setStep(101)
    }
  }, [form, roomAnalysis, getRecommendations, setStep])

  // Global reset
  const reset = useCallback(() => {
    setStep(0)
    setForm(DEFAULTS)
    setRoomPhotos({ front: null, left: null, right: null, back: null })
    setPhotoPreviews({ front: null, left: null, right: null, back: null })
    resetAnalysis()
    resetRecommendations()
    setQuestionSubIndex(0)
    roomAutoAdvanceRef.current = false
  }, [setStep, setRoomPhotos, setPhotoPreviews, resetAnalysis, resetRecommendations, setQuestionSubIndex])

  // Derived display values
  const livePillText = form.furnitureType
    ? `✦ ${INVENTORY_COUNTS[form.furnitureType] ?? 247} ${form.furnitureType}s in ${form.city}`
    : '✦ 247 items available'
  const echoLine = form.furnitureType
    ? `${INVENTORY_COUNTS[form.furnitureType] ?? '—'} ${getFurnitureLabel(form.furnitureType)} options · ${form.city}`
    : ''
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

  useEffect(() => {
    if (step === 0 || step === 99 || step === 101) return

    const targetKey: 'room' | 'questions' | 'budget' | 'refine' | 'results' =
      step === 1 ? 'room'
      : step === 2 ? 'questions'
      : step === 3 ? 'budget'
      : step === 4 ? 'refine'
      : 'results'

    const target = sectionRefs.current[targetKey]
    if (!target) return

    const timeout = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 280)

    return () => window.clearTimeout(timeout)
  }, [step])

  useEffect(() => {
    if (step !== 1) {
      roomAutoAdvanceRef.current = false
      return
    }

    const shouldAutoAdvance = photoCount > 0 && !!roomAnalysis && !analysisLoading && !questionsLoading
    if (!shouldAutoAdvance || roomAutoAdvanceRef.current) return

    roomAutoAdvanceRef.current = true
    const timeout = window.setTimeout(() => next(), 520)
    return () => window.clearTimeout(timeout)
  }, [step, photoCount, roomAnalysis, analysisLoading, questionsLoading, next])

  // Render
  return (
    <>
      <header className="site-header">
        <div className="logo">Furnish<span>AI</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" className="btn-skip">← Back to home</Link>
        </div>
      </header>

      {step === 0 && (
        <FindStepPromptIntake
          initialBudget={form.budget}
          livePillText={livePillText}
          onConfirm={({ furnitureType, budget, requestText }) => {
            set('furnitureType', furnitureType)
            set('budget', budget)
            set('budgetMax', Math.max(budget, Math.round(budget * 1.5)))
            const selected = FURNITURE_TYPES.find(item => item.id === furnitureType)
            showMicroResponse(
              'Request understood',
              `${selected?.label ?? furnitureType} around ${fmt(budget)}. Next, show us your room photos so we can derive the rest.`,
              'success'
            )
            if (requestText.trim()) {
              set('additionalNotes', requestText.trim())
            }
            setTimeout(next, 520)
          }}
        />
      )}

      {step > 0 && step < 99 && (
        <div className="progressive-flow-shell">
          <div className="form-body progressive-intake-summary-wrap">
            <div className="progressive-intake-summary">
              <div>
                <div className="results-story-label">What the system understood first</div>
                <div className="progressive-intake-title">{getFurnitureLabel(form.furnitureType)} around {fmt(form.budget)}</div>
                <div className="progressive-intake-sub">The room photos and follow-up questions below will derive room type, style, and constraints more accurately than asking you to pre-select them.</div>
              </div>
              <div className="understanding-tags" style={{ justifyContent: 'flex-end' }}>
                <span className="understanding-tag">{getFurnitureLabel(form.furnitureType)}</span>
                <span className="understanding-tag">{fmt(form.budget)}</span>
              </div>
            </div>
          </div>

          {step === 1 && (
            <div ref={element => { sectionRefs.current.room = element }} className="progressive-section active">
              <FindStepRoomDetails
                form={form}
                livePillText={livePillText}
                echoLine={echoLine}
                showProgress={false}
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
                    void triggerRoomAnalysis(form.furnitureType, form.roomType)
                  }
                }}
                onSetField={set}
                onBack={back}
                onSkip={next}
                onContinue={() => { void continueFromRoomStep() }}
              />
            </div>
          )}

          {step >= 2 && (
            <div ref={element => { sectionRefs.current.questions = element }} className={`progressive-section ${step === 2 ? 'active' : 'completed'}`}>
              <FindStepQuestions
                form={form}
                livePillText={livePillText}
                echoLine={echoLine}
                showProgress={false}
                furnitureTypeLabel={form.furnitureType}
                selectedContextualCount={selectedContextualCount}
                roomAnalysis={roomAnalysis}
                contextualQuestions={contextualQuestions}
                questionSubIndex={questionSubIndex}
                questionsLoading={questionsLoading}
                questionsError={questionsError}
                getAnalysisLabel={getAnalysisLabel}
                getAnalysisText={getAnalysisText}
                getQuestionOptionLabel={getQuestionOptionLabel}
                onRetry={() => { void generateContextualQuestions(roomAnalysis, form.furnitureType, form.roomType) }}
                onSelectAnswer={(questionId, optionId, questionText, optionLabel) => {
                  set('contextualAnswers', { ...form.contextualAnswers, [questionId]: optionId })
                  showMicroResponse('Answer saved', `${questionText} → ${optionLabel}`, 'success')
                  setTimeout(() => {
                    if (questionSubIndex < contextualQuestions.length - 1) {
                      incrementQuestionSubIndex()
                    } else {
                      next()
                    }
                  }, 320)
                }}
                onPreviousQuestion={decrementQuestionSubIndex}
                onBack={back}
                onContinue={next}
              />
            </div>
          )}

          {step >= 3 && (
            <div ref={element => { sectionRefs.current.budget = element }} className={`progressive-section ${step === 3 ? 'active' : 'completed'}`}>
              <div className="page active">
                <div className="form-body journey-form-body">
                  {echoLine && <div className="echo-panel">{echoLine}</div>}
                  <div className="form-eyebrow">Step 4 of 5</div>
                  <h2 className="form-title">Delivery fit and budget guardrails</h2>
                  <p className="form-sub">Keep your budget anchor, choose urgency, and move on.</p>

                  <div className="understanding-tags compact-step-tags">
                    <span className="understanding-tag">{fmt(form.budget)} anchor</span>
                    <span className="understanding-tag">~{budgetFitEstimate} in range</span>
                    <span className="understanding-tag">{form.timeline}</span>
                    <span className="understanding-tag">{form.deliveryPreference}</span>
                  </div>

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

                  <div className="btn-row">
                    <button className="btn-back" onClick={back}>← Back</button>
                    <button className="btn-next" onClick={next}>Continue → <span>Final touches</span></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step >= 4 && (
            <div ref={element => { sectionRefs.current.refine = element }} className={`progressive-section ${step === 4 ? 'active' : 'completed'}`}>
              <div className="page active">
                <div className="form-body journey-form-body">
                  {echoLine && <div className="echo-panel">{echoLine}</div>}
                  <div className="form-eyebrow">Step 5 of 5 — optional</div>
                  <h2 className="form-title">Fine-tune <span className="optional-tag">all optional — skip to results</span></h2>
                  <p className="form-sub">Optional only. Exclude obvious mismatches or add one taste bias, then get the shortlist.</p>

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

                  <div className="btn-row">
                    <button className="btn-back" onClick={back}>← Back</button>
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
            </div>
          )}
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

      {/* ✦ TOP PROGRESS BAR */}
      {step >= 0 && step <= 4 && (
        <div id="top-progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
      )}

      {microResponse && step >= 0 && step <= 4 && (
        <div className={`micro-response ${microResponse.tone === 'success' ? 'success' : ''}`}>
          <div className="micro-response-label">System reply</div>
          <div className="micro-response-title">{microResponse.title}</div>
          <div className="micro-response-body">{microResponse.detail}</div>
        </div>
      )}
    </>
  )
}
