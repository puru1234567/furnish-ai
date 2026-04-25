// lib/types/room-analysis.ts
// Refactored RoomAnalysis type structure with clear separation of concerns

/**
 * Input for room analysis (photos, context)
 */
export interface RoomAnalysisInput {
  images: string[] // 1-4 base64 images
  furnitureType?: string
  roomType?: string
}

/**
 * Room physical characteristics from analysis
 */
export interface RoomDimensions {
  wallColor: { id: string; label: string }
  floorType: { id: string; label: string }
  layout: string
  estimatedWidthFt: number | null
  estimatedDepthFt: number | null
}

/**
 * Décor and styling from analysis
 */
export interface RoomDecor {
  styleProfile: { id: string; description: string }
  colorPalette: string[]
  lighting: string
}

/**
 * Inventory and spatial information from analysis
 */
export interface RoomInventory {
  existingFurniture: string[]
  softFurnishings: string[]
  spatialConstraints: string[]
  furnitureNeeds: string[]
}

/**
 * Confidence and metadata about the analysis
 */
export interface RoomAnalysisMetadata {
  summary: string
  confidenceScore: number
  confidence_signals?: string[]
}

/**
 * Complete room analysis output (composition of above)
 */
export interface RoomAnalysisOutput {
  room: RoomDimensions
  decor: RoomDecor
  inventory: RoomInventory
  metadata: RoomAnalysisMetadata
}

/**
 * Legacy RoomAnalysis type (for backward compatibility)
 * Maps to the new structure
 */
export interface RoomAnalysis {
  wallColor: { id: string; label: string }
  floorType: { id: string; label: string }
  roomLayout: string
  estimatedWidthFt: number | null
  estimatedDepthFt: number | null
  styleProfile: { id: string; description: string }
  colorPalette: string[]
  lighting: string
  existingFurniture: string[]
  spatialConstraints: string[]
  furnitureNeeds: string[]
  softFurnishings: string[]
  roomSummary: string
  confidenceScore: number
  confidence_signals?: string[]
}

/**
 * Convert modern RoomAnalysisOutput to legacy RoomAnalysis for compatibility
 */
export function toRoomAnalysisLegacy(output: RoomAnalysisOutput): RoomAnalysis {
  return {
    wallColor: output.room.wallColor,
    floorType: output.room.floorType,
    roomLayout: output.room.layout,
    estimatedWidthFt: output.room.estimatedWidthFt,
    estimatedDepthFt: output.room.estimatedDepthFt,
    styleProfile: output.decor.styleProfile,
    colorPalette: output.decor.colorPalette,
    lighting: output.decor.lighting,
    existingFurniture: output.inventory.existingFurniture,
    spatialConstraints: output.inventory.spatialConstraints,
    furnitureNeeds: output.inventory.furnitureNeeds,
    softFurnishings: output.inventory.softFurnishings,
    roomSummary: output.metadata.summary,
    confidenceScore: output.metadata.confidenceScore,
    confidence_signals: output.metadata.confidence_signals,
  }
}

/**
 * Convert legacy RoomAnalysis to modern RoomAnalysisOutput
 */
export function fromRoomAnalysisLegacy(legacy: RoomAnalysis): RoomAnalysisOutput {
  return {
    room: {
      wallColor: legacy.wallColor,
      floorType: legacy.floorType,
      layout: legacy.roomLayout,
      estimatedWidthFt: legacy.estimatedWidthFt,
      estimatedDepthFt: legacy.estimatedDepthFt,
    },
    decor: {
      styleProfile: legacy.styleProfile,
      colorPalette: legacy.colorPalette,
      lighting: legacy.lighting,
    },
    inventory: {
      existingFurniture: legacy.existingFurniture,
      spatialConstraints: legacy.spatialConstraints,
      furnitureNeeds: legacy.furnitureNeeds,
      softFurnishings: legacy.softFurnishings,
    },
    metadata: {
      summary: legacy.roomSummary,
      confidenceScore: legacy.confidenceScore,
      confidence_signals: legacy.confidence_signals,
    },
  }
}
