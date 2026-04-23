/**
 * question-fallbacks.ts
 * Deterministic fallback questions per furniture type.
 * Used when the Groq question generation fails or returns fewer than 3 questions.
 *
 * Fallbacks adapt dynamically to two signals from the room analysis:
 *  - isCompactRoom: if spatialConstraints contain narrow/tight/limited/small
 *  - hasKidsOrPetsSignal: if existingFurniture mentions kid/toy/crib/stroller
 *
 * Extracted from app/api/generate-questions/route.ts for reuse and easier updates.
 */

import type { ContextualQuestion, RoomAnalysis } from '@/lib/types'

function detectCompactRoom(roomAnalysis?: RoomAnalysis): boolean {
  return roomAnalysis?.spatialConstraints.some(
    constraint => /narrow|tight|limited|small/i.test(constraint)
  ) ?? false
}

function detectKidsOrPets(roomAnalysis?: RoomAnalysis): boolean {
  const furnitureText = (roomAnalysis?.existingFurniture ?? []).join(' ')
  return /kid|toy|crib|stroller/i.test(furnitureText)
}

function sofaFallbacks(isCompact: boolean, hasKids: boolean): ContextualQuestion[] {
  return [
    {
      id: 'sofa_main_use',
      question: 'What is this sofa mainly for?',
      options: [
        { id: 'daily_family',   label: 'Daily family use' },
        { id: 'hosting_guests', label: 'Hosting guests' },
        { id: 'lounging_tv',    label: 'Lounging / TV' },
      ],
    },
    {
      id: 'sofa_guest_need',
      question: 'Will anyone sleep on it?',
      options: [
        { id: 'never',     label: 'No' },
        { id: 'sometimes', label: 'Sometimes' },
        { id: 'often',     label: 'Often' },
      ],
    },
    {
      id: 'sofa_room_fit',
      question: isCompact ? 'How tight is the fit?' : 'How large should it feel in the room?',
      options: isCompact
        ? [
            { id: 'very_compact',     label: 'Very compact' },
            { id: 'balanced',         label: 'Balanced fit' },
            { id: 'can_push_limits',  label: 'Can push the size a bit' },
          ]
        : [
            { id: 'compact',   label: 'Keep it compact' },
            { id: 'balanced',  label: 'Balanced size' },
            { id: 'statement', label: 'Statement piece' },
          ],
    },
    {
      id: 'sofa_durability',
      question: 'How much wear should it handle?',
      options: hasKids
        ? [
            { id: 'kid_proof',   label: 'Kid-friendly' },
            { id: 'easy_clean',  label: 'Easy to clean' },
            { id: 'normal_use',  label: 'Normal use' },
          ]
        : [
            { id: 'heavy_use',   label: 'Heavy daily use' },
            { id: 'moderate_use',label: 'Moderate use' },
            { id: 'low_use',     label: 'Low use' },
          ],
    },
  ]
}

function bedFallbacks(): ContextualQuestion[] {
  return [
    {
      id: 'bed_sleepers',
      question: 'Who will use this bed most?',
      options: [
        { id: 'single',    label: 'One person' },
        { id: 'couple',    label: 'Two people' },
        { id: 'guest_bed', label: 'Guests' },
      ],
    },
    {
      id: 'bed_feel',
      question: 'What sleep feel do you want?',
      options: [
        { id: 'soft',     label: 'Soft' },
        { id: 'balanced', label: 'Balanced' },
        { id: 'firm',     label: 'Firm' },
      ],
    },
    {
      id: 'bed_storage',
      question: 'Should the bed include storage?',
      options: [
        { id: 'must_have',    label: 'Yes, definitely' },
        { id: 'nice_to_have', label: 'Nice to have' },
        { id: 'not_needed',   label: 'Not needed' },
      ],
    },
  ]
}

function diningTableFallbacks(): ContextualQuestion[] {
  return [
    {
      id: 'dining_seating',
      question: 'How many people on a typical day?',
      options: [
        { id: 'two_four',  label: '2–4' },
        { id: 'four_six',  label: '4–6' },
        { id: 'six_plus',  label: '6+' },
      ],
    },
    {
      id: 'dining_guests',
      question: 'Do you host larger meals often?',
      options: [
        { id: 'rarely',    label: 'Rarely' },
        { id: 'sometimes', label: 'Sometimes' },
        { id: 'often',     label: 'Often' },
      ],
    },
    {
      id: 'dining_space',
      question: 'What matters more in your space?',
      options: [
        { id: 'easy_movement', label: 'Easy movement around it' },
        { id: 'more_seating',  label: 'More seating' },
        { id: 'balanced',      label: 'A balance' },
      ],
    },
  ]
}

