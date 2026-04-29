import type { FormData, PhotoSlot, PhotoSlotId } from './find-page-model'
import type { PainPointType } from '@/lib/types'

// ──────── FURNITURE TYPE OPTIONS ────────
export const FURNITURE_TYPES = [
  { id: 'sofa', label: 'Sofa', icon: '🛋️', desc: '2, 3 & L-shape' },
  { id: 'bed', label: 'Bed', icon: '🛏️', desc: 'Single to king' },
  { id: 'dining-table', label: 'Dining table', icon: '🍽️', desc: '4 to 8 seater' },
  { id: 'wardrobe', label: 'Wardrobe', icon: '🚪', desc: 'Sliding & hinged' },
  { id: 'desk', label: 'Desk', icon: '💻', desc: 'Study & WFH' },
  { id: 'chair', label: 'Chair', icon: '🪑', desc: 'Accent & dining' },
]

export const FURNITURE_INPUT_ALIASES: Record<string, string[]> = {
  sofa: ['sofa', 'couch', 'sectional', 'loveseat', 'settee', 'l shape sofa', 'l-shaped sofa'],
  bed: ['bed', 'cot', 'bed frame', 'queen bed', 'king bed', 'single bed'],
  'dining-table': ['dining table', 'dining set', 'dining table set', 'dining'],
  wardrobe: ['wardrobe', 'closet', 'cupboard', 'almirah', 'cabinet'],
  desk: ['desk', 'study table', 'work desk', 'office desk', 'writing desk', 'computer desk'],
  chair: ['chair', 'accent chair', 'dining chair', 'office chair', 'armchair', 'lounge chair'],
}

// ──────── ROOM TYPE OPTIONS ────────
export const ROOM_OPTIONS = [
  'Living room',
  'Bedroom',
  'Dining area',
  'Study / Home office',
  "Kids' room",
  'Guest room',
]

// ──────── GUIDE + PASSIVE CONTEXT ────────
export const GUIDE_MESSAGES = [
  { main: "Start with what you need — we'll do the rest.", why: 'Furniture type shapes every filter that follows.' },
  { main: 'Photos give context so recommendations fit your space.', why: 'Room analysis improves match precision significantly.' },
  { main: 'These questions come from what we saw in your room.', why: 'Each answer narrows the pool to better-fit items.' },
  { main: "Set your real ceiling — we'll find the best fit within it.", why: 'Budget is the #1 filter for match quality.' },
  { main: "Skip anything you're unsure about — results are ready.", why: 'Optional signals fine-tune rather than filter.' },
]

export const INVENTORY_COUNTS: Record<string, number> = {
  sofa: 247,
  bed: 128,
  'dining-table': 94,
  wardrobe: 76,
  desk: 112,
  chair: 183,
}

// ──────── OTHER STEP OPTIONS ────────
export const PAIN_PROFILES: { id: PainPointType; label: string }[] = [
  { id: 'stains_easily', label: '☕ Stains too easily' },
  { id: 'broke_down_durability', label: '💔 Broke down / poor durability' },
  { id: 'too_uncomfortable', label: '😣 Too uncomfortable' },
  { id: 'too_bulky', label: '📦 Too bulky' },
  { id: 'assembly_nightmare', label: '🔨 Assembly nightmare' },
]

export const STYLES = [
  { id: 'modern-minimal', label: 'Modern minimal', icon: '🪟' },
  { id: 'warm-natural', label: 'Warm & natural', icon: '🌾' },
  { id: 'classic', label: 'Classic / traditional', icon: '🏛️' },
  { id: 'bold', label: 'Contemporary bold', icon: '🖤' },
  { id: 'boho', label: 'Boho / eclectic', icon: '🌿' },
  { id: 'no-pref', label: 'No preference', icon: '🤷' },
]

export const MATERIAL_AVOIDANCES = [
  '🚫 Velvet (fades)',
  '🚫 Light linen (stains)',
  '🚫 Leather (hot climate)',
  '🚫 Jute / natural weave',
  '🚫 Plastic / acrylic',
]

