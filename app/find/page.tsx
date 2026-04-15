'use client'
import { useState } from 'react'
import Link from 'next/link'
import type {
  UserContext,
  StyleTag,
  PurchaseTrigger,
  PainPointType,
  RecommendedItem,
  RecommendationResponse,
  RoomType,
  Urgency,
  RankingPriority,
} from '@/lib/types'

// ──────── FURNITURE TYPE OPTIONS ────────
const FURNITURE_TYPES = [
  { id: 'sofa', label: 'Sofa', icon: '🛋️', desc: '2, 3 & L-shape' },
  { id: 'bed', label: 'Bed', icon: '🛏️', desc: 'Single to king' },
  { id: 'dining-table', label: 'Dining table', icon: '🍽️', desc: '4 to 8 seater' },
  { id: 'wardrobe', label: 'Wardrobe', icon: '🚪', desc: 'Sliding & hinged' },
  { id: 'desk', label: 'Desk', icon: '💻', desc: 'Study & WFH' },
  { id: 'chair', label: 'Chair', icon: '🪑', desc: 'Accent & dining' },
]

// ──────── ROOM TYPE OPTIONS ────────
const ROOM_OPTIONS = [
  'Living room',
  'Bedroom',
  'Dining area',
  'Study / Home office',
  "Kids' room",
  'Guest room',
]

// ──────── OTHER STEP OPTIONS ────────
const PAIN_PROFILES: { id: PainPointType; label: string }[] = [
  { id: 'stains_easily', label: '☕ Stains too easily' },
  { id: 'broke_down_durability', label: '💔 Broke down / poor durability' },
  { id: 'too_uncomfortable', label: '😣 Too uncomfortable' },
  { id: 'too_bulky', label: '📦 Too bulky' },
  { id: 'assembly_nightmare', label: '🔨 Assembly nightmare' },
]

const STYLES = [
  { id: 'modern-minimal', label: 'Modern minimal', icon: '🪟' },
  { id: 'warm-natural', label: 'Warm & natural', icon: '🌾' },
  { id: 'classic', label: 'Classic / traditional', icon: '🏛️' },
  { id: 'bold', label: 'Contemporary bold', icon: '🖤' },
  { id: 'boho', label: 'Boho / eclectic', icon: '🌿' },
  { id: 'no-pref', label: 'No preference', icon: '🤷' },
]

const MATERIAL_AVOIDANCES = [
  '🚫 Velvet (fades)',
  '🚫 Light linen (stains)',
  '🚫 Leather (hot climate)',
  '🚫 Jute / natural weave',
  '🚫 Plastic / acrylic',
]

const BRANDS = [
  '✅ Urban Ladder',
  '✅ Wakefit',
  '✅ IKEA',
  '✅ Wooden Street',
]

const CITIES = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']

// ──────── STEP 1: ROOM DETAILS ────────
const WALL_COLORS = [
  { id: 'cream', label: 'Cream / Off-white', color: '#F5F0E8' },
  { id: 'beige', label: 'Beige / Sand', color: '#D1C9BE' },
  { id: 'sage', label: 'Sage / Muted green', color: '#A8B4A0' },
  { id: 'blue', label: 'Blue / Grey', color: '#8090A8' },
  { id: 'dark', label: 'Dark / Charcoal', color: '#2C2825' },
]

const FLOOR_TYPES = [
  { id: 'wood', label: 'Wood', icon: '🪵' },
  { id: 'marble', label: 'Marble', icon: '⬜' },
  { id: 'tile', label: 'Tile', icon: '🟫' },
  { id: 'carpet', label: 'Carpet', icon: '🟩' },
]

const ROOM_LAYOUTS = [
  { id: 'standard', label: 'Standard', icon: '📐' },
  { id: 'lshaped', label: 'L-shaped', icon: '🔲' },
  { id: 'narrow', label: 'Narrow', icon: '↔️' },
  { id: 'openplan', label: 'Open plan', icon: '🏟️' },
]