function wardrobeFallbacks(): ContextualQuestion[] {
  return [
    {
      id: 'wardrobe_storage_type',
      question: 'What should it mainly organize?',
      options: [
        { id: 'daily_clothes', label: 'Daily clothes' },
        { id: 'mixed_storage', label: 'Clothes + extras' },
        { id: 'bulk_storage',  label: 'Bulk storage' },
      ],
    },
    {
      id: 'wardrobe_access',
      question: 'How accessible should everything be?',
      options: [
        { id: 'quick_access',  label: 'Quick access' },
        { id: 'balanced',      label: 'Balanced' },
        { id: 'max_capacity',  label: 'Max capacity' },
      ],
    },
    {
      id: 'wardrobe_fit',
      question: 'What matters more for the fit?',
      options: [
        { id: 'compact_depth', label: 'Compact depth' },
        { id: 'more_width',    label: 'More width' },
        { id: 'more_height',   label: 'More height' },
      ],
    },
  ]
}

function deskFallbacks(): ContextualQuestion[] {
  return [
    {
      id: 'desk_work_type',
      question: 'What kind of work happens here?',
      options: [
        { id: 'laptop',          label: 'Mostly laptop' },
        { id: 'monitor_setup',   label: 'Monitor setup' },
        { id: 'creative_spread', label: 'Creative / spread-out work' },
      ],
    },
    {
      id: 'desk_hours',
      question: 'How long at a stretch?',
      options: [
        { id: 'short',    label: 'Short sessions' },
        { id: 'half_day', label: 'Half day' },
        { id: 'full_day', label: 'Full day' },
      ],
    },
    {
      id: 'desk_cables',
      question: 'How cable-heavy is the setup?',
      options: [
        { id: 'minimal',  label: 'Very minimal' },
        { id: 'moderate', label: 'Moderate' },
        { id: 'heavy',    label: 'Heavy cables / devices' },
      ],
    },
  ]
}

function chairFallbacks(): ContextualQuestion[] {
  return [
    {
      id: 'chair_use',
      question: 'What is this chair mainly for?',
      options: [
        { id: 'desk_use',    label: 'Desk use' },
        { id: 'dining_use',  label: 'Dining' },
        { id: 'accent_use',  label: 'Accent seating' },
      ],
    },
    {
      id: 'chair_duration',
      question: 'How long will someone sit in it?',
      options: [
        { id: 'short',    label: 'Short bursts' },
        { id: 'moderate', label: '1–2 hours' },
        { id: 'long',     label: 'Long sessions' },
      ],
    },
    {
      id: 'chair_move',
      question: 'Should it stay put or move around?',
      options: [
        { id: 'fixed',         label: 'Stay put' },
        { id: 'sometimes_move',label: 'Move sometimes' },
        { id: 'move_often',    label: 'Move often' },
      ],
    },
  ]
}

const FALLBACK_MAP: Record<string, (isCompact: boolean, hasKids: boolean) => ContextualQuestion[]> = {
  sofa:          sofaFallbacks,
  bed:           () => bedFallbacks(),
  'dining-table':() => diningTableFallbacks(),
  wardrobe:      () => wardrobeFallbacks(),
  desk:          () => deskFallbacks(),
  chair:         () => chairFallbacks(),
}

/**
 * Returns deterministic fallback questions for the given furniture type,
 * adapted for compact rooms and kids/pets signals if room analysis is available.
 */
export function getFallbackQuestions(
  furnitureType: string,
  roomAnalysis?: RoomAnalysis
): ContextualQuestion[] {
  const isCompact = detectCompactRoom(roomAnalysis)
  const hasKids   = detectKidsOrPets(roomAnalysis)
  const generator = FALLBACK_MAP[furnitureType] ?? FALLBACK_MAP.sofa
  return generator(isCompact, hasKids)
}
