// lib/config/location-config.ts
// Cities and location configuration

export const CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
]

/**
 * Validate city
 */
export function isValidCity(city: string): boolean {
  return CITIES.includes(city)
}

/**
 * Get all available cities
 */
export function getAllCities(): string[] {
  return CITIES
}
