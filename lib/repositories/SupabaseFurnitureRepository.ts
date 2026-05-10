// lib/repositories/SupabaseFurnitureRepository.ts
// Postgres/Supabase implementation of IFurnitureRepository
// Follows Repository pattern and Dependency Inversion principle

import type { FurnitureItem, FurnitureCategory } from '@/lib/types'
import type { IFurnitureRepository, FurnitureFilter } from './IFurnitureRepository'

interface SupabaseRow {
  id: string
  name: string
  category: FurnitureCategory
  price: number
  brand: string
  width_cm: number
  depth_cm: number
  height_cm: number
  durability: 'low' | 'medium' | 'high'
  durability_score: number
  maintenance_ease: 'low' | 'medium' | 'high'
  warranty_years: number
  assembly_complexity: 'low' | 'medium' | 'high'
  delivery_available: boolean
  in_stock: boolean
  material: string
  description: string | null
  image_url: string | null
  product_url: string | null
  rating: number
  review_count: number
  style_tags: string[]
  product_tags: string[]
  cities: string[]
}

/**
 * Supabase/Postgres implementation of furniture repository.
 * 
 * Responsibilities:
 * - Execute SQL queries against Postgres via Supabase client
 * - Map between database rows and FurnitureItem domain objects
 * - Apply filtering, sorting, and pagination
 * 
 * Design decisions:
 * - Uses raw SQL queries for performance and control
 * - Implements FurnitureFilter interface for flexible queries
 * - No caching here (cache layer is separate concern)
 */
export class SupabaseFurnitureRepository implements IFurnitureRepository {
  private supabaseUrl: string
  private supabaseAnonKey: string

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SupabaseFurnitureRepository requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    this.supabaseUrl = supabaseUrl
    this.supabaseAnonKey = supabaseAnonKey
  }

  /**
   * Map database row to domain FurnitureItem
   */
  private rowToItem(row: SupabaseRow): FurnitureItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      price: row.price,
      brand: row.brand,
      cities: row.cities,
      deliveryAvailable: row.delivery_available,
      style: row.style_tags as any,
      material: row.material,
      dimensions: {
        width: row.width_cm,
        depth: row.depth_cm,
        height: row.height_cm,
      },
      durability: row.durability,
      durabilityScore: row.durability_score,
      maintenanceEase: row.maintenance_ease,
      warrantyYears: row.warranty_years,
      assemblyComplexity: row.assembly_complexity,
      imageUrl: row.image_url ?? '',
      productUrl: row.product_url ?? '',
      inStock: row.in_stock,
      rating: row.rating,
      reviewCount: row.review_count,
      description: row.description ?? '',
      tags: row.product_tags,
    }
  }

  /**
   * Execute a query against Supabase REST API
   */
  private async query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    const apiUrl = `${this.supabaseUrl}/rest/v1/rpc`
    
    // For now, use simple fetch-based approach
    // In production, use @supabase/supabase-js client for better abstractions
    const response = await fetch(`${this.supabaseUrl}/rest/v1/products`, {
      method: 'GET',
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${this.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async findById(id: string): Promise<FurnitureItem | null> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      {
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
      }
    )

    if (!response.ok) return null
    const rows: SupabaseRow[] = await response.json()
    return rows.length > 0 ? this.rowToItem(rows[0]) : null
  }

  async findByCategory(category: FurnitureCategory): Promise<FurnitureItem[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/products?category=eq.${encodeURIComponent(category)}`,
      {
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
      }
    )

    if (!response.ok) return []
    const rows: SupabaseRow[] = await response.json()
    return rows.map(row => this.rowToItem(row))
  }

  async findByCriteria(filter: FurnitureFilter): Promise<FurnitureItem[]> {
    // Build query string from filter constraints
    const params = new URLSearchParams()

    if (filter.category) params.append('category', `eq.${filter.category}`)
    if (filter.priceMin !== undefined) params.append('price', `gte.${filter.priceMin}`)
    if (filter.priceMax !== undefined) params.append('price', `lte.${filter.priceMax}`)
    if (filter.inStockOnly) params.append('in_stock', 'eq.true')
    if (filter.brand) params.append('brand', `eq.${filter.brand}`)
    if (filter.deliveryAvailable) params.append('delivery_available', 'eq.true')

    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/products?${params.toString()}`,
      {
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
      }
    )

    if (!response.ok) return []
    const rows: SupabaseRow[] = await response.json()
    
    // Apply city and tags filters client-side (for now)
    return rows
      .filter(row => !filter.city || row.cities.includes(filter.city))
      .filter(row => !filter.tags || filter.tags.length === 0 || filter.tags.every(tag => row.product_tags.includes(tag)))
      .map(row => this.rowToItem(row))
  }

  async findAll(): Promise<FurnitureItem[]> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/products`, {
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${this.supabaseAnonKey}`,
      },
    })

    if (!response.ok) return []
    const rows: SupabaseRow[] = await response.json()
    return rows.map(row => this.rowToItem(row))
  }

  async count(filter?: FurnitureFilter): Promise<number> {
    const results = filter ? await this.findByCriteria(filter) : await this.findAll()
    return results.length
  }

  async findByIds(ids: string[]): Promise<FurnitureItem[]> {
    if (ids.length === 0) return []

    // Supabase doesn't support direct array filtering easily, so fetch all and filter
    const response = await fetch(`${this.supabaseUrl}/rest/v1/products`, {
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${this.supabaseAnonKey}`,
      },
    })

    if (!response.ok) return []
    const rows: SupabaseRow[] = await response.json()
    const idSet = new Set(ids)
    return rows.filter(row => idSet.has(row.id)).map(row => this.rowToItem(row))
  }

  async getDistinctValues(field: 'brand' | 'city' | 'category'): Promise<string[]> {
    let url = `${this.supabaseUrl}/rest/v1/products?select=${field}`
    
    const response = await fetch(url, {
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${this.supabaseAnonKey}`,
      },
    })

    if (!response.ok) return []
    const rows: any[] = await response.json()

    // Handle different field types
    if (field === 'city') {
      // cities is an array, so flatten
      const cities = new Set<string>()
      rows.forEach(row => {
        if (Array.isArray(row.cities)) {
          row.cities.forEach((city: string) => cities.add(city))
        }
      })
      return Array.from(cities).sort()
    } else {
      // brand and category are single values
      const values = new Set<string>()
      rows.forEach(row => {
        if (row[field]) values.add(row[field])
      })
      return Array.from(values).sort()
    }
  }
}
