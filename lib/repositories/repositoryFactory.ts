// lib/repositories/repositoryFactory.ts
// Factory for creating furniture repository instances
// Implements Factory pattern and Dependency Inversion principle

import type { IFurnitureRepository } from './IFurnitureRepository'
import type { FurnitureCategory, FurnitureItem } from '@/lib/types'
import { furnitureData } from '@/lib/furniture-data'
import { InMemoryFurnitureRepository } from './InMemoryFurnitureRepository'
import { SupabaseFurnitureRepository } from './SupabaseFurnitureRepository'

let repositoryInstance: IFurnitureRepository | null = null

class FallbackFurnitureRepository implements IFurnitureRepository {
  constructor(
    private readonly primary: IFurnitureRepository,
    private readonly fallback: IFurnitureRepository,
  ) {}

  private async withFallback<T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error
      }

      console.warn('[FallbackFurnitureRepository] Supabase failed, using in-memory fallback')
      return fallbackOperation()
    }
  }

  findById(id: string): Promise<FurnitureItem | null> {
    return this.withFallback(() => this.primary.findById(id), () => this.fallback.findById(id))
  }

  findByCategory(category: FurnitureCategory): Promise<FurnitureItem[]> {
    return this.withFallback(
      () => this.primary.findByCategory(category),
      () => this.fallback.findByCategory(category),
    )
  }

  findByCriteria(filter: Parameters<IFurnitureRepository['findByCriteria']>[0]): Promise<FurnitureItem[]> {
    return this.withFallback(
      () => this.primary.findByCriteria(filter),
      () => this.fallback.findByCriteria(filter),
    )
  }

  findAll(): Promise<FurnitureItem[]> {
    return this.withFallback(() => this.primary.findAll(), () => this.fallback.findAll())
  }

  count(filter?: Parameters<IFurnitureRepository['count']>[0]): Promise<number> {
    return this.withFallback(() => this.primary.count(filter), () => this.fallback.count(filter))
  }

  findByIds(ids: string[]): Promise<FurnitureItem[]> {
    return this.withFallback(() => this.primary.findByIds(ids), () => this.fallback.findByIds(ids))
  }

  getDistinctValues(field: Parameters<IFurnitureRepository['getDistinctValues']>[0]): Promise<string[]> {
    return this.withFallback(
      () => this.primary.getDistinctValues(field),
      () => this.fallback.getDistinctValues(field),
    )
  }
}

/**
 * Database-only repository factory.
 * Always uses Supabase/Postgres backend.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
function createRepositoryInstance(): IFurnitureRepository {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY
  const inMemoryRepo = new InMemoryFurnitureRepository(furnitureData)

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '[repositoryFactory] Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    )
  }

  try {
    const supabaseRepo = new SupabaseFurnitureRepository(supabaseUrl, supabaseKey)
    console.log('[repositoryFactory] Using SupabaseFurnitureRepository (DB-only mode)')
    return new FallbackFurnitureRepository(supabaseRepo, inMemoryRepo)
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    console.warn('[FallbackFurnitureRepository] Supabase failed, using in-memory fallback')
    return inMemoryRepo
  }
}

/**
 * Get or create the furniture repository (singleton pattern)
 *
 * Returns a Supabase-backed repository instance.
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
