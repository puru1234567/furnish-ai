import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateOccupancyPercentage,
  checkBoundingCollision,
  clampCoordinates,
  calculateLayoutCost,
} from '../lib/visualizer/geometry'

test('calculateOccupancyPercentage accurately computes floor occupancy ratio', () => {
  // Room: 10ft x 10ft = 304.8cm x 304.8cm = ~9.29 sq m
  // Item: 200cm x 100cm = 20,000 sq cm = 2 sq m
  // Occupancy ratio: 2 / 9.29 = ~21.5% -> rounded to 22%
  const occupancy = calculateOccupancyPercentage(
    [{ widthCm: 200, depthCm: 100 }],
    10,
    10
  )
  assert.equal(occupancy, 22)
})

test('calculateOccupancyPercentage handles zero or negative dimensions safely', () => {
  assert.equal(calculateOccupancyPercentage([], 10, 10), 0)
  assert.equal(calculateOccupancyPercentage([{ widthCm: 100, depthCm: 100 }], 0, 10), 0)
  assert.equal(calculateOccupancyPercentage([{ widthCm: -100, depthCm: 50 }], 10, 10), 0)
})

test('checkBoundingCollision detects overlaps within defined threshold', () => {
  const itemA = { xPercent: 30, yPercent: 40 }
  const overlappingItem = { xPercent: 35, yPercent: 42 } // Delta: 5%, 2% -> < 14%
  const farItem = { xPercent: 60, yPercent: 70 }         // Delta: 30%, 30% -> >= 14%

  assert.equal(checkBoundingCollision(itemA, overlappingItem, 14), true)
  assert.equal(checkBoundingCollision(itemA, farItem, 14), false)
})

test('clampCoordinates constrains items within room interior boundaries', () => {
  const outOfBoundsLeft = clampCoordinates(-10, -5, 4, 84)
  assert.equal(outOfBoundsLeft.xPercent, 4)
  assert.equal(outOfBoundsLeft.yPercent, 4)

  const outOfBoundsRight = clampCoordinates(95, 99, 4, 84)
  assert.equal(outOfBoundsRight.xPercent, 84)
  assert.equal(outOfBoundsRight.yPercent, 84)

  const withinBounds = clampCoordinates(42.4, 55.8, 4, 84)
  assert.equal(withinBounds.xPercent, 42)
  assert.equal(withinBounds.yPercent, 56)
})

test('calculateLayoutCost sums item prices correctly', () => {
  const items = [
    { price: 18999 },
    { price: 8999 },
    { price: undefined },
    { price: 12999 },
  ]
  const total = calculateLayoutCost(items)
  assert.equal(total, 40997)
})