// ──────── STEP 2: FUNCTIONAL NEEDS ────────
const MUST_HAVE_FEATURES = [
  { id: 'storage', label: 'Built-in storage', desc: 'Drawers, under-seat', icon: '🗄️' },
  { id: 'modular', label: 'Modular / expandable', desc: 'Add sections later', icon: '♻️' },
  { id: 'converttobed', label: 'Converts to bed', desc: 'For guests', icon: '🛏️' },
  { id: 'reclining', label: 'Reclining', desc: 'Manual or electric', icon: '🔄' },
  { id: 'lightweight', label: 'Lightweight', desc: 'Easy to move', icon: '🪶' },
  { id: 'durability', label: 'High durability', desc: 'Kids / pets household', icon: '🏋️' },
]

const PAST_ISSUES = [
  '🧹 Stained too easily',
  '💔 Broke down in 2 years',
  '😣 Uncomfortable',
  '📦 Too bulky for the space',
  '🔩 Assembly was a nightmare',
  '🎨 Looked different in real life',
  '✅ Nothing wrong — first purchase',
]

// ──────── STEP 3: BUDGET & CONSTRAINTS ────────
const BUDGET_OPTIONS = [
  { label: '🚫 Hard stop', desc: "Don't show anything above my limit" },
  { label: '💛 Show me if it\'s worth it', desc: 'Up to ~20% more if AI thinks it\'s the right fit' },
  { label: '💚 I\'m flexible', desc: 'Show me a wider range with reasons' },
  { label: '🎯 Best under budget', desc: 'Maximize value — price matters most' },
]

const TIMELINES = [
  '⚡ This week (urgent)',
  '📅 This month',
  '🗓️ In 1–3 months',
  '🔍 Just exploring',
]

const DELIVERIES = [
  '🚚 Home delivery OK',
  '🏪 Prefer local pickup',
  '🔧 With assembly included',
]

// ──────── FORM DATA STRUCTURE ────────
interface FormData {
  // Step 0: Furniture Type + Room
  furnitureType: string
  roomType: string
  
  // Step 1: Room Details
  wallColor: string
  floorType: string
  roomLayout: string
  roomWidth: number
  roomDepth: number
  
  // Step 2: Functional Needs
  mustHaveFeatures: string[]
  pastIssues: string[]
  
  // Step 3: Budget & Constraints
  budgetFlexibility: string
  timeline: string
  deliveryPreference: string
  
  // Step 4: Refinements
  painPoint: PainPointType[]
  city: string
  budget: number
  budgetMax: number
  materialsToAvoid: string[]
  aestheticStyle: string
  trustedBrands: string[]
  additionalNotes: string
}

