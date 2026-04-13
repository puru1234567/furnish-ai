'use client'
// app/find/page.tsx
// Redesigned question flow — captures WHY not just WHAT
// New signals: purchaseTrigger, painPoint, existingFurnitureDesc, alreadyRejected, budgetMax

import { useState } from 'react'
import type { UserContext, StyleTag, PurchaseTrigger } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────

const ROOM_TYPES = [
  { id: 'living',  label: 'Living Room',    icon: '🛋️' },
  { id: 'bedroom', label: 'Bedroom',         icon: '🛏️' },
  { id: 'dining',  label: 'Dining Room',     icon: '🍽️' },
  { id: 'study',   label: 'Study / Office',  icon: '💻' },
  { id: 'kids',    label: "Kids' Room",      icon: '🧸' },
]

const TRIGGERS: { id: PurchaseTrigger; label: string; hint: string }[] = [
  { id: 'new_home',   label: 'Moving to a new home',     hint: 'Furnishing from scratch' },
  { id: 'replacing',  label: 'Replacing something old',   hint: 'Need a direct upgrade' },
  { id: 'upgrading',  label: 'Upgrading what I have',     hint: 'Want something better' },
  { id: 'renovating', label: 'Room renovation',           hint: 'Updating the whole look' },
  { id: 'gifting',    label: 'Buying as a gift',          hint: 'For someone else' },
]

// Pain point suggestions — shown as quick-tap chips below the text field
// User can tap one or write their own
const PAIN_SUGGESTIONS = [
  'Stains too easily',
  'Too bulky for the room',
  'Fabric tears quickly',
  'Hard to clean',
  'Looks cheap',
  'No storage',
  'Not comfortable',
  'Fades in sunlight',
]

const STYLE_OPTIONS: { id: StyleTag; label: string; colors: string[] }[] = [
  { id: 'minimal',     label: 'Clean & Minimal',   colors: ['#F0EDE8', '#D4D0C8', '#A8A49C'] },
  { id: 'warm',        label: 'Warm & Earthy',      colors: ['#C4843A', '#8B5E3C', '#5C3D1E'] },
  { id: 'modern',      label: 'Bold Modern',        colors: ['#2C2C2C', '#5A5A5A', '#9A9A9A'] },
  { id: 'traditional', label: 'Classic Indian',     colors: ['#8B2635', '#D4AF37', '#5C3D1E'] },
  { id: 'industrial',  label: 'Industrial',         colors: ['#4A4A4A', '#7A6A5A', '#B0A090'] },
  { id: 'eclectic',    label: 'Colorful & Playful', colors: ['#E84393', '#4ECDC4', '#FFE66D'] },
]

const USE_CASES = [
  { id: 'kids',         label: 'Kids use this room' },
  { id: 'wfh',          label: 'I work from home here' },
  { id: 'guests',       label: 'Guests stay over frequently' },
  { id: 'daily_family', label: 'Heavy daily family use' },
  { id: 'pets',         label: 'Pets at home' },
  { id: 'minimal_use',  label: 'Light / occasional use' },
]

const CITIES = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']

const PRIORITIES = [
  { id: 'price',   label: 'Lowest price',   hint: 'Get the most for my money' },
  { id: 'quality', label: 'Best quality',   hint: 'Built to last, worth the cost' },
  { id: 'design',  label: 'Best design',    hint: 'Most beautiful in the room' },
  { id: 'reviews', label: 'Most reviewed',  hint: 'Trusted by many buyers' },
]

const TOTAL_STEPS = 7  // up from 6 — two new intent steps added

// ── Form state ─────────────────────────────────────────────────────

interface FormData {
  roomType: string
  roomSqft: number
  city: string
  deliveryOk: boolean
  budget: number
  budgetMax: number
  purchaseTrigger: string
  existingFurnitureDesc: string
  painPoint: string
  stylePreference: StyleTag[]
  useCase: string[]
  alreadyRejected: string
  urgency: string
  rankingPriority: string
}

