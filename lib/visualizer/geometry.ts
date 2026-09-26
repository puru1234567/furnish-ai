/**
 * FurnishAI Spatial Visualizer Geometry & Collision Engine
 * 
 * Mathematical utilities for calculating room footprint occupancy,
 * dimensional bounding overlap detection, and boundary clamping.
 */

export interface Dimension2D {
  widthCm: number
  depthCm: number
}

export interface CanvasPosition {
  xPercent: number
  yPercent: number
}

/**
 * Calculates what percentage of the room floor surface area is occupied
 * by placed furniture items.
 * 
 * @param items List of furniture pieces with width and depth in centimeters
 * @param roomWidthFt Room width in feet
 * @param roomDepthFt Room depth in feet
 * @returns Bounded percentage from 0 to 100
 */
export function calculateOccupancyPercentage(
  items: Dimension2D[],
  roomWidthFt: number,
  roomDepthFt: number
): number {
  if (roomWidthFt <= 0 || roomDepthFt <= 0) return 0

  const roomWidthCm = roomWidthFt * 30.48
  const roomDepthCm = roomDepthFt * 30.48
  const roomAreaSqM = (roomWidthCm * roomDepthCm) / 10000

  if (roomAreaSqM <= 0) return 0

  const totalFurnitureAreaSqM = items.reduce(
    (sum, item) => sum + (Math.max(0, item.widthCm) * Math.max(0, item.depthCm)) / 10000,
    0
  )

  const occupancyRatio = (totalFurnitureAreaSqM / roomAreaSqM) * 100
  return Math.min(100, Math.max(0, Math.round(occupancyRatio)))
}

/**
 * Detects whether two canvas entities overlap within a specified distance threshold.
 * 
 * @param posA First item position in percent coordinates (0-100)
 * @param posB Second item position in percent coordinates (0-100)
 * @param threshold Collision sensitivity window in percentage units (default: 14)
 */
export function checkBoundingCollision(
  posA: CanvasPosition,
  posB: CanvasPosition,
  threshold: number = 14
): boolean {
  const deltaX = Math.abs(posA.xPercent - posB.xPercent)
  const deltaY = Math.abs(posA.yPercent - posB.yPercent)
  return deltaX < threshold && deltaY < threshold
}

/**
 * Clamps coordinates within the usable interior room canvas, preserving margins
 * for walls, skirtings, and doorway swing clearance.
 * 
 * @param rawX Target X coordinate (0-100%)
 * @param rawY Target Y coordinate (0-100%)
 * @param minPercent Minimum margin from wall edge (default: 4)
 * @param maxPercent Maximum margin from opposite wall edge (default: 84)
 */
export function clampCoordinates(
  rawX: number,
  rawY: number,
  minPercent: number = 4,
  maxPercent: number = 84
): CanvasPosition {
  const clampedX = Math.max(minPercent, Math.min(maxPercent, Math.round(rawX)))
  const clampedY = Math.max(minPercent, Math.min(maxPercent, Math.round(rawY)))
  return { xPercent: clampedX, yPercent: clampedY }
}

/**
 * Estimates total furniture investment for a layout given an array of placed pieces.
 */
export function calculateLayoutCost(
  items: { price?: number }[]
): number {
  return items.reduce((acc, item) => acc + (item.price ?? 0), 0)
}
