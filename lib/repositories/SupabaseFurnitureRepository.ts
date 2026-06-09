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

  private formatErrorPreview(raw: string): string {
    // Prevent massive HTML pages (e.g., Cloudflare 5xx) from flooding logs.
    const compact = raw.replace(/\s+/g, ' ').trim()
    return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact
  }

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
      price: Number(row.price) ?? 0,
      brand: row.brand,
      cities: row.cities,
      deliveryAvailable: row.delivery_available,
      style: row.style_tags as any,
      material: row.material,
      dimensions: {
        width: Number(row.width_cm) ?? 0,
        depth: Number(row.depth_cm) ?? 0,
        height: Number(row.height_cm) ?? 0,
      },
      durability: row.durability,
      durabilityScore: Number(row.durability_score) ?? 0,
      maintenanceEase: row.maintenance_ease,
      warrantyYears: Number(row.warranty_years) ?? 0,
      assemblyComplexity: row.assembly_complexity,
      imageUrl: row.image_url ?? '',
      productUrl: row.product_url ?? '',
      inStock: row.in_stock,
      rating: Number(row.rating) ?? 0,
      reviewCount: Number(row.review_count) ?? 0,
      description: row.description ?? '',
      tags: row.product_tags ?? [],
    }
  }

  /**
   * Execute a query against Supabase REST API
   */
  private async query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    const apiUrl = `${this.supabaseUrl}/rest/v1/rpc`
    
    // For now, use simple fetch-based approach
    // In production, use @supabase/supabase-js client for better abstractions
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/products`, {
        method: 'GET',
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[SupabaseFurnitureRepository] query failed', {
          status: response.status,
          error: this.formatErrorPreview(errorBody),
        })
        return []
      }

      const data: T[] = await response.json()
      return data
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] query threw:`, error)
      return []
    }
  }

  async findById(id: string): Promise<FurnitureItem | null> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
        {
          headers: {
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
        }
      )

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[SupabaseFurnitureRepository] findById failed', {
          status: response.status,
          error: this.formatErrorPreview(errorBody),
        })
        return null
      }

      const rows: SupabaseRow[] = await response.json()
      return rows.length > 0 ? this.rowToItem(rows[0]) : null
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] findById threw:`, error)
      return null
    }
  }

  async findByCategory(category: FurnitureCategory): Promise<FurnitureItem[]> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/products?category=eq.${encodeURIComponent(category)}`,
        {
          headers: {
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
        }
      )

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[SupabaseFurnitureRepository] findByCategory failed', {
          status: response.status,
          error: this.formatErrorPreview(errorBody),
        })
        return []
      }

      const rows: SupabaseRow[] = await response.json()
      return rows.map(row => this.rowToItem(row))
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] findByCategory threw:`, error)
      return []
    }
  }

  async findByCriteria(filter: FurnitureFilter): Promise<FurnitureItem[]> {
    try {
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

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[SupabaseFurnitureRepository] findByCriteria failed', {
          status: response.status,
          error: this.formatErrorPreview(errorBody),
        })
        return []
      }

      const rows: SupabaseRow[] = await response.json()
      return rows
        .filter(row => !filter.city || (row.cities ?? []).includes(filter.city))
        .filter(row => !filter.tags || filter.tags.length === 0 || filter.tags.every(tag => (row.product_tags ?? []).includes(tag)))
        .map(row => this.rowToItem(row))
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] findByCriteria threw:`, error)
      return []
    }
  }

  async findAll(): Promise<FurnitureItem[]> {
    // Fetch all products with pagination: offset=0, limit=1000 (Supabase default max)
    const endpoint = `${this.supabaseUrl}/rest/v1/products?limit=1000&offset=0`

    let response: Response
    try {
      response = await fetch(endpoint, {
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
      })
    } catch (error) {
      console.error('[SupabaseFurnitureRepository] findAll network failure', {
        endpoint,
        cause: error,
      })
      throw new Error('[SupabaseFurnitureRepository] findAll network failure. Check NEXT_PUBLIC_SUPABASE_URL and DNS reachability.')
    }

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[SupabaseFurnitureRepository] findAll failed', {
        endpoint,
        status: response.status,
        error: this.formatErrorPreview(errorBody),
      })
      throw new Error(`[SupabaseFurnitureRepository] findAll failed with status ${response.status}`)
    }

    const rows: SupabaseRow[] = await response.json()
    console.debug(`[SupabaseFurnitureRepository] findAll returned ${rows.length} items`)
    return rows.map(row => this.rowToItem(row))
  }

  async count(filter?: FurnitureFilter): Promise<number> {
    try {
      const results = filter ? await this.findByCriteria(filter) : await this.findAll()
      return results.length
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] count threw:`, error)
      return 0
    }
  }

  async findByIds(ids: string[]): Promise<FurnitureItem[]> {
    try {
      if (ids.length === 0) return []

      const response = await fetch(`${this.supabaseUrl}/rest/v1/products`, {
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[SupabaseFurnitureRepository] findByIds failed', {
          status: response.status,
          error: this.formatErrorPreview(errorBody),
        })
        return []
      }

      const rows: SupabaseRow[] = await response.json()
      const idSet = new Set(ids)
      return rows.filter(row => idSet.has(row.id)).map(row => this.rowToItem(row))
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] findByIds threw:`, error)
      return []
    }
  }

  async getDistinctValues(field: 'brand' | 'city' | 'category'): Promise<string[]> {
    try {
      let url = `${this.supabaseUrl}/rest/v1/products?select=${field}`

      const response = await fetch(url, {
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[SupabaseFurnitureRepository] getDistinctValues failed', {
          status: response.status,
          error: this.formatErrorPreview(errorBody),
        })
        return []
      }

      const rows: any[] = await response.json()

      if (field === 'city') {
        const cities = new Set<string>()
        rows.forEach(row => {
          (row.cities ?? []).forEach((city: string) => cities.add(city))
        })
        return Array.from(cities).sort()
      } else {
        const values = new Set<string>()
        rows.forEach(row => {
          if (row[field]) values.add(row[field])
        })
        return Array.from(values).sort()
      }
    } catch (error) {
      console.error(`[SupabaseFurnitureRepository] getDistinctValues threw:`, error)
      return []
    }
  }
}
