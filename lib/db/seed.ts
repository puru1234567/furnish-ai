// lib/db/seed.ts
// Seed script to load furniture-data.ts into Supabase
// Run with: npm run db:seed

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env.local') })

import { furnitureData } from '@/lib/furniture-data'

/**
 * Build a searchable text blob from a furniture item
 * Used for hybrid retrieval: keyword search + vector search
 * 
 * Combines: name, description, tags, style, material, brand, warranty, maintenance ease
 */
function buildSearchBlob(item: typeof furnitureData[0]): string {
  const parts = [
    item.name,
    item.description,
    item.brand,
    item.material,
    item.tags.join(' '),
    item.style.join(' '),
    item.durability,
    item.maintenanceEase,
    item.assemblyComplexity,
    `warranty ${item.warrantyYears} years`,
  ]

  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Transform FurnitureItem to database row format
 */
function itemToRow(item: typeof furnitureData[0]) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    brand: item.brand,
    width_cm: item.dimensions.width,
    depth_cm: item.dimensions.depth,
    height_cm: item.dimensions.height,
    durability: item.durability,
    durability_score: item.durabilityScore,
    maintenance_ease: item.maintenanceEase,
    warranty_years: item.warrantyYears,
    assembly_complexity: item.assemblyComplexity,
    delivery_available: item.deliveryAvailable,
    in_stock: item.inStock,
    material: item.material,
    description: item.description,
    image_url: item.imageUrl,
    product_url: item.productUrl,
    rating: item.rating,
    review_count: item.reviewCount,
    style_tags: item.style,
    product_tags: item.tags,
    cities: item.cities,
    search_blob: buildSearchBlob(item),
  }
}

/**
 * Seed Supabase with furniture data
 */
async function seed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  console.log(`[seed] Loading ${furnitureData.length} products into Supabase...`)

  try {
    // Transform data
    const rows = furnitureData.map(itemToRow)

    // Insert via Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates', // Upsert mode
      },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Supabase insert failed: ${response.status} ${error}`)
    }

    const count = rows.length
    console.log(`[seed] ✓ Successfully seeded ${count} products`)
  } catch (error) {
    console.error('[seed] Error:', error)
    process.exit(1)
  }
}

// Run seed if executed directly
if (require.main === module) {
  seed()
}

export { seed, buildSearchBlob, itemToRow }