export const BRANDS = [
  '✅ Urban Ladder',
  '✅ Wakefit',
  '✅ IKEA',
  '✅ Wooden Street',
]

export const CITIES = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']

// ──────── STEP 1: ROOM DETAILS ────────
export const WALL_COLORS = [
  { id: 'cream', label: 'Cream / Off-white', color: '#F5F0E8' },
  { id: 'beige', label: 'Beige / Sand', color: '#D1C9BE' },
  { id: 'sage', label: 'Sage / Muted green', color: '#A8B4A0' },
  { id: 'blue', label: 'Blue / Grey', color: '#8090A8' },
  { id: 'dark', label: 'Dark / Charcoal', color: '#2C2825' },
]

export const FLOOR_TYPES = [
  { id: 'wood', label: 'Wood', icon: '🪵' },
  { id: 'marble', label: 'Marble', icon: '⬜' },
  { id: 'tile', label: 'Tile', icon: '🟫' },
  { id: 'carpet', label: 'Carpet', icon: '🟩' },
]

export const ROOM_LAYOUTS = [
  { id: 'standard', label: 'Standard', icon: '📐' },
  { id: 'lshaped', label: 'L-shaped', icon: '🔲' },
  { id: 'narrow', label: 'Narrow', icon: '↔️' },
  { id: 'openplan', label: 'Open plan', icon: '🏟️' },
]

// ──────── STEP 2: FUNCTIONAL NEEDS ────────
// UNIVERSAL NEEDS (shown to all furniture types)
export const UNIVERSAL_NEEDS = {
  durability: [
    { id: 'kids_pets', label: '👶 Kids / pets house' },
    { id: 'daily_heavy', label: '💼 Daily heavy use' },
    { id: 'none', label: '✓ No issues yet' },
    { id: 'skip', label: '⊘ Skip this' },
  ],
  space: [
    { id: 'tight_corner', label: '📍 Tight corner fit' },
    { id: 'average', label: '📐 Average room' },
    { id: 'plenty', label: '✓ Plenty of space' },
  ],
  materials_avoid: [
    '🚫 Velvet (fades with use)',
    '🚫 Light linen (stains easily)',
    '🚫 Leather (hot climate)',
    '🚫 Jute / natural weave',
    '🚫 Plastic / acrylic',
  ],
}

