// lib/config/style-config.ts
// Aesthetic styles, materials, and brands

export interface StyleOption {
  id: string
  label: string
  icon: string
}

export const STYLES: StyleOption[] = [
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

/**
 * Get style config by ID
 */
export function getStyleConfig(id: string): StyleOption | null {
  return STYLES.find(s => s.id === id) ?? null
}

/**
 * Check if material avoidance is valid
 */
export function isValidMaterialAvoidance(material: string): boolean {
  return MATERIAL_AVOIDANCES.includes(material)
}

/**
 * Check if brand is valid
 */
export function isValidBrand(brand: string): boolean {
  return BRANDS.includes(brand)
}
