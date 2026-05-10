// lib/repositories/repositoryFactory.ts
// Factory for creating furniture repository instances
// Implements Factory pattern and Dependency Inversion principle

import type { IFurnitureRepository } from './IFurnitureRepository'
import { InMemoryFurnitureRepository } from './InMemoryFurnitureRepository'
import { SupabaseFurnitureRepository } from './SupabaseFurnitureRepository'
import { furnitureData } from '@/lib/furniture-data'

let repositoryInstance: IFurnitureRepository | null = null

/**
 * Determines which repository implementation to use based on environment variables.
 * 
 * Feature flags:
 * - USE_SUPABASE_DB: Set to 'true' to use Supabase/Postgres (default: in-memory)
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon key
 * 
 * Priority:
 * 1. If SUPABASE is explicitly enabled and credentials exist → SupabaseFurnitureRepository
 * 2. Otherwise → InMemoryFurnitureRepository
 */
function createRepositoryInstance(): IFurnitureRepository {
  const useSupabase = process.env.USE_SUPABASE_DB === 'true'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (useSupabase && supabaseUrl && supabaseAnonKey) {
    console.log('[repositoryFactory] Using SupabaseFurnitureRepository')
    return new SupabaseFurnitureRepository(supabaseUrl, supabaseAnonKey)
  }

  console.log('[repositoryFactory] Using InMemoryFurnitureRepository')
  return new InMemoryFurnitureRepository(furnitureData)
}

/**
 * Get or create the furniture repository (singleton pattern)
 * 
 * Returns:
 * - SupabaseFurnitureRepository if USE_SUPABASE_DB=true and credentials are available
 * - InMemoryFurnitureRepository otherwise
 */
export function getFurnitureRepository(): IFurnitureRepository {
  if (repositoryInstance) return repositoryInstance
  repositoryInstance = createRepositoryInstance()
  return repositoryInstance
}

/**
 * Set a custom repository (useful for testing and dependency injection)
 */
export function setFurnitureRepository(repo: IFurnitureRepository): void {
  repositoryInstance = repo
}

/**
 * Clear the cached repository instance
 * Use in tests or when switching backends dynamically
 */
export function clearFurnitureRepository(): void {
  repositoryInstance = null
}
