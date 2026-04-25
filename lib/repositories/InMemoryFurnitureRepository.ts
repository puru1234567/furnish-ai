// lib/repositories/InMemoryFurnitureRepository.ts
// In-memory implementation of furniture repository (for development/testing)

import type { FurnitureItem, FurnitureCategory } from '@/lib/types'
import type { IFurnitureRepository, FurnitureFilter } from './IFurnitureRepository'

/**
 * In-memory repository for furniture inventory
 * Used during development and for testing
 * Will be replaced with SupabaseFurnitureRepository in production
 */
export class InMemoryFurnitureRepository implements IFurnitureRepository {
  constructor(private data: FurnitureItem[]) {}

  async findById(id: string): Promise<FurnitureItem | null> {
    return this.data.find(item => item.id === id) ?? null
  }

  async findByCategory(category: FurnitureCategory): Promise<FurnitureItem[]> {
    return this.data.filter(item => item.category === category)
  }

  async findByCriteria(filter: FurnitureFilter): Promise<FurnitureItem[]> {
    return this.data.filter(item => {
      if (filter.category && item.category !== filter.category) return false
      if (filter.priceMin !== undefined && item.price < filter.priceMin) return false
      if (filter.priceMax !== undefined && item.price > filter.priceMax) return false
      if (filter.city && !item.cities.includes(filter.city)) return false
      if (filter.inStockOnly && !item.inStock) return false
      if (filter.brand && item.brand !== filter.brand) return false
      if (filter.deliveryAvailable && !item.deliveryAvailable) return false
      if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every(tag => item.tags.includes(tag))
        if (!hasAllTags) return false
      }
      return true
    })
  }

  async findAll(): Promise<FurnitureItem[]> {
    return this.data
  }

  async count(filter?: FurnitureFilter): Promise<number> {
    if (!filter) return this.data.length
    const results = await this.findByCriteria(filter)
    return results.length
  }

  async findByIds(ids: string[]): Promise<FurnitureItem[]> {
    const idSet = new Set(ids)
    return this.data.filter(item => idSet.has(item.id))
  }

  async getDistinctValues(field: 'brand' | 'city' | 'category'): Promise<string[]> {
    const values = new Set<string>()
    for (const item of this.data) {
      if (field === 'brand') {
        values.add(item.brand)
      } else if (field === 'city') {
        item.cities.forEach(city => values.add(city))
      } else if (field === 'category') {
        values.add(item.category)
      }
    }
    return Array.from(values).sort()
  }
}
