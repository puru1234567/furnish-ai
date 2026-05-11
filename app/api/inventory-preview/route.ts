import { NextRequest, NextResponse } from 'next/server'
import { FURNITURE_CATEGORY_MAP } from '@/lib/ai/item-filter'
import { getFurnitureRepository } from '@/lib/repositories'

interface InventoryPreviewRequest {
  furnitureType: string
  budget: number
  budgetMax?: number
  city: string
}

function isInventoryPreviewRequest(data: unknown): data is InventoryPreviewRequest {
  if (!data || typeof data !== 'object') return false

  const body = data as Record<string, unknown>
  return (
    typeof body.furnitureType === 'string' &&
    typeof body.budget === 'number' &&
    body.budget > 0 &&
    typeof body.city === 'string' &&
    (body.budgetMax === undefined || (typeof body.budgetMax === 'number' && body.budgetMax >= body.budget))
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!isInventoryPreviewRequest(body)) {
      return NextResponse.json({ error: 'Invalid inventory preview request' }, { status: 400 })
    }

    const repository = getFurnitureRepository()
    const allItems = await repository.findAll()
    const allowedCategories = FURNITURE_CATEGORY_MAP[body.furnitureType] ?? [body.furnitureType]
    const budgetMax = body.budgetMax ?? body.budget
    const budgetFloor = Math.round(body.budget * 0.65)

    const cityMatches = allItems.filter(item =>
      allowedCategories.includes(item.category) &&
      (item.cities.includes(body.city) || item.cities.includes('All India')) &&
      item.price >= budgetFloor &&
      item.price <= budgetMax
    )

    const fallbackMatches = cityMatches.length === 0
      ? allItems.filter(item =>
          allowedCategories.includes(item.category) &&
          item.cities.includes('All India') &&
          item.price >= budgetFloor &&
          item.price <= budgetMax
        )
      : cityMatches

    return NextResponse.json({
      totalMatches: fallbackMatches.length,
      underBudgetCount: fallbackMatches.filter(item => item.price <= body.budget).length,
      stretchCount: fallbackMatches.filter(item => item.price > body.budget && item.price <= budgetMax).length,
      usedAllIndiaFallback: cityMatches.length === 0 && fallbackMatches.length > 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Inventory preview failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}