// lib/repositories/repositoryFactory.ts
// Factory for creating furniture repository instances

import type { IFurnitureRepository } from './IFurnitureRepository'
import { InMemoryFurnitureRepository } from './InMemoryFurnitureRepository'
import { furnitureData } from '@/lib/furniture-data'

let repositoryInstance: IFurnitureRepository | null = null

/**
 * Get or create the furniture repository
 * Uses environment variables to determine implementation
 */
export function getFurnitureRepository(): IFurnitureRepository {
  if (repositoryInstance) return repositoryInstance

  // For now, use in-memory repository
  // Later, can switch to Supabase by checking environment variables:
  // if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  //   repositoryInstance = new SupabaseFurnitureRepository(...)
  // } else {
  repositoryInstance = new InMemoryFurnitureRepository(furnitureData)
  // }

  return repositoryInstance
}

/**
 * Set a custom repository (useful for testing)
 */
export function setFurnitureRepository(repo: IFurnitureRepository): void {
  repositoryInstance = repo
}

/**
 * Clear the cached repository instance
 */
export function clearFurnitureRepository(): void {
  repositoryInstance = null
}