// FURNITURE-TYPE-SPECIFIC NEEDS
export const FURNITURE_SPECIFIC_NEEDS: Record<string, { label: string; options: { id: string; label: string }[] }[]> = {
  sofa: [
    {
      label: 'How will guests use it?',
      options: [
        { id: 'occasional_visits', label: '🚪 Occasional visits' },
        { id: 'frequent_overnight', label: '🌙 Frequent overnight' },
        { id: 'just_sitting', label: '💺 Just sitting' },
      ],
    },
    {
      label: 'Comfort style?',
      options: [
        { id: 'firm_upright', label: '📐 Firm / upright' },
        { id: 'medium', label: '⚖️ Medium / balanced' },
        { id: 'lounging', label: '😴 Lounging / deep' },
      ],
    },
  ],
  bed: [
    {
      label: 'Firmness preference?',
      options: [
        { id: 'soft_plush', label: '☁️ Soft / plush' },
        { id: 'medium', label: '⚖️ Medium' },
        { id: 'firm_supportive', label: '🪨 Firm / supportive' },
      ],
    },
    {
      label: 'Guest accommodation?',
      options: [
        { id: 'singles_only', label: '1️⃣ Singles only' },
        { id: 'couples', label: '2️⃣ Couples' },
        { id: 'sleepover_space', label: '👥 Sleepover space' },
      ],
    },
  ],
  desk: [
    {
      label: 'Cable / tech needs?',
      options: [
        { id: 'minimal', label: '📱 Minimal (phone only)' },
        { id: 'moderate', label: '💻 Moderate (1–2 screens)' },
        { id: 'heavy', label: '⚡ Heavy (multiple devices)' },
      ],
    },
    {
      label: 'Adjustability?',
      options: [
        { id: 'fixed', label: '📏 Fixed height' },
        { id: 'manual_adjust', label: '🔧 Manual adjust' },
        { id: 'sitting_standing', label: '🔄 Sitting + standing' },
      ],
    },
  ],
  chair: [
    {
      label: 'Comfort priority?',
      options: [
        { id: 'everyday_sitting', label: '👤 Everyday sitting' },
        { id: 'long_sessions', label: '⏱️ Long work sessions' },
        { id: 'accent_decor', label: '🎨 Accent / decor' },
      ],
    },
    {
      label: 'Mobility?',
      options: [
        { id: 'stay_put', label: '📍 Stay in place' },
        { id: 'lightweight', label: '🪶 Light / movable' },
        { id: 'wheeled', label: '🔄 Wheeled' },
      ],
    },
  ],
  'dining-table': [
    {
      label: 'Guest capacity?',
      options: [
        { id: 'small_4_6', label: '4️⃣ 4–6 standard' },
        { id: 'large_8_plus', label: '8️⃣ 8+ large' },
        { id: 'expandable', label: '📖 Expandable' },
      ],
    },
    {
      label: 'Durability for entertaining?',
      options: [
        { id: 'formal', label: '🍽️ Formal / careful' },
        { id: 'casual', label: '🎉 Casual / family' },
        { id: 'kid_friendly', label: '👶 Kid-friendly' },
      ],
    },
  ],
  wardrobe: [
    {
      label: 'Accessibility / reach?',
      options: [
        { id: 'quick_daily', label: '⚡ Quick daily access' },
        { id: 'archival_storage', label: '📦 Archival storage' },
        { id: 'mixed_use', label: '⚖️ Mixed (daily + storage)' },
      ],
    },
    {
      label: 'Assembly effort?',
      options: [
        { id: 'flat_pack', label: '📦 Flat-pack (DIY)' },
        { id: 'assembled_ok', label: '✓ Assembled OK' },
        { id: 'pro_assembly', label: '🔧 Professional only' },
      ],
    },
  ],
}

// LEGACY: Past issues (now optional, revealed on demand)
export const AVOIDABLE_ISSUES = [
  '🧹 Stains easily',
  '💔 Breaks down fast',
  '😣 Uncomfortable',
  '📦 Too bulky',
  '🔩 Assembly nightmare',
]

// ──────── STEP 3: BUDGET & CONSTRAINTS ────────
export const BUDGET_OPTIONS = [
  { label: '🚫 Hard stop', desc: "Don't show anything above my limit" },
  { label: '💛 Show me if it\'s worth it', desc: 'Up to ~20% more if AI thinks it\'s the right fit' },
  { label: '💚 I\'m flexible', desc: 'Show me a wider range with reasons' },
  { label: '🎯 Best under budget', desc: 'Maximize value — price matters most' },
]

export const TIMELINES = [
  '⚡ This week (urgent)',
  '📅 This month',
  '🗓️ In 1–3 months',
  '🔍 Just exploring',
]

export const DELIVERIES = [
  '🚚 Home delivery OK',
  '🏪 Prefer local pickup',
  '🔧 With assembly included',
]

export const DEFAULTS: FormData = {
  furnitureType: '',
  roomType: 'Living room',
  wallColor: 'cream',
  floorType: 'wood',
  roomLayout: 'openplan',
  roomWidth: 14,
  roomDepth: 12,
  contextualAnswers: {},
  universalDurability: '',
  universalSpace: '',
  universalMaterials: [],
  typeSpecificAnswers: {},
  showAvoidIssues: false,
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

// ──────── PHOTO SLOTS ────────
export const PHOTO_SLOTS: readonly PhotoSlot[] = [
  { id: 'front', label: 'Front wall', icon: '🧱', hint: 'Main wall facing you as you enter' },
  { id: 'left', label: 'Left wall', icon: '←', hint: 'Wall to your left when standing opposite from it' },
  { id: 'right', label: 'Right wall', icon: '→', hint: 'Wall to your right when standing opposite from it' },
  { id: 'back', label: 'Back / entry', icon: '🚪', hint: 'The wall with the door / entry point' },
] as const
