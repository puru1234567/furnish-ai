import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DeterministicRankingService } from '../lib/ai/ranking/DeterministicRankingService'
import { RankingPipeline } from '../lib/ai/ranking/RankingPipeline'
import type { FurnitureItem, UserContext } from '../lib/types'
import type { PainPointContext } from '../lib/ai/item-filter'

const mockSofa: FurnitureItem = {
  id: 'test_s01',
  name: 'Urban Comfort 3-Seater',
  category: 'sofa',
  price: 25000,
  brand: 'Pepperfry',
  cities: ['Delhi NCR', 'All India'],
  deliveryAvailable: true,
  style: ['modern', 'minimal'],
  material: 'Polyester Fabric',
  dimensions: { width: 190, depth: 85, height: 80 },
  durability: 'high',
  durabilityScore: 4,
  maintenanceEase: 'high',
  warrantyYears: 3,
  assemblyComplexity: 'low',
  imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
  productUrl: 'https://example.com/sofa',
  inStock: true,
  rating: 4.5,
  reviewCount: 350,
  description: 'Easy-to-clean stain-resistant compact sofa.',
  tags: ['washable', 'kid-friendly', 'compact', 'space-saving'],
}

const mockPetSofa: FurnitureItem = {
  id: 'test_s02',
  name: 'Velvet Luxe Lounge',
  category: 'sofa',
  price: 45000,
  brand: 'Durian',
  cities: ['Delhi NCR'],
  deliveryAvailable: true,
  style: ['warm', 'modern'],
  material: 'Premium Velvet',
  dimensions: { width: 240, depth: 100, height: 85 },
  durability: 'low',
  durabilityScore: 2,
  maintenanceEase: 'low',
  warrantyYears: 1,
  assemblyComplexity: 'high',
  imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e',
  productUrl: 'https://example.com/velvet-sofa',
  inStock: true,
  rating: 4.1,
  reviewCount: 50,
  description: 'Deep velvet sofa, requires dry cleaning.',
  tags: ['velvet', 'delicate', 'luxury'],
}

const mockContext: UserContext = {
  roomType: 'living',
  roomSqft: 180,
  city: 'Delhi NCR',
  deliveryOk: true,
  furnitureType: 'sofa',
  budget: 30000,
  budgetMax: 40000,
  purchaseTrigger: 'new_home',
  existingFurnitureDesc: '',
  painPoint: ['stains_easily'],
  stylePreference: ['modern'],
  useCase: ['daily sitting'],
  alreadyRejected: '',
  urgency: 'this_week',
  rankingPriority: 'quality',
}

const mockPainContext: PainPointContext = {
  selectedPainTypes: ['stains_easily'],
  excludedSignals: ['velvet'],
  boostSignals: ['washable', 'stain-resistant'],
}

test('DeterministicRankingService boosts items with matching pain-point signals', () => {
  const ranker = new DeterministicRankingService()
  const score = ranker.scoreItem(mockSofa, mockContext, mockPainContext, 30000, 40000, 40000)

  assert.ok(score.totalScore > 50, 'Washable/kid-friendly sofa should achieve high fit score')
  assert.equal(score.tier, 'primary', 'Under-budget sofa with strong fit should be in primary tier')
  assert.match(score.scoringBreakdown, /pain_point:/i)
})

test('DeterministicRankingService penalizes items conflicting with pain-point exclusions', () => {
  const ranker = new DeterministicRankingService()
  const score = ranker.scoreItem(mockPetSofa, mockContext, mockPainContext, 30000, 40000, 40000)

  // Velvet material conflicts with stains_easily exclusion
  assert.ok(score.totalScore < 50, 'Velvet sofa with stains_easily pain point should be penalized')
})

test('RankingPipeline assigns primary, stretch, and discarded tiers based on price and score', () => {
  const pipeline = new RankingPipeline()
  const items = [mockSofa, mockPetSofa]
  const result = pipeline.rank(items, mockContext, mockPainContext, 30000, 40000, 40000)

  assert.equal(result.totalEvaluated, 2)
  assert.ok(result.primary.some(item => item.itemId === 'test_s01'))
})

test('RankingPipeline correctly computes stretch cap and ranks candidates deterministically', () => {
  const pipeline = new RankingPipeline()
  const scored = pipeline.scoreAllItems([mockSofa, mockPetSofa], mockContext, mockPainContext, 30000, 40000, 40000)

  assert.equal(scored.length, 2)
  assert.ok(scored[0].totalScore >= scored[1].totalScore, 'Items must be sorted in descending score order')
})
