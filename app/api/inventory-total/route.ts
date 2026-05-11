import { NextResponse } from 'next/server'
import { getFurnitureRepository } from '@/lib/repositories'

export async function GET() {
  try {
    const repository = getFurnitureRepository()
    const allItems = await repository.findAll()
    
    return NextResponse.json({
      total: allItems.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get inventory total'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
