// lib/repositories/IFurnitureRepository.ts
// Furniture repository interface (Repository Pattern)

import type { FurnitureItem, FurnitureCategory } from '@/lib/types'

export interface FurnitureFilter {
  category?: FurnitureCategory
  priceMin?: number
  priceMax?: number
  city?: string
  inStockOnly?: boolean
  brand?: string
  tags?: string[]
  deliveryAvailable?: boolean
}

/**
 * Repository interface for furniture inventory
 * Defines all operations needed to access furniture data
 */
export interface IFurnitureRepository {
  /**
   * Find a single item by ID
   */
  findById(id: string): Promise<FurnitureItem | null>

  /**
   * Find all items in a category
   */
  findByCategory(category: FurnitureCategory): Promise<FurnitureItem[]>

  /**
   * Find items matching filter criteria
   */
  findByCriteria(filter: FurnitureFilter): Promise<FurnitureItem[]>

  /**
   * Get all items
   */
  findAll(): Promise<FurnitureItem[]>

  /**
   * Get total count of items matching criteria
   */
  count(filter?: FurnitureFilter): Promise<number>

  /**
   * Find multiple items by IDs
   */
  findByIds(ids: string[]): Promise<FurnitureItem[]>

  /**
   * Get distinct values for a field
   */
  getDistinctValues(field: 'brand' | 'city' | 'category'): Promise<string[]>
}
