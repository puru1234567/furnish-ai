import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InMemoryFurnitureRepository } from '../lib/repositories/InMemoryFurnitureRepository'
import type { FurnitureItem } from '../lib/types'

const catalog: FurnitureItem[] = [
  {
    id: 'sofa_01',
    name: 'Delhi Modern Sofa',
    category: 'sofa',
    price: 22000,
    brand: 'Pepperfry',
    cities: ['Delhi NCR'],
    deliveryAvailable: true,
    style: ['modern'],
    material: 'Fabric',
    dimensions: { width: 200, depth: 85, height: 80 },
    durability: 'high',
    durabilityScore: 4,
    maintenanceEase: 'medium',
    warrantyYears: 2,
    assemblyComplexity: 'low',
    imageUrl: 'https://images.unsplash.com/photo-1',
    productUrl: 'https://example.com/1',
    inStock: true,
    rating: 4.3,
    reviewCount: 120,
    description: 'Modern sofa for living room',
    tags: ['compact'],
  },
  {
    id: 'sofa_02',
    name: 'National All-India Sofa',
    category: 'sofa',
    price: 32000,
    brand: 'Urban Ladder',
    cities: ['All India'],
    deliveryAvailable: true,
    style: ['minimal'],
    material: 'Wood',
    dimensions: { width: 210, depth: 90, height: 85 },
    durability: 'high',
    durabilityScore: 5,
    maintenanceEase: 'high',
    warrantyYears: 5,
    assemblyComplexity: 'medium',
    imageUrl: 'https://images.unsplash.com/photo-2',
    productUrl: 'https://example.com/2',
    inStock: true,
    rating: 4.7,
    reviewCount: 450,
    description: 'Durable solid wood sofa delivered pan-India',
    tags: ['durable'],
  },
  {
    id: 'bed_01',
    name: 'Queen Platform Bed',
    category: 'bed',
    price: 18000,
    brand: 'IKEA',
    cities: ['Mumbai'],
    deliveryAvailable: true,
    style: ['minimal'],
    material: 'Engineered Wood',
    dimensions: { width: 160, depth: 200, height: 90 },
    durability: 'medium',
    durabilityScore: 3,
    maintenanceEase: 'high',
    warrantyYears: 10,
    assemblyComplexity: 'high',
    imageUrl: 'https://images.unsplash.com/photo-3',
    productUrl: 'https://example.com/3',
    inStock: false,
    rating: 4.1,
    reviewCount: 80,
    description: 'Queen bed with headboard',
    tags: ['queen'],
  },
]

test('InMemoryFurnitureRepository filters by category and in-stock', async () => {
  const repo = new InMemoryFurnitureRepository(catalog)
  const sofas = await repo.findByCriteria({ category: 'sofa', inStockOnly: true })

  assert.equal(sofas.length, 2)
  assert.ok(sofas.every(item => item.category === 'sofa' && item.inStock))
})

test('InMemoryFurnitureRepository matches city including All India pan-national delivery', async () => {
  const repo = new InMemoryFurnitureRepository(catalog)
  const delhiItems = await repo.findByCriteria({ city: 'Delhi NCR' })

  // Should include 'sofa_01' (Delhi NCR) and 'sofa_02' (All India)
  assert.equal(delhiItems.length, 2)
  const ids = delhiItems.map(i => i.id)
  assert.ok(ids.includes('sofa_01'))
  assert.ok(ids.includes('sofa_02'))
})

test('InMemoryFurnitureRepository handles pagination limit and offset', async () => {
  const repo = new InMemoryFurnitureRepository(catalog)
  const page1 = await repo.findByCriteria({ limit: 2, offset: 0 })
  const page2 = await repo.findByCriteria({ limit: 2, offset: 2 })

  assert.equal(page1.length, 2)
  assert.equal(page2.length, 1)
  assert.equal(page1[0].id, 'sofa_01')
  assert.equal(page2[0].id, 'bed_01')
})

test('InMemoryFurnitureRepository filters by price boundaries', async () => {
  const repo = new InMemoryFurnitureRepository(catalog)
  const budgetItems = await repo.findByCriteria({ priceMax: 25000 })

  assert.equal(budgetItems.length, 2)
  assert.ok(budgetItems.every(item => item.price <= 25000))
})
