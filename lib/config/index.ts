// lib/config/index.ts
// Central config registry

export {
  FURNITURE_TYPES,
  INVENTORY_COUNTS,
  getFurnitureTypeConfig,
  getInventoryCount,
  type FurnitureTypeConfig,
} from './furniture-config'

export {
  ROOM_OPTIONS,
  WALL_COLORS,
  FLOOR_TYPES,
  ROOM_LAYOUTS,
  getWallColorConfig,
  getFloorTypeConfig,
  getRoomLayoutConfig,
  type WallColorOption,
  type FloorTypeOption,
  type RoomLayoutOption,
} from './room-config'

export {
  BUDGET_OPTIONS,
  TIMELINES,
  DELIVERIES,
  getBudgetOption,
  isValidTimeline,
  isValidDeliveryPreference,
} from './budget-config'

export {
  STYLES,
  MATERIAL_AVOIDANCES,
  BRANDS,
  getStyleConfig,
  isValidMaterialAvoidance,
  isValidBrand,
  type StyleOption,
} from './style-config'

export {
  GUIDE_MESSAGES,
  PAIN_PROFILES,
  getGuideMessage,
  getPainProfileLabel,
  getAllPainProfiles,
  type GuideMessage,
  type PainProfile,
} from './guidance-config'

export {
  CITIES,
  isValidCity,
  getAllCities,
} from './location-config'
