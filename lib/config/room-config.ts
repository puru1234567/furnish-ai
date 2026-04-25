// lib/config/room-config.ts
// Room type definitions and analysis options

import type { RoomType } from '@/lib/types'

export interface WallColorOption {
  id: string
  label: string
  color: string
}

export interface FloorTypeOption {
  id: string
  label: string
}

export interface RoomLayoutOption {
  id: string
  label: string
}

export const ROOM_OPTIONS = [
  'Living room',
  'Bedroom',
  'Dining area',
  'Study / Home office',
  "Kids' room",
  'Guest room',
]

export const WALL_COLORS: WallColorOption[] = [
  { id: 'cream', label: 'Cream / Off-white', color: '#F5F0E8' },
  { id: 'beige', label: 'Beige / Sand', color: '#D1C9BE' },
  { id: 'grey', label: 'Grey / Taupe', color: '#A8A89C' },
  { id: 'white', label: 'Stark white', color: '#FAFAF8' },
  { id: 'pastels', label: 'Pastels (blue/green/pink)', color: '#C5D5E1' },
  { id: 'bold', label: 'Bold / saturated color', color: '#6B4B47' },
]

export const FLOOR_TYPES: FloorTypeOption[] = [
  { id: 'wood', label: 'Wood / Laminate' },
  { id: 'tile', label: 'Tile / Stone' },
  { id: 'concrete', label: 'Concrete / Polished' },
  { id: 'carpet', label: 'Carpet / Rug' },
  { id: 'mixed', label: 'Mixed types' },
]

export const ROOM_LAYOUTS: RoomLayoutOption[] = [
  { id: 'square', label: 'Square / compact' },
  { id: 'rectangular', label: 'Rectangular / long' },
  { id: 'lshaped', label: 'L-shaped / open plan' },
  { id: 'narrow', label: 'Narrow / corridor-like' },
]

/**
 * Get wall color config by ID
 */
export function getWallColorConfig(id: string): WallColorOption | null {
  return WALL_COLORS.find(wc => wc.id === id) ?? null
}

/**
 * Get floor type config by ID
 */
export function getFloorTypeConfig(id: string): FloorTypeOption | null {
  return FLOOR_TYPES.find(ft => ft.id === id) ?? null
}

/**
 * Get room layout config by ID
 */
export function getRoomLayoutConfig(id: string): RoomLayoutOption | null {
  return ROOM_LAYOUTS.find(rl => rl.id === id) ?? null
}