const DEFAULTS: FormData = {
  roomType: '',
  roomSqft: 160,
  city: 'Delhi NCR',
  deliveryOk: true,
  budget: 25000,
  budgetMax: 35000,
  purchaseTrigger: '',
  existingFurnitureDesc: '',
  painPoint: '',
  stylePreference: [],
  useCase: [],
  alreadyRejected: '',
  urgency: 'next_month',
  rankingPriority: 'quality',
}

// ── Helpers ────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

// ── Component ──────────────────────────────────────────────────────

export default function FindPage() {
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState<FormData>(DEFAULTS)
  const [results, setResults] = useState<any[]>([])
  const [meta, setMeta]       = useState<{ summary: string; archetypeLabel: string; contextInsights: string[]; flaggedIssues: string[] }>({ summary: '', archetypeLabel: '', contextInsights: [], flaggedIssues: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const toggle = (key: 'stylePreference' | 'useCase', val: string) =>
    setForm(p => {
      const arr = p[key] as string[]
      return { ...p, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })

  const next  = () => setStep(s => s + 1)
  const back  = () => setStep(s => s - 1)
  const reset = () => { setStep(0); setForm(DEFAULTS); setResults([]); setError('') }

  // Show "existing furniture" + "pain point" step only if relevant trigger
  const showExistingStep = ['replacing', 'upgrading', 'renovating'].includes(form.purchaseTrigger)
  // Adjust step count dynamically
  const adjustedTotal = showExistingStep ? TOTAL_STEPS : TOTAL_STEPS - 1

  const submit = async () => {
    setLoading(true); setError(''); setStep(99)
    try {
      const ctx: UserContext = {
        roomType:              form.roomType as any,
        roomSqft:              form.roomSqft,
        city:                  form.city,
        deliveryOk:            form.deliveryOk,
        budget:                form.budget,
        budgetMax:             form.budgetMax,
        purchaseTrigger:       form.purchaseTrigger as any,
        existingFurnitureDesc: form.existingFurnitureDesc,
        painPoint:             form.painPoint,
        stylePreference:       form.stylePreference,
        useCase:               form.useCase,
        alreadyRejected:       form.alreadyRejected,
        urgency:               form.urgency as any,
        rankingPriority:       form.rankingPriority as any,
      }
      const res  = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ctx) })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || 'API failed')
        setStep(101)
        return
      }
      const data = await res.json()
      setResults(data.items ?? [])
      setMeta({ summary: data.summary, archetypeLabel: data.archetypeLabel, contextInsights: data.contextInsights ?? [], flaggedIssues: data.flaggedIssues ?? [] })
      setStep(100)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Check your API key and try again.')
      setStep(101)
    } finally {
      setLoading(false)
    }
  }

  const progress = Math.min((step / adjustedTotal) * 100, 100)

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">

      {/* Progress bar */}
      {step < 99 && (
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
          <div className="max-w-lg mx-auto flex justify-between items-center mb-2">
            <span className="text-xs text-stone-400 font-mono">
              {step < adjustedTotal ? `${step + 1} / ${adjustedTotal}` : 'Finding matches...'}
            </span>
            {step > 0 && step < adjustedTotal && (
              <button onClick={back} className="text-xs text-stone-400 hover:text-stone-700">← back</button>
            )}
          </div>
          <div className="max-w-lg mx-auto h-0.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-stone-800 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ── STEP 0: Room type ── */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">Which room?</h1>
            <p className="text-stone-400 text-sm mb-6">Focuses search on the right furniture category.</p>
            <div className="grid grid-cols-2 gap-3">
              {ROOM_TYPES.map(r => (
                <button key={r.id} onClick={() => { set('roomType', r.id); next() }}
                  className="p-5 rounded-xl border-2 border-stone-200 bg-white hover:border-stone-400 text-left transition-all">
                  <div className="text-2xl mb-2">{r.icon}</div>
                  <div className="font-medium text-stone-800 text-sm">{r.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: WHY — the trigger question (NEW) ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">Why are you shopping now?</h1>
            <p className="text-stone-400 text-sm mb-6">
              This changes what we recommend — a first home needs different things than an upgrade.
            </p>
            <div className="flex flex-col gap-2">
              {TRIGGERS.map(t => (
                <button key={t.id}
                  onClick={() => { set('purchaseTrigger', t.id); next() }}
                  className="px-4 py-4 rounded-xl border-2 border-stone-200 bg-white hover:border-stone-400 text-left transition-all">
                  <div className="font-medium text-stone-800 text-sm">{t.label}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Pain point (NEW — only if replacing/upgrading/renovating) ── */}
        {step === 2 && showExistingStep && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">
              What's wrong with what you have?
            </h1>
            <p className="text-stone-400 text-sm mb-4">
              The most useful signal we have. "Stains too easily" tells us more than 5 form fields.
            </p>

            {/* Quick-tap pain chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PAIN_SUGGESTIONS.map(p => {
                const active = form.painPoint === p
                return (
                  <button key={p}
                    onClick={() => set('painPoint', active ? '' : p)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      active ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                    }`}>
                    {p}
                  </button>
                )
              })}
            </div>

            <textarea
              value={form.painPoint}
              onChange={e => set('painPoint', e.target.value)}
              placeholder='Or describe in your own words... e.g. "Too big for the room and the fabric tears"'
              rows={3}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 bg-white focus:outline-none focus:border-stone-600 resize-none mb-3"
            />

            <p className="text-xs text-stone-400 mb-4 italic">Optional — skip if buying new</p>

            {/* Existing furniture description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Briefly describe what's already in the room <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.existingFurnitureDesc}
                onChange={e => set('existingFurnitureDesc', e.target.value)}
                placeholder='e.g. "Dark teak wardrobe, cream walls, marble floor"'
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 bg-white focus:outline-none focus:border-stone-600"
              />
              <p className="text-xs text-stone-400 mt-1">Helps us match or complement what's there</p>
            </div>

            <button onClick={next}
              className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* ── STEP 2 (if new_home/gifting — no existing step): Budget ── */}
        {/* ── STEP 3 (if existing step shown): Budget ── */}
        {((step === 2 && !showExistingStep) || (step === 3 && showExistingStep)) && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">What's your budget?</h1>
            <p className="text-stone-400 text-sm mb-6">
              Set your comfortable spend and your absolute maximum separately.
            </p>
            <div className="bg-white rounded-xl border border-stone-200 p-6 mb-4">
              <div className="mb-5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 block">
                  Comfortable spend
                </label>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-stone-400">₹</span>
                  <span className="text-4xl font-semibold text-stone-800">{form.budget.toLocaleString('en-IN')}</span>
                </div>
                <input type="range" min={3000} max={200000} step={1000} value={form.budget}
                  onChange={e => { const v = Number(e.target.value); set('budget', v); if (form.budgetMax < v * 1.1) set('budgetMax', Math.round(v * 1.25)) }}
                  className="w-full accent-stone-800" />
              </div>
              <div className="border-t border-stone-100 pt-4">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 block">
                  Absolute maximum (stretch)
                </label>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-stone-400">₹</span>
                  <span className="text-4xl font-semibold text-stone-500">{form.budgetMax.toLocaleString('en-IN')}</span>
                </div>
                <input type="range" min={form.budget} max={250000} step={1000} value={form.budgetMax}
                  onChange={e => set('budgetMax', Number(e.target.value))}
                  className="w-full accent-stone-400" />
                <p className="text-xs text-stone-400 mt-2">Items above comfortable but below max appear as "stretch" recommendations with a clear explanation</p>
              </div>
            </div>
            <button onClick={next}
              className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* ── Style step ── */}
        {((step === 3 && !showExistingStep) || (step === 4 && showExistingStep)) && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">What's your vibe?</h1>
            <p className="text-stone-400 text-sm mb-5">Pick up to 2. Colors represent the aesthetic.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {STYLE_OPTIONS.map(s => {
                const sel = form.stylePreference.includes(s.id)
                const max = form.stylePreference.length >= 2 && !sel
                return (
                  <button key={s.id}
                    onClick={() => { if (!max) toggle('stylePreference', s.id) }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${sel ? 'border-stone-800 bg-stone-50' : max ? 'border-stone-100 opacity-40 cursor-not-allowed bg-white' : 'border-stone-200 bg-white hover:border-stone-400'}`}>
                    <div className="flex gap-1 mb-2">
                      {s.colors.map((c, i) => <div key={i} className="h-3 flex-1 rounded-sm" style={{ background: c }} />)}
                    </div>
                    <div className="font-medium text-stone-800 text-sm">{s.label}</div>
                  </button>
                )
              })}
            </div>
            <button onClick={next} disabled={form.stylePreference.length === 0}
              className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Continue {form.stylePreference.length > 0 && `(${form.stylePreference.join(' + ')})`}
            </button>
          </div>
        )}

        {/* ── Use case step ── */}
        {((step === 4 && !showExistingStep) || (step === 5 && showExistingStep)) && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">How is this room actually used?</h1>
            <p className="text-stone-400 text-sm mb-5">All that apply — we match materials to real life, not just aesthetics.</p>
            <div className="flex flex-col gap-2 mb-4">
              {USE_CASES.map(u => {
                const sel = form.useCase.includes(u.id)
                return (
                  <button key={u.id} onClick={() => toggle('useCase', u.id)}
                    className={`px-4 py-3.5 rounded-xl border-2 text-left text-sm font-medium transition-all flex items-center gap-3 ${sel ? 'border-stone-800 bg-stone-50 text-stone-800' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>
                    <span className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${sel ? 'bg-stone-800 border-stone-800' : 'border-stone-300'}`}>
                      {sel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    {u.label}
                  </button>
                )
              })}
            </div>
            <button onClick={next} disabled={form.useCase.length === 0}
              className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* ── Location + urgency step ── */}
        {((step === 5 && !showExistingStep) || (step === 6 && showExistingStep)) && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">Where & when?</h1>
            <p className="text-stone-400 text-sm mb-5">We only show items actually available in your city.</p>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">City</label>
                <select value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 bg-white focus:outline-none focus:border-stone-800">
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">How soon?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: 'this_week', label: 'This week' }, { id: 'next_month', label: 'Next month' }, { id: 'exploring', label: 'Just looking' }].map(u => (
                    <button key={u.id} onClick={() => set('urgency', u.id)}
                      className={`py-3 rounded-xl text-sm border-2 transition-all ${form.urgency === u.id ? 'border-stone-800 bg-stone-50 font-medium text-stone-800' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200 cursor-pointer">
                <input type="checkbox" checked={form.deliveryOk}
                  onChange={e => set('deliveryOk', e.target.checked)} className="w-4 h-4 accent-stone-800" />
                <span className="text-sm text-stone-700">Home delivery is fine</span>
              </label>
            </div>
            <button onClick={next}
              className="w-full py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors">
              Continue
            </button>
          </div>
        )}

        {/* ── Final step: Priority + optional "already rejected" ── */}
        {((step === 6 && !showExistingStep) || (step === 7 && showExistingStep)) && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">Last two things</h1>
            <p className="text-stone-400 text-sm mb-5">What matters most — and what should we skip.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-700 mb-2">What matters most?</label>
              <div className="flex flex-col gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.id} onClick={() => set('rankingPriority', p.id)}
                    className={`px-4 py-3.5 rounded-xl border-2 text-left transition-all ${form.rankingPriority === p.id ? 'border-stone-800 bg-stone-50' : 'border-stone-200 bg-white hover:border-stone-400'}`}>
                    <div className="font-medium text-stone-800 text-sm">{p.label}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{p.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Already rejected — optional but very high signal */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Anything you've already checked and ruled out? <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={form.alreadyRejected}
                onChange={e => set('alreadyRejected', e.target.value)}
                placeholder='e.g. "IKEA — too modern. Pepperfry — out of budget"'
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 bg-white focus:outline-none focus:border-stone-600 mt-1"
              />
              <p className="text-xs text-stone-400 mt-1">We'll make sure not to recommend those</p>
            </div>

            {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

            <button onClick={submit}
              className="w-full py-4 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors text-base">
              Find my top 10 matches →
            </button>
          </div>
        )}


        {/* ── Loading ── */}
        {step === 99 && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-stone-800 font-medium text-lg">Reading your intent...</p>
            <p className="text-stone-400 text-sm mt-2 text-center max-w-xs">
              Filtering inventory across {form.city}, scoring against your specific context
            </p>
          </div>
        )}

        {/* ── Error Step ── */}
        {step === 101 && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-red-700 font-semibold text-lg mb-2">Something went wrong</p>
            <p className="text-stone-700 text-sm mb-4 text-center max-w-xs">{error}</p>
            <button onClick={reset} className="w-full py-3 border border-stone-300 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors mb-2">Start over</button>
            <button onClick={() => setStep(adjustedTotal - 1)} className="w-full py-3 border border-stone-300 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors">Back to last step</button>
          </div>
        )}

        {/* ── Results ── */}
        {step === 100 && (
          <div className="animate-fade-in">
            {/* Archetype + summary */}
            <div className="mb-5">
              {meta.archetypeLabel && (
                <div className="inline-block bg-stone-800 text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                  {meta.archetypeLabel}
                </div>
              )}
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your top matches</h1>
              <p className="text-stone-500 text-sm">{meta.summary}</p>
            </div>

            {/* Context insights */}
            {meta.contextInsights.length > 0 && (
              <div className="bg-stone-100 rounded-xl p-4 mb-5">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Why we ranked these</p>
                {meta.contextInsights.map((ins, i) => (
                  <p key={i} className="text-xs text-stone-600 leading-relaxed mb-1">• {ins}</p>
                ))}
              </div>
            )}

            {/* Flags */}
            {meta.flaggedIssues.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                {meta.flaggedIssues.map((f, i) => (
                  <p key={i} className="text-xs text-amber-700 leading-relaxed">⚠ {f}</p>
                ))}
              </div>
            )}

            {/* Item cards */}
            <div className="flex flex-col gap-4">
              {results.map((item, idx) => (
                <div key={item.id} className={`bg-white rounded-xl border overflow-hidden ${item.tier === 'stretch' ? 'border-amber-200' : 'border-stone-200'}`}>
                  {item.tier === 'stretch' && (
                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                      <p className="text-xs text-amber-700 font-medium">↑ Stretch pick — {item.stretchJustification}</p>
                    </div>
                  )}
                  <div className="flex gap-4 p-4">
                    <div className="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0 relative">
                      <span className="text-2xl">
                        {item.category === 'sofa' ? '🛋️' : item.category === 'bed' ? '🛏️' : item.category === 'dining-table' ? '🍽️' : item.category === 'chair' ? '🪑' : item.category === 'wardrobe' ? '🗄️' : item.category === 'study-table' ? '💻' : '🪵'}
                      </span>
                      <span className="absolute -top-1 -left-1 w-5 h-5 bg-stone-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-stone-800 text-sm leading-snug">{item.name}</p>
                          <p className="text-xs text-stone-400 mt-0.5">{item.brand} · {item.material}</p>
                        </div>
                        <p className="text-stone-800 font-semibold text-sm flex-shrink-0">
                          {fmt(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-xs ${i < Math.round(item.rating) ? 'text-amber-400' : 'text-stone-200'}`}>★</span>
                          ))}
                        </div>
                        <span className="text-xs text-stone-400">{item.rating} ({item.reviewCount.toLocaleString()} reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Why it fits — the core value */}
                  <div className="mx-4 mb-3 px-3 py-2.5 bg-stone-50 rounded-lg border-l-2 border-stone-300">
                    <p className="text-xs text-stone-500 leading-relaxed">
                      <span className="font-medium text-stone-600">Why this fits: </span>
                      {item.whyItFits}
                    </p>
                  </div>

                  {item.productUrl ? (
                    <div className="px-4 pb-4">
                      <a href={item.productUrl} target="_blank" rel="noopener noreferrer"
                        className="block w-full py-2.5 border border-stone-200 rounded-lg text-stone-700 text-sm text-center hover:bg-stone-50 transition-colors font-medium">
                        View product →
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 text-center pb-4">In-store only · {item.cities?.[0]}</p>
                  )}
                </div>
              ))}
            </div>

            <button onClick={reset}
              className="w-full mt-6 py-3 border border-stone-300 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors">
              Search again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
