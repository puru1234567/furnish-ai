// lib/config/furniture-config.ts
// Furniture type definitions and inventory


export interface FurnitureTypeConfig {
  id: string
  label: string
  icon: string
  desc: string
}

export const FURNITURE_TYPES: FurnitureTypeConfig[] = [
  { id: 'sofa', label: 'Sofa', icon: '🛋️', desc: '2, 3 & L-shape' },
  { id: 'bed', label: 'Bed', icon: '🛏️', desc: 'Single to king' },
  { id: 'dining-table', label: 'Dining table', icon: '🍽️', desc: '4 to 8 seater' },
  { id: 'wardrobe', label: 'Wardrobe', icon: '🚪', desc: 'Sliding & hinged' },
  { id: 'desk', label: 'Desk', icon: '💻', desc: 'Study & WFH' },
  { id: 'chair', label: 'Chair', icon: '🪑', desc: 'Accent & dining' },
]

export const INVENTORY_COUNTS: Record<string, number> = {
  sofa: 247,
  bed: 128,
  'dining-table': 94,
  wardrobe: 76,
  desk: 112,
  chair: 183,
}

/**
 * Get furniture type config by ID
 */
export function getFurnitureTypeConfig(id: string): FurnitureTypeConfig | null {
  return FURNITURE_TYPES.find(t => t.id === id) ?? null
}

/**
 * Get inventory count for furniture type
 */
export function getInventoryCount(furnitureType: string): number {
  return INVENTORY_COUNTS[furnitureType] ?? 247
}
