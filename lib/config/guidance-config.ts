// lib/config/guidance-config.ts
// Guide messages, pain profiles, and help text

import type { PainPointType } from '@/lib/types'

export interface GuideMessage {
  main: string
  why: string
}

export interface PainProfile {
  id: PainPointType
  label: string
}

export const GUIDE_MESSAGES: GuideMessage[] = [
  { main: "Start with what you need — we'll do the rest.", why: 'Furniture type shapes every filter that follows.' },
  { main: 'Photos give context so recommendations fit your space.', why: 'Room analysis improves match precision significantly.' },
  { main: 'These questions come from what we saw in your room.', why: 'Each answer narrows the pool to better-fit items.' },
  { main: "Set your real ceiling — we'll find the best fit within it.", why: 'Budget is the #1 filter for match quality.' },
  { main: "Skip anything you're unsure about — results are ready.", why: 'Optional signals fine-tune rather than filter.' },
]

export const PAIN_PROFILES: PainProfile[] = [
  { id: 'stains_easily', label: '☕ Stains too easily' },
  { id: 'broke_down_durability', label: '💔 Broke down / poor durability' },
  { id: 'too_uncomfortable', label: '😣 Too uncomfortable' },
  { id: 'too_bulky', label: '📦 Too bulky' },
  { id: 'assembly_nightmare', label: '🔨 Assembly nightmare' },
]

/**
 * Get guide message for a step
 */
export function getGuideMessage(stepIndex: number): GuideMessage {
  return GUIDE_MESSAGES[stepIndex] ?? GUIDE_MESSAGES[0]
}

/**
 * Get pain profile by ID
 */
export function getPainProfileLabel(id: PainPointType): string {
  const profile = PAIN_PROFILES.find(p => p.id === id)
  return profile?.label ?? id
}

/**
 * Get all pain profiles
 */
export function getAllPainProfiles(): PainProfile[] {
  return PAIN_PROFILES
}