const DEFAULTS: FormData = {
  furnitureType: '',
  roomType: 'Living room',
  wallColor: 'cream',
  floorType: 'wood',
  roomLayout: 'openplan',
  roomWidth: 14,
  roomDepth: 12,
  mustHaveFeatures: ['converttobed'],
  pastIssues: ['🧹 Stained too easily'],
  budgetFlexibility: '💛 Show me if it\'s worth it',
  timeline: '📅 This month',
  deliveryPreference: '🚚 Home delivery OK',
  painPoint: [],
  city: 'Mumbai',
  budget: 30000,
  budgetMax: 45000,
  materialsToAvoid: ['🚫 Velvet (fades)'],
  aestheticStyle: 'modern-minimal',
  trustedBrands: [],
  additionalNotes: '',
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

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

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(p => ({ ...p, [k]: v }))
  const toggleArray = (key: 'materialsToAvoid' | 'trustedBrands' | 'painPoint' | 'mustHaveFeatures' | 'pastIssues', val: string | PainPointType) => {
    setForm(p => {
      const arr = p[key]
      if (Array.isArray(arr)) {
        return { ...p, [key]: arr.includes(val as never) ? arr.filter(x => x !== val) : [...arr, val as never] }
      }
      return p
    })
  }

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)
  const reset = () => { setStep(0); setForm(DEFAULTS); setResults([]); setError(''); setCompareItems([]); setCompareMode(false) }

  const submit = async () => {
    // Map form data to UserContext
    setLoading(true); setError(''); setStep(99)
    try {
      const ctx: UserContext = {
        roomType: form.roomType as RoomType,
        roomSqft: 160,
        city: form.city,
        deliveryOk: true,
        budget: form.budget,
        budgetMax: form.budgetMax,
        purchaseTrigger: 'new_home' as PurchaseTrigger,
        existingFurnitureDesc: '',
        painPoint: form.painPoint,
        stylePreference: [] as StyleTag[],
        useCase: [],
        alreadyRejected: '',
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

  return (
    <>
      <header className="site-header">
        <div className="logo">Furnish<span>AI</span></div>
        <Link href="/" className="btn-skip">← Back to home</Link>
      </header>

      {/* ═════════════════════════════════
          STEP 0: FURNITURE TYPE + ROOM  
          (Matches HTML Step 1 exactly)
          ═════════════════════════════════ */}
      {step === 0 && (
        <div className="page active">
          {/* PROGRESS BAR */}
          <div className="form-chrome">
            <div className="progress-steps">
              <div className="step-dot active">1</div>
              <div className="step-line"></div>
              <div className="step-dot pending">2</div>
              <div className="step-line"></div>
              <div className="step-dot pending">3</div>
              <div className="step-line"></div>
              <div className="step-dot pending">4</div>
              <div className="step-line"></div>
              <div className="step-dot pending">5</div>
            </div>
            <div className="live-count">✦ 247 items available</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            <div className="form-eyebrow">Step 1 of 5</div>
            <h2 className="form-title">What are you looking for?</h2>
            <p className="form-sub">Pick the furniture first — we'll filter everything else around your choice.</p>

            {/* FURNITURE TYPE SECTION */}
            <div className="section-label">Furniture type</div>
            <div className="chip-grid">
              {FURNITURE_TYPES.map(ft => (
                <button
                  key={ft.id}
                  onClick={() => set('furnitureType', ft.id)}
                  className={`chip ${form.furnitureType === ft.id ? 'selected' : ''}`}
                >
                  <span className="chip-icon">{ft.icon}</span>
                  <span className="chip-label">{ft.label}</span>
                  <span className="chip-sub">{ft.desc}</span>
                </button>
              ))}
            </div>

            <div className="divider"></div>

            {/* ROOM TYPE SECTION */}
            <div className="section-label">Room it will go in</div>
            <div className="toggle-grid">
              {ROOM_OPTIONS.map((room, idx) => (
                <button
                  key={idx}
                  className={`toggle-chip ${form.roomType === room ? 'selected' : ''}`}
                  onClick={() => set('roomType', room)}
                >
                  {room}
                </button>
              ))}
            </div>

            {/* BUTTONS */}
            <div className="btn-row">
              <Link href="/" className="btn-back">← Home</Link>
              <button
                className="btn-next"
                onClick={next}
                disabled={!form.furnitureType || !form.roomType}
                style={{opacity: !form.furnitureType || !form.roomType ? 0.6 : 1, cursor: !form.furnitureType || !form.roomType ? 'not-allowed' : 'pointer'}}
              >
                Continue → <span>Room context</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════
          STEP 1: TELL US ABOUT YOUR ROOM
          (Matches HTML Step 2 exactly)
          ═════════════════════════════════ */}
      {step === 1 && (
        <div className="page active">
          {/* PROGRESS BAR */}
          <div className="form-chrome">
            <div className="progress-steps">
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot active">2</div>
              <div className="step-line"></div>
              <div className="step-dot pending">3</div>
              <div className="step-line"></div>
              <div className="step-dot pending">4</div>
              <div className="step-line"></div>
              <div className="step-dot pending">5</div>
            </div>
            <div className="live-count">✦ 87 sofas · {form.city}</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            <div className="form-eyebrow">Step 2 of 5</div>
            <h2 className="form-title">Tell us about your room</h2>
            <p className="form-sub">
              A photo helps us match colors, style, and dimensions automatically. Or answer a few quick questions.{' '}
              <strong>Completely optional</strong> — skip if you're furnishing a new space.
            </p>

            {/* UPLOAD ZONE */}
            <div className="upload-zone">
              <div className="upload-icon">📸</div>
              <div className="upload-title">Drop a room photo here</div>
              <div className="upload-sub">
                We'll extract wall color, floor type, style, and layout.<br />
                Photo is deleted after analysis — never stored.{' '}
                <a href="#" style={{ color: 'var(--terracotta)' }}>
                  Privacy policy →
                </a>
              </div>
            </div>

            {/* ROOM ANALYSIS RESULT */}
            <div className="room-analysis">
              <div className="ra-icon">✦</div>
              <div>
                <div className="ra-title">Room analyzed — here's what we found</div>
                <div className="ra-tags">
                  <span className="ra-tag">Cream walls</span>
                  <span className="ra-tag">Light wood floor</span>
                  <span className="ra-tag">Modern minimal</span>
                  <span className="ra-tag">Moderate density</span>
                  <span className="ra-tag">Good natural light</span>
                </div>
              </div>
            </div>

            <div className="upload-or">OR ANSWER MANUALLY</div>

            {/* WALL COLOR */}
            <div className="section-label">Wall color</div>
            <div className="toggle-grid" style={{ marginBottom: '24px' }}>
              {WALL_COLORS.map(wc => (
                <button
                  key={wc.id}
                  className={`toggle-chip ${form.wallColor === wc.id ? 'selected' : ''}`}
                  onClick={() => set('wallColor', wc.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: wc.color,
                      border: '1px solid #ccc',
                      display: 'inline-block',
                    }}
                  ></span>
                  {wc.label}
                </button>
              ))}
            </div>

            {/* FLOOR TYPE */}
            <div className="section-label">Floor type</div>
            <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
              {FLOOR_TYPES.map(ft => (
                <button
                  key={ft.id}
                  className={`chip ${form.floorType === ft.id ? 'selected' : ''}`}
                  onClick={() => set('floorType', ft.id)}
                  style={{ textAlign: 'center', padding: '14px 8px' }}
                >
                  <span className="chip-icon">{ft.icon}</span>
                  <span className="chip-label" style={{ fontSize: '12px' }}>
                    {ft.label}
                  </span>
                </button>
              ))}
            </div>

            {/* ROOM LAYOUT */}
            <div className="section-label">Room layout & rough size</div>
            <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
              {ROOM_LAYOUTS.map(rl => (
                <button
                  key={rl.id}
                  className={`chip ${form.roomLayout === rl.id ? 'selected' : ''}`}
                  onClick={() => set('roomLayout', rl.id)}
                  style={{ textAlign: 'center', padding: '14px 8px' }}
                >
                  <span className="chip-icon">{rl.icon}</span>
                  <span className="chip-label" style={{ fontSize: '12px' }}>
                    {rl.label}
                  </span>
                </button>
              ))}
            </div>

            {/* ROOM DIMENSIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
              <div className="text-input-wrap" style={{ marginBottom: '0' }}>
                <label>Room width (feet)</label>
                <input
                  type="number"
                  placeholder="e.g. 14"
                  value={form.roomWidth}
                  onChange={e => set('roomWidth', Number(e.target.value))}
                />
              </div>
              <div className="text-input-wrap" style={{ marginBottom: '0' }}>
                <label>Room depth (feet)</label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={form.roomDepth}
                  onChange={e => set('roomDepth', Number(e.target.value))}
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="btn-row">
              <button className="btn-back" onClick={back}>
                ← Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button className="btn-skip" onClick={next}>
                  Skip this step
                </button>
                <button className="btn-next" onClick={next}>
                  Continue →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════
          STEP 2: FUNCTIONAL NEEDS
          (Matches HTML Step 3 exactly)
          ═════════════════════════════════ */}
      {step === 2 && (
        <div className="page active">
          {/* PROGRESS BAR */}
          <div className="form-chrome">
            <div className="progress-steps">
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot done">✓</div>
              <div className="step-line done"></div>
              <div className="step-dot active">3</div>
              <div className="step-line"></div>
              <div className="step-dot pending">4</div>
              <div className="step-line"></div>
              <div className="step-dot pending">5</div>
            </div>
            <div className="live-count">✦ 54 sofas match so far</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            <div className="form-eyebrow">Step 3 of 5</div>
            <h2 className="form-title">What must your {form.furnitureType || 'sofa'} do?</h2>
            <p className="form-sub">
              Select everything that applies — must-haves become hard filters, everything else gets a scoring boost.
            </p>

            {/* MUST-HAVE FEATURES */}
            <div className="section-label">Must-have features <span className="optional-tag">pick all that apply</span></div>
            <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {MUST_HAVE_FEATURES.map(f => (
                <button
                  key={f.id}
                  className={`chip ${form.mustHaveFeatures.includes(f.id) ? 'selected' : ''}`}
                  onClick={() => toggleArray('mustHaveFeatures', f.id)}
                >
                  <span className="chip-icon">{f.icon}</span>
                  <span className="chip-label">{f.label}</span>
                  <span className="chip-sub">{f.desc}</span>
                </button>
              ))}
            </div>

            <div className="divider"></div>

            {/* PAST ISSUES */}
            <div className="section-label">What went wrong with your last {form.furnitureType || 'sofa'}? <span className="optional-tag">optional</span></div>
            <div className="toggle-grid">
              {PAST_ISSUES.map((issue, idx) => (
                <button
                  key={idx}
                  className={`toggle-chip ${form.pastIssues.includes(issue) ? 'selected' : ''}`}
                  onClick={() => toggleArray('pastIssues', issue)}
                >
                  {issue}
                </button>
              ))}
            </div>

            {/* FILTERS APPLIED */}
            <div style={{ background: 'rgba(196,98,58,.06)', borderRadius: '10px', padding: '16px 18px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--terracotta)', marginBottom: '4px' }}>
                🎯 Filters applied from your answers
              </div>
              <div style={{ fontSize: '13px', color: 'var(--charcoal)', lineHeight: '1.6' }}>
                {form.mustHaveFeatures.includes('converttobed') ? 'Sofa-bed filter active · ' : ''}
                {form.pastIssues.length > 0 ? `Excluding related materials · ` : ''}
                Boosting relevant options
              </div>
            </div>

            {/* BUTTONS */}
            <div className="btn-row">
              <button className="btn-back" onClick={back}>
                ← Back
              </button>
              <button className="btn-next" onClick={next}>
                Continue → <span>Budget</span>
              </button>
            </div>
          </div>
        </div>
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
            <div className="live-count">✦ 34 sofas in range</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            <div className="form-eyebrow">Step 4 of 5</div>
            <h2 className="form-title">Budget & when you need it</h2>
            <p className="form-sub">Drag the slider to see how many sofas fit your budget in real time.</p>

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
            <div className="live-count">✦ 34 sofas ready to show</div>
          </div>

          {/* FORM CONTENT */}
          <div className="form-body">
            <div className="form-eyebrow">Step 5 of 5 — All optional</div>
            <h2 className="form-title">
              Any final preferences? <span className="optional-tag">skip to get results</span>
            </h2>
            <p className="form-sub">
              These help us avoid bad matches. Skip any or all — your results are already good.
            </p>

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
            <div style={{ fontSize: '12px', color: 'var(--warm-grey)', marginBottom: '28px' }}>
              Toggle to include or exclude specific brands from your results.
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
          <h1 style={{ fontSize: '36px', fontFamily: "'DM Serif Display', serif", color: 'var(--charcoal)', marginBottom: '14px', textAlign: 'center' }}>
            Finding your matches...
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--warm-grey)', textAlign: 'center', maxWidth: '500px' }}>
            Filtering across {form.city}, scoring against your context
          </p>
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
        <>
          <header className="site-header">
            <div className="logo">Furnish<span>AI</span></div>
            <nav>
              <a href="#" style={{ textDecoration: 'none' }}>Save search</a>
              <a href="#" style={{ textDecoration: 'none' }}>Share results</a>
            </nav>
            <button className="cta-btn" onClick={reset}>
              Start over
            </button>
          </header>
          <div className="results-wrapper">
          {/* Sidebar */}
          <aside className="results-sidebar">
            <div className="sidebar-title">Refine results</div>
            <div className="sidebar-sub">{results.length} items · {form.city}</div>

            <div className="sidebar-section">
              <div className="sl">Quick adjustments</div>
              <button className="refine-chip">💸 Too expensive — show cheaper</button>
              <button className="refine-chip">🎨 Not modern enough</button>
              <button className="refine-chip">📦 Show bigger options</button>
              <button className="refine-chip">🚚 In-stock this week only</button>
            </div>

            <div className="sidebar-section">
              <div className="sl">Price range</div>
              <div style={{ fontSize: '24px', fontFamily: "'DM Serif Display',serif", color: 'var(--charcoal)', marginBottom: '8px' }}>
                ₹15k – ₹{(priceFilter / 1000).toFixed(0)}k
              </div>
              <input
                type="range"
                min="5000"
                max="100000"
                value={priceFilter}
                onChange={e => setPriceFilter(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '12px', color: 'var(--warm-grey)', marginTop: '6px' }}>
                <span className="inline-count">{results.length} items</span>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sl">City</div>
              <select value={form.city} onChange={e => set('city', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--sand)' }}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </aside>

          {/* Main results */}
          <main className="results-main">
            <div className="results-header">
              <div>
                <div className="results-title">Your top matches</div>
                <div className="results-count">{results.length} results · Ranked for your perfect space</div>
              </div>
              <div className="results-controls">
                <button className="ctrl-btn">🔤 Sort by</button>
                <button className="ctrl-btn" onClick={() => setCompareMode(!compareMode)}>⊡ Compare</button>
                <button className="ctrl-btn">♡ Wishlist</button>
              </div>
            </div>

            <div className="results-grid">
              {results.slice(0, 3).map((item, idx) => {
                const isCompared = compareItems.includes(item.id)
                return (
                  <div key={item.id} className={`result-card ${idx === 0 ? 'rank-1' : ''}`}>
                    <div className="rank-badge">
                      {idx === 0 ? '✦ Best Match' : `✦ #${idx + 1}`}
                    </div>
                    <div className="compare-check" title="Add to compare" onClick={() => toggleCompare(item.id)} style={{ cursor: 'pointer' }}>
                      {isCompared ? '☑' : '☐'}
                    </div>
                    <div className="card-img">🛋️</div>
                    <div className="card-body">
                      <div className="card-brand">{item.brand}</div>
                      <div className="card-name">{item.name}</div>
                      <div className="card-rating">★ {item.rating} <span>({item.reviewCount} reviews)</span></div>
                      <div className="card-why">
                        <div className="why-label">Why it fits you</div>
                        {item.whyItFits}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', background: 'rgba(92,107,74,.1)', color: 'var(--moss)', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>✓ Sofa-bed</span>
                        <span style={{ fontSize: '11px', background: 'rgba(92,107,74,.1)', color: 'var(--moss)', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>30-day return</span>
                        <span style={{ fontSize: '11px', background: 'rgba(92,107,74,.1)', color: 'var(--moss)', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>Assembly incl.</span>
                      </div>
                      <div className="card-footer">
                        <div>
                          <div className="card-price">{fmt(item.price)}</div>
                          <div className="card-delivery">🚚 Delivery in 5–7 days · {form.city}</div>
                        </div>
                        <button className="card-cta" onClick={() => window.open(item.productUrl, '_blank')}>View →</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Feedback row */}
            <div style={{ marginTop: '36px', padding: '24px', background: 'var(--warm-white)', borderRadius: '14px', border: '1.5px solid var(--sand)', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--charcoal)', marginBottom: '6px' }}>None of these feel right?</div>
              <div style={{ fontSize: '13px', color: 'var(--warm-grey)', marginBottom: '18px' }}>Tell us what's off and we'll re-rank instantly</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button className="refine-chip" style={{ width: 'auto' }}>💸 Too expensive</button>
                <button className="refine-chip" style={{ width: 'auto' }}>🎨 Not my style</button>
                <button className="refine-chip" style={{ width: 'auto' }}>📏 Wrong size</button>
                <button className="refine-chip" style={{ width: 'auto' }}>📦 Show different brands</button>
                <button className="refine-chip" style={{ width: 'auto' }} onClick={reset}>🔄 Start over</button>
              </div>
            </div>
          </main>
          </div>
        </>
      )}

      {/* Compare sticky bar */}
      {compareMode && compareItems.length > 0 && (
        <div className="compare-bar">
          <span>Compare mode — {compareItems.length}/2 selected</span>
          <button>Compare now →</button>
        </div>
      )}
    </>
  )
}
