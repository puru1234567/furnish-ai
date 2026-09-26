'use client'

import React, { useState, useId, useRef, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import type { FurnitureItem, RoomType } from '@/lib/types'
import { furnitureData } from '@/lib/furniture-data'
import { fmt } from '@/app/find/find-page-utils'
import {
  calculateOccupancyPercentage,
  checkBoundingCollision,
  clampCoordinates,
  calculateLayoutCost,
} from '@/lib/visualizer/geometry'

export interface PlacedFurniture {
  id: string
  catalogId?: string
  name: string
  category: string
  price?: number
  brand?: string
  imageUrl?: string
  widthCm: number
  depthCm: number
  xPercent: number // 0-100% position across room width
  yPercent: number // 0-100% position across room depth
  rotationDeg: number
  color: string
}

export type FloorFinish = 'oak' | 'marble' | 'terrazzo' | 'concrete'
export type WallAccent = 'sand' | 'terracotta' | 'sage' | 'charcoal'
export type VisualizerViewMode = '2d' | '3d'

export interface ZoneConfig {
  id: string
  roomType: RoomType
  label: string
  icon: string
  widthFt: number
  depthFt: number
  description: string
  defaultItems: PlacedFurniture[]
}

export interface RoomVisualizerProps {
  roomType?: RoomType
  roomWidthFt?: number
  roomDepthFt?: number
  placedItems?: FurnitureItem[]
  allowZoneSwitching?: boolean
  allowCatalogEquip?: boolean
  className?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  sofa: '#c4623a',
  bed: '#5a7362',
  'dining-table': '#b8935a',
  'study-table': '#426b82',
  chair: '#8c5e4d',
  wardrobe: '#4c443c',
  'coffee-table': '#7d7063',
}

const ZONE_PRESETS: ZoneConfig[] = [
  {
    id: 'living',
    roomType: 'living',
    label: 'Living Room',
    icon: '🛋️',
    widthFt: 16,
    depthFt: 13,
    description: 'Main entertainment & gathering sanctuary with natural window light.',
    defaultItems: [
      {
        id: 'p_sofa_1',
        catalogId: 'pf_s001',
        name: 'Como 3-Seater Sofa',
        category: 'sofa',
        price: 18999,
        brand: 'Pepperfry',
        imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        widthCm: 200,
        depthCm: 84,
        xPercent: 22,
        yPercent: 20,
        rotationDeg: 0,
        color: '#c4623a',
      },
      {
        id: 'p_coffee_1',
        catalogId: 'pf_ct001',
        name: 'Mesa Mango Coffee Table',
        category: 'coffee-table',
        price: 8999,
        brand: 'Pepperfry',
        imageUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
        widthCm: 110,
        depthCm: 60,
        xPercent: 32,
        yPercent: 50,
        rotationDeg: 0,
        color: '#7d7063',
      },
      {
        id: 'p_chair_1',
        catalogId: 'pf_c001',
        name: 'Accent Velvet Armchair',
        category: 'chair',
        price: 12999,
        brand: 'Pepperfry',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        widthCm: 75,
        depthCm: 78,
        xPercent: 70,
        yPercent: 35,
        rotationDeg: -30,
        color: '#8c5e4d',
      },
    ],
  },
  {
    id: 'bedroom',
    roomType: 'bedroom',
    label: 'Master Bedroom',
    icon: '🛏️',
    widthFt: 14,
    depthFt: 12,
    description: 'Restful sleeping sanctuary with dedicated storage & nightstand clearance.',
    defaultItems: [
      {
        id: 'p_bed_1',
        catalogId: 'pf_b001',
        name: 'Hosta Queen Hydraulic Bed',
        category: 'bed',
        price: 22999,
        brand: 'Pepperfry',
        imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
        widthCm: 165,
        depthCm: 205,
        xPercent: 28,
        yPercent: 12,
        rotationDeg: 0,
        color: '#5a7362',
      },
      {
        id: 'p_wardrobe_1',
        catalogId: 'ikea_w001',
        name: 'PAX Sliding Wardrobe',
        category: 'wardrobe',
        price: 24990,
        brand: 'IKEA',
        imageUrl: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=800&q=80',
        widthCm: 150,
        depthCm: 60,
        xPercent: 10,
        yPercent: 78,
        rotationDeg: 0,
        color: '#4c443c',
      },
    ],
  },
  {
    id: 'dining',
    roomType: 'dining',
    label: 'Dining Space',
    icon: '🍽️',
    widthFt: 13,
    depthFt: 11,
    description: 'Social dining area with 360-degree chair pull-out clearance.',
    defaultItems: [
      {
        id: 'p_dining_1',
        catalogId: 'ikea_d001',
        name: 'EKEDALEN Extendable Table',
        category: 'dining-table',
        price: 19990,
        brand: 'IKEA',
        imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
        widthCm: 140,
        depthCm: 84,
        xPercent: 26,
        yPercent: 32,
        rotationDeg: 0,
        color: '#b8935a',
      },
    ],
  },
  {
    id: 'study',
    roomType: 'study',
    label: 'Home Office & Study',
    icon: '💼',
    widthFt: 11,
    depthFt: 9,
    description: 'Ergonomic work-from-home corner with glare-free monitor positioning.',
    defaultItems: [
      {
        id: 'p_desk_1',
        catalogId: 'ikea_st001',
        name: 'LINNMON Modern Desk',
        category: 'study-table',
        price: 4999,
        brand: 'IKEA',
        imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
        widthCm: 120,
        depthCm: 60,
        xPercent: 25,
        yPercent: 18,
        rotationDeg: 0,
        color: '#426b82',
      },
      {
        id: 'p_chair_office',
        catalogId: 'ikea_c001',
        name: 'MARKUS Ergonomic Office Chair',
        category: 'chair',
        price: 19990,
        brand: 'IKEA',
        imageUrl: 'https://images.unsplash.com/photo-1580481077198-1e4e137b2d55?auto=format&fit=crop&w=800&q=80',
        widthCm: 67,
        depthCm: 65,
        xPercent: 36,
        yPercent: 48,
        rotationDeg: 0,
        color: '#8c5e4d',
      },
    ],
  },
]

const STORAGE_KEY = 'furnishai_saved_custom_layouts_v1'

/**
 * RoomVisualizerPreview
 * 
 * Production-Grade 2D Overhead Blueprint & 3D Isometric Whole-Home Visualizer:
 * - Multi-Zone Room Switching (Living, Bedroom, Dining, Study, Whole-Home)
 * - 2D Blueprint vs 3D Isometric View Perspective Switcher
 * - Interactive Canvas Drag-and-Drop piece repositioning with real-time boundary clamping
 * - Real-time Walkway Circulation Halos & Collision Overlap Detection
 * - "Equip This Space" Catalog Selector scaled to real dimensions
 * - One-Click "Auto-Furnish Suite" AI preset generator
 * - "Export Blueprint Spec Sheet" modal with printable summary & JSON download
 * - Persistent custom layout storage across browser sessions
 * - Architectural Finishes (Oak Hardwood, Marble, Terrazzo, Slate Concrete)
 */
export function RoomVisualizerPreview({
  roomType = 'living',
  roomWidthFt = 16,
  roomDepthFt = 13,
  placedItems = [],
  allowZoneSwitching = true,
  allowCatalogEquip = true,
  className = '',
}: RoomVisualizerProps) {
  const [activeZoneId, setActiveZoneId] = useState<string>(roomType)
  const [viewMode, setViewMode] = useState<VisualizerViewMode>('2d')
  const [isWholeHomeMode, setIsWholeHomeMode] = useState(false)
  const [widthFt, setWidthFt] = useState(roomWidthFt)
  const [depthFt, setDepthFt] = useState(roomDepthFt)
  const [showClearance, setShowClearance] = useState(true)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [floorFinish, setFloorFinish] = useState<FloorFinish>('oak')
  const [wallAccent, setWallAccent] = useState<WallAccent>('sand')
  const [isEquipDrawerOpen, setIsEquipDrawerOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [catalogFilterCategory, setCatalogFilterCategory] = useState<string>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const itemCounterRef = useRef(0)

  const gridPatternId = useId()

  // Track furniture items per zone with local storage retrieval fallback
  const [zoneItemsMap, setZoneItemsMap] = useState<Record<string, PlacedFurniture[]>>(() => {
    const initialMap: Record<string, PlacedFurniture[]> = {}
    ZONE_PRESETS.forEach(z => {
      initialMap[z.id] = [...z.defaultItems]
    })

    // If incoming placed items exist from recommendations, inject into the matched zone
    if (placedItems.length > 0) {
      const targetZone = ZONE_PRESETS.find(z => z.roomType === roomType)?.id || 'living'
      initialMap[targetZone] = placedItems.slice(0, 4).map((item, idx) => ({
        id: `rec_${item.id}_${idx}`,
        catalogId: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        brand: item.brand,
        imageUrl: item.imageUrl,
        widthCm: item.dimensions.width,
        depthCm: item.dimensions.depth,
        xPercent: 18 + (idx % 2) * 44,
        yPercent: 22 + Math.floor(idx / 2) * 38,
        rotationDeg: 0,
        color: CATEGORY_COLORS[item.category] || '#b8935a',
      }))
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed === 'object' && parsed !== null) {
            return { ...initialMap, ...parsed }
          }
        }
      } catch {
        // Storage unavailable or unparseable
      }
    }

    return initialMap
  })

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  // Current active items
  const activeItems = useMemo(
    () => zoneItemsMap[activeZoneId] || [],
    [zoneItemsMap, activeZoneId]
  )

  // Switch zone handler
  const handleZoneChange = (zoneId: string) => {
    setActiveZoneId(zoneId)
    setIsWholeHomeMode(false)
    setSelectedItemId(null)
    const preset = ZONE_PRESETS.find(z => z.id === zoneId)
    if (preset) {
      setWidthFt(preset.widthFt)
      setDepthFt(preset.depthFt)
    }
  }

  // Room geometry calculations using centralized geometry utilities
  const roomWidthCm = widthFt * 30.48
  const roomDepthCm = depthFt * 30.48
  const occupancyPercentage = calculateOccupancyPercentage(activeItems, widthFt, depthFt)
  const roomTotalCost = calculateLayoutCost(activeItems)

  // Rotate item
  const handleRotate = (id: string) => {
    setZoneItemsMap(prev => ({
      ...prev,
      [activeZoneId]: prev[activeZoneId].map(it =>
        it.id === id ? { ...it, rotationDeg: (it.rotationDeg + 90) % 360 } : it
      ),
    }))
  }

  // Remove item
  const handleRemove = (id: string) => {
    setZoneItemsMap(prev => ({
      ...prev,
      [activeZoneId]: prev[activeZoneId].filter(it => it.id !== id),
    }))
    if (selectedItemId === id) setSelectedItemId(null)
  }

  // Auto-furnish preset
  const handleAutoFurnish = () => {
    const preset = ZONE_PRESETS.find(z => z.id === activeZoneId)
    if (!preset) return
    setZoneItemsMap(prev => ({
      ...prev,
      [activeZoneId]: [...preset.defaultItems],
    }))
    setSelectedItemId(null)
    setToastMessage(`Restored AI preset layout for ${preset.label}`)
  }

  // Save layout to localStorage
  const handleSaveLayout = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(zoneItemsMap))
      setToastMessage('✨ Layout saved! Your custom arrangement is preserved in your browser.')
    } catch {
      setToastMessage('⚠️ Unable to save layout to local storage.')
    }
  }

  // Equip piece from catalog
  const handleEquipFromCatalog = (catalogItem: FurnitureItem) => {
    itemCounterRef.current += 1
    const newItem: PlacedFurniture = {
      id: `placed_${catalogItem.id}_${itemCounterRef.current}`,
      catalogId: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      price: catalogItem.price,
      brand: catalogItem.brand,
      imageUrl: catalogItem.imageUrl,
      widthCm: catalogItem.dimensions.width,
      depthCm: catalogItem.dimensions.depth,
      xPercent: 35,
      yPercent: 35,
      rotationDeg: 0,
      color: CATEGORY_COLORS[catalogItem.category] || '#c4623a',
    }

    setZoneItemsMap(prev => ({
      ...prev,
      [activeZoneId]: [...(prev[activeZoneId] || []), newItem],
    }))
    setSelectedItemId(newItem.id)
    setIsEquipDrawerOpen(false)
    setToastMessage(`Added ${catalogItem.name} to the layout. Drag to adjust position.`)
  }

  // Direct Drag-and-Drop coordinate calculation with boundary clamping
  const handlePointerDown = (e: React.PointerEvent, itemId: string) => {
    e.stopPropagation()
    setSelectedItemId(itemId)
    setDragItemId(itemId)
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragItemId || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const rawX = ((e.clientX - rect.left) / rect.width) * 100
    const rawY = ((e.clientY - rect.top) / rect.height) * 100

    const clamped = clampCoordinates(rawX - 6, rawY - 6, 4, 84)

    setZoneItemsMap(prev => ({
      ...prev,
      [activeZoneId]: prev[activeZoneId].map(item =>
        item.id === dragItemId
          ? { ...item, xPercent: clamped.xPercent, yPercent: clamped.yPercent }
          : item
      ),
    }))
  }, [isDragging, dragItemId, activeZoneId])

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      setDragItemId(null)
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* pointer capture swallow */
      }
    }
  }

  // Nudge fallback buttons
  const handleNudge = (id: string, deltaX: number, deltaY: number) => {
    setZoneItemsMap(prev => ({
      ...prev,
      [activeZoneId]: prev[activeZoneId].map(it => {
        if (it.id !== id) return it
        const clamped = clampCoordinates(it.xPercent + deltaX, it.yPercent + deltaY, 4, 84)
        return { ...it, ...clamped }
      }),
    }))
  }

  // Collision detection: Check if selected item overlaps any other item
  const selectedItem = activeItems.find(it => it.id === selectedItemId)
  const isColliding = React.useMemo(() => {
    if (!selectedItem) return false
    return activeItems.some(other => {
      if (other.id === selectedItem.id) return false
      return checkBoundingCollision(
        { xPercent: selectedItem.xPercent, yPercent: selectedItem.yPercent },
        { xPercent: other.xPercent, yPercent: other.yPercent },
        14
      )
    })
  }, [selectedItem, activeItems])

  // Filtered catalog pieces for "Equip Space" drawer
  const eligibleCatalogItems = React.useMemo(() => {
    return furnitureData.filter(item => {
      if (catalogFilterCategory === 'all') return true
      return item.category === catalogFilterCategory
    })
  }, [catalogFilterCategory])

  // Export spec sheet payload as JSON
  const handleDownloadSpecJson = () => {
    const activeZone = ZONE_PRESETS.find(z => z.id === activeZoneId)
    const exportData = {
      project: 'FurnishAI Spatial Layout Blueprint',
      exportedAt: new Date().toISOString(),
      room: {
        zoneId: activeZoneId,
        label: activeZone?.label ?? 'Room',
        dimensionsFt: { width: widthFt, depth: depthFt },
        dimensionsMeters: {
          width: Number((widthFt * 0.3048).toFixed(2)),
          depth: Number((depthFt * 0.3048).toFixed(2)),
        },
        areaSqFt: widthFt * depthFt,
        areaSqM: Number(((widthFt * depthFt) * 0.092903).toFixed(2)),
        occupancyPercentage,
        estimatedTotalCost: roomTotalCost,
      },
      furnitureItems: activeItems.map(it => ({
        id: it.id,
        name: it.name,
        category: it.category,
        brand: it.brand,
        priceInr: it.price,
        dimensionsCm: { width: it.widthCm, depth: it.depthCm },
        position: { xPercent: it.xPercent, yPercent: it.yPercent, rotationDeg: it.rotationDeg },
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `furnishai-${activeZoneId}-blueprint.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setToastMessage('📥 Blueprint JSON downloaded successfully!')
  }

  // Architectural floor background styling
  const floorBgColor =
    floorFinish === 'oak' ? '#fcf9f4' :
    floorFinish === 'marble' ? '#f3f5f8' :
    floorFinish === 'terrazzo' ? '#f8f6f0' :
    '#ededed'

  const wallBorderColor =
    wallAccent === 'terracotta' ? '#c4623a' :
    wallAccent === 'sage' ? '#7a8b6e' :
    wallAccent === 'charcoal' ? '#2c2825' :
    '#5c5248'

  const activeZone = ZONE_PRESETS.find(z => z.id === activeZoneId)

  return (
    <div className={`room-visualizer-card ${className}`}>
      <style>{`
        .room-visualizer-card {
          background: #ffffff;
          border: 1px solid rgba(184, 147, 90, 0.24);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 16px 36px rgba(44, 40, 37, 0.08);
          font-family: inherit;
          position: relative;
        }
        .visualizer-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 14px;
        }
        .visualizer-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .visualizer-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e1b18;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .visualizer-zone-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .zone-pill-btn {
          border: 1px solid #dcd7ce;
          background: #f9f8f5;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4a443c;
        }
        .zone-pill-btn:hover {
          border-color: #c4623a;
          color: #c4623a;
        }
        .zone-pill-btn.active {
          background: #1e1b18;
          color: #ffffff;
          border-color: #1e1b18;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
        }
        .visualizer-actions-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .v-action-btn {
          background: #ffffff;
          border: 1px solid #d4cdc3;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #333;
          transition: all 0.18s ease;
        }
        .v-action-btn:hover {
          border-color: #c4623a;
          color: #c4623a;
        }
        .v-action-btn--primary {
          background: #c4623a;
          color: #ffffff;
          border-color: #c4623a;
        }
        .v-action-btn--primary:hover {
          background: #b0542e;
          color: #ffffff;
        }
        .v-action-btn--active {
          background: #2b2622;
          color: #ffffff;
          border-color: #2b2622;
        }
        .visualizer-stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #fbf9f6;
          border: 1px solid rgba(184, 147, 90, 0.18);
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 13px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .floorplan-canvas-container {
          perspective: 1200px;
          padding: 12px 0;
          display: flex;
          justify-content: center;
        }
        .floorplan-canvas-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          border: 3px solid ${wallBorderColor};
          border-radius: 14px;
          overflow: hidden;
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
          user-select: none;
          touch-action: none;
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s ease;
        }
        .floorplan-canvas-wrap.mode-3d {
          transform: rotateX(46deg) rotateZ(-18deg) scale(0.92);
          box-shadow: 24px 34px 50px rgba(30, 27, 24, 0.2), 0 10px 24px rgba(0, 0, 0, 0.1);
        }
        .floorplan-grid-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .doorway-boundary {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          width: 74px;
          height: 8px;
          background: #ffffff;
          border: 2px solid ${wallBorderColor};
          border-bottom: none;
          z-index: 5;
        }
        .doorway-swing-arc {
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          width: 60px;
          height: 60px;
          border: 1.5px dashed rgba(196, 98, 58, 0.4);
          border-radius: 60px 0 0 0;
          pointer-events: none;
        }
        .doorway-caption {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-weight: 700;
          color: #8c8278;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          pointer-events: none;
        }
        .window-boundary {
          position: absolute;
          top: 0;
          left: 20%;
          width: 90px;
          height: 6px;
          background: #9cc2d4;
          border: 1.5px solid ${wallBorderColor};
        }
        .window-caption {
          position: absolute;
          top: 10px;
          left: 20%;
          font-size: 9px;
          color: #426b82;
          font-weight: 700;
          text-transform: uppercase;
        }
        .furniture-entity {
          position: absolute;
          border-radius: 6px;
          cursor: grab;
          transition: box-shadow 0.18s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 6px;
          border: 2px solid rgba(0, 0, 0, 0.28);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }
        .mode-3d .furniture-entity {
          box-shadow: 6px 8px 16px rgba(0, 0, 0, 0.35);
          border-bottom-width: 4px;
          border-right-width: 3px;
        }
        .furniture-entity:active {
          cursor: grabbing;
        }
        .furniture-entity.selected {
          border-color: #1e1b18;
          box-shadow: 0 0 0 3px rgba(196, 98, 58, 0.45), 0 10px 24px rgba(0, 0, 0, 0.2);
          z-index: 25;
        }
        .furniture-entity.colliding {
          border-color: #d9383a !important;
          box-shadow: 0 0 0 3px rgba(217, 56, 58, 0.4) !important;
          background: #ffebeb !important;
        }
        .furniture-entity-name {
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .furniture-entity-price {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 600;
          margin-top: 1px;
        }
        .walkway-clearance-halo {
          position: absolute;
          inset: -14px;
          border: 1.5px dashed rgba(196, 98, 58, 0.45);
          border-radius: 8px;
          background: rgba(196, 98, 58, 0.05);
          pointer-events: none;
        }
        .selected-item-toolbar {
          margin-top: 14px;
          padding: 12px 16px;
          background: #fdf5f0;
          border: 1px solid rgba(196, 98, 58, 0.25);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
        }
        .equip-drawer-backdrop, .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100;
          display: flex;
          backdrop-filter: blur(3px);
        }
        .equip-drawer-backdrop {
          justify-content: flex-end;
        }
        .modal-backdrop {
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .equip-drawer {
          width: min(92vw, 440px);
          height: 100%;
          background: #ffffff;
          padding: 24px;
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .export-modal-dialog {
          width: min(92vw, 680px);
          max-height: 88vh;
          background: #ffffff;
          border-radius: 16px;
          padding: 26px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .equip-drawer-head, .export-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .equip-catalog-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .equip-item-card {
          display: flex;
          gap: 12px;
          padding: 10px;
          border: 1px solid #e5dfd5;
          border-radius: 10px;
          align-items: center;
          transition: border-color 0.15s ease;
        }
        .equip-item-card:hover {
          border-color: #c4623a;
        }
        .equip-item-img {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 6px;
          background: #f0ece5;
        }
        .whole-home-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
          margin-top: 16px;
        }
        .whole-home-zone-card {
          border: 1px solid #e0d8cd;
          border-radius: 12px;
          padding: 14px;
          background: #fdfcfb;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .whole-home-zone-card:hover {
          border-color: #c4623a;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }
        .visualizer-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #1e1b18;
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
          z-index: 120;
          animation: toastSlideUp 0.25s ease-out;
        }
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="visualizer-toast" role="status">
          {toastMessage}
        </div>
      )}

      {/* Top Header & Zone Navigation */}
      <div className="visualizer-top-bar">
        <div className="visualizer-title-wrap">
          <span className="visualizer-title">📐 Spatial Blueprint Studio</span>
          {isColliding && (
            <span
              style={{
                background: '#ffebeb',
                color: '#d9383a',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              ⚠️ Walkway Clearance Warning
            </span>
          )}
          <span
            style={{
              background: '#f4ede4',
              color: '#6e5d4f',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {activeItems.length} pieces · {roomTotalCost > 0 ? fmt(roomTotalCost) : 'Empty'}
          </span>
        </div>

        {/* Zone switcher */}
        {allowZoneSwitching && (
          <div className="visualizer-zone-pills" role="tablist" aria-label="Room zones">
            {ZONE_PRESETS.map(z => (
              <button
                key={z.id}
                type="button"
                role="tab"
                aria-selected={activeZoneId === z.id && !isWholeHomeMode}
                className={`zone-pill-btn ${activeZoneId === z.id && !isWholeHomeMode ? 'active' : ''}`}
                onClick={() => handleZoneChange(z.id)}
              >
                <span>{z.icon}</span>
                <span>{z.label}</span>
              </button>
            ))}
            <button
              type="button"
              className={`zone-pill-btn ${isWholeHomeMode ? 'active' : ''}`}
              onClick={() => {
                setIsWholeHomeMode(true)
                setSelectedItemId(null)
              }}
              title="Overview of all zones across your home"
            >
              <span>🏠</span>
              <span>Whole-Home Overview</span>
            </button>
          </div>
        )}

        {/* Action controls */}
        <div className="visualizer-actions-bar">
          {/* View Perspective Switcher: 2D vs 3D */}
          {!isWholeHomeMode && (
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d4cdc3' }}>
              <button
                type="button"
                className={`v-action-btn ${viewMode === '2d' ? 'v-action-btn--active' : ''}`}
                style={{ borderRadius: 0, border: 'none', borderRight: '1px solid #d4cdc3' }}
                onClick={() => setViewMode('2d')}
                title="Overhead 2D Architectural Blueprint"
              >
                <span>📐 2D Blueprint</span>
              </button>
              <button
                type="button"
                className={`v-action-btn ${viewMode === '3d' ? 'v-action-btn--active' : ''}`}
                style={{ borderRadius: 0, border: 'none' }}
                onClick={() => setViewMode('3d')}
                title="3D Isometric Depth View"
              >
                <span>🧊 3D Isometric</span>
              </button>
            </div>
          )}

          {allowCatalogEquip && !isWholeHomeMode && (
            <button
              type="button"
              className="v-action-btn v-action-btn--primary"
              onClick={() => setIsEquipDrawerOpen(true)}
            >
              <span>✨ Equip This Space</span>
            </button>
          )}

          {!isWholeHomeMode && (
            <button
              type="button"
              className="v-action-btn"
              onClick={handleAutoFurnish}
              title="Auto-place a cohesive suite for this room"
            >
              <span>🪄 Auto-Furnish</span>
            </button>
          )}

          {!isWholeHomeMode && (
            <button
              type="button"
              className="v-action-btn"
              onClick={handleSaveLayout}
              title="Save custom layout to browser"
            >
              <span>💾 Save Design</span>
            </button>
          )}

          <button
            type="button"
            className="v-action-btn"
            onClick={() => setIsExportModalOpen(true)}
            title="Export Blueprint Spec Sheet"
          >
            <span>📥 Export Blueprint</span>
          </button>
        </div>
      </div>

      {/* Whole-Home Multi-Room Overview Mode */}
      {isWholeHomeMode ? (
        <div>
          <div style={{ marginBottom: 12, color: '#555', fontSize: '13px' }}>
            Click on any room below to enter its detailed floor plan, reposition pieces, or equip it with new recommendations:
          </div>
          <div className="whole-home-grid">
            {ZONE_PRESETS.map(zone => {
              const zoneItems = zoneItemsMap[zone.id] || []
              const cost = calculateLayoutCost(zoneItems)
              return (
                <div
                  key={zone.id}
                  className="whole-home-zone-card"
                  onClick={() => handleZoneChange(zone.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {zone.icon} {zone.label}
                    </h3>
                    <span style={{ fontSize: '11px', color: '#888' }}>
                      {zone.widthFt}×{zone.depthFt} ft
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: '6px 0 10px' }}>
                    {zone.description}
                  </p>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e1b18' }}>
                    {zoneItems.length} pieces placed · {cost > 0 ? fmt(cost) : 'Ready to equip'}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {zoneItems.map(it => (
                      <span
                        key={it.id}
                        style={{
                          background: '#f0ece5',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {it.name}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Single Room Architectural Blueprint Mode */
        <>
          {/* Room Metrics & Clearance Summary */}
          <div className="visualizer-stats-row">
            <div>
              <strong>{widthFt}×{depthFt} ft</strong> ({(widthFt * depthFt).toFixed(0)} sqft) ·{' '}
              <span style={{ color: '#666' }}>{activeItems.length} pieces positioned</span>
            </div>
            <div>
              Spatial Occupancy:{' '}
              <strong style={{ color: occupancyPercentage > 48 ? '#c4623a' : '#2b7a4b' }}>
                {occupancyPercentage}% ({occupancyPercentage > 48 ? 'Snug Fit' : 'Generous Walkways'})
              </strong>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#777' }}>Floor:</span>
              <select
                value={floorFinish}
                onChange={e => setFloorFinish(e.target.value as FloorFinish)}
                style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="oak">Warm Oak</option>
                <option value="marble">Italian Marble</option>
                <option value="terrazzo">Terrazzo</option>
                <option value="concrete">Slate Concrete</option>
              </select>

              <span style={{ fontSize: '11px', color: '#777', marginLeft: '6px' }}>Wall:</span>
              <select
                value={wallAccent}
                onChange={e => setWallAccent(e.target.value as WallAccent)}
                style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="sand">Sandstone</option>
                <option value="terracotta">Terracotta</option>
                <option value="sage">Sage Green</option>
                <option value="charcoal">Charcoal</option>
              </select>
            </div>
          </div>

          {/* Interactive Canvas Container with 2D / 3D Isometric View */}
          <div className="floorplan-canvas-container">
            <div
              ref={canvasRef}
              className={`floorplan-canvas-wrap ${viewMode === '3d' ? 'mode-3d' : ''}`}
              style={{ backgroundColor: floorBgColor }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="Interactive architectural spatial canvas"
            >
              {/* Blueprint Grid Lines */}
              <svg className="floorplan-grid-svg" width="100%" height="100%">
                <defs>
                  <pattern id={gridPatternId} width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(184, 147, 90, 0.16)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />
              </svg>

              {/* Window & Doorway Architectural Features */}
              <div className="window-boundary" title="Exterior Window / Daylighting" />
              <div className="window-caption">Window</div>

              <div className="doorway-boundary" title="Main Room Entrance" />
              {showClearance && <div className="doorway-swing-arc" />}
              <div className="doorway-caption">Entry</div>

              {/* Render Placed Furniture Footprints */}
              {activeItems.map(item => {
                const isSelected = selectedItemId === item.id
                const isItemColliding = isSelected && isColliding

                // Scale dimensions relative to room bounding box
                const widthPct = Math.max(12, (item.widthCm / roomWidthCm) * 100)
                const depthPct = Math.max(9, (item.depthCm / roomDepthCm) * 100)

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={`furniture-entity ${isSelected ? 'selected' : ''} ${isItemColliding ? 'colliding' : ''}`}
                    style={{
                      left: `${item.xPercent}%`,
                      top: `${item.yPercent}%`,
                      width: `${widthPct}%`,
                      height: `${depthPct}%`,
                      backgroundColor: isItemColliding ? '#d9383a' : item.color,
                      transform: `rotate(${item.rotationDeg}deg)`,
                    }}
                    onPointerDown={e => handlePointerDown(e, item.id)}
                    onClick={() => setSelectedItemId(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedItemId(item.id)
                    }}
                    title={`${item.name} (${item.widthCm}×${item.depthCm} cm) - Drag to position`}
                  >
                    {showClearance && isSelected && <div className="walkway-clearance-halo" />}
                    <span className="furniture-entity-name">{item.name}</span>
                    <span className="furniture-entity-price">
                      {item.widthCm}×{item.depthCm} cm {item.price ? `· ${fmt(item.price)}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Item Toolbar */}
          {selectedItem ? (
            <div className="selected-item-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong>Selected:</strong>
                <span>{selectedItem.name} ({selectedItem.widthCm}×{selectedItem.depthCm} cm)</span>
                {selectedItem.price ? <span style={{ color: '#c4623a', fontWeight: 600 }}>{fmt(selectedItem.price)}</span> : null}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => handleRotate(selectedItem.id)}
                  title="Rotate 90 degrees"
                >
                  🔄 Rotate
                </button>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => handleNudge(selectedItem.id, -4, 0)}
                  title="Move left"
                >
                  ← Left
                </button>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => handleNudge(selectedItem.id, 4, 0)}
                  title="Move right"
                >
                  Right →
                </button>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => handleNudge(selectedItem.id, 0, -4)}
                  title="Move up"
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => handleNudge(selectedItem.id, 0, 4)}
                  title="Move down"
                >
                  ↓ Down
                </button>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => handleRemove(selectedItem.id)}
                  style={{ color: '#d9383a' }}
                  title="Remove from room"
                >
                  🗑️ Remove
                </button>
                <button
                  type="button"
                  className="v-action-btn"
                  onClick={() => setSelectedItemId(null)}
                  style={{ color: '#777' }}
                >
                  ✕ Done
                </button>
              </div>
            </div>
          ) : null}

          {/* Footer Controls: Dimension Adjusters & Clearance Visibility */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555' }}>
              <span>Room Dimensions:</span>
              <input
                type="number"
                min={8}
                max={36}
                value={widthFt}
                onChange={e => setWidthFt(Math.max(8, Number(e.target.value)))}
                style={{ width: '50px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <span>ft ×</span>
              <input
                type="number"
                min={8}
                max={36}
                value={depthFt}
                onChange={e => setDepthFt(Math.max(8, Number(e.target.value)))}
                style={{ width: '50px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc' }}
              />
              <span>ft</span>
            </div>

            <button
              type="button"
              className="v-action-btn"
              onClick={() => setShowClearance(prev => !prev)}
            >
              {showClearance ? 'Hide Circulation Halos' : 'Show Circulation Halos'}
            </button>
          </div>
        </>
      )}

      {/* "Equip This Space" Catalog Selector Drawer */}
      {isEquipDrawerOpen && (
        <div
          className="equip-drawer-backdrop"
          onClick={() => setIsEquipDrawerOpen(false)}
        >
          <div
            className="equip-drawer"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Equip this space catalog"
          >
            <div className="equip-drawer-head">
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                ✨ Equip {activeZone?.label}
              </h3>
              <button
                type="button"
                onClick={() => setIsEquipDrawerOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Select pieces from the curated catalog. They will be placed directly into your floor plan scaled to real-world dimensions:
            </p>

            {/* Filter by Category */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['all', 'sofa', 'bed', 'dining-table', 'study-table', 'chair', 'wardrobe', 'coffee-table'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogFilterCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid #ccc',
                    background: catalogFilterCategory === cat ? '#1e1b18' : '#f8f6f2',
                    color: catalogFilterCategory === cat ? '#fff' : '#333',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat === 'all' ? 'All' : cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Item List */}
            <div className="equip-catalog-grid">
              {eligibleCatalogItems.map(piece => (
                <div key={piece.id} className="equip-item-card">
                  {piece.imageUrl ? (
                    <Image
                      src={piece.imageUrl}
                      alt={piece.name}
                      width={64}
                      height={64}
                      className="equip-item-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="equip-item-img" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e1b18' }}>
                      {piece.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777', margin: '2px 0' }}>
                      {piece.brand} · {piece.dimensions.width}×{piece.dimensions.depth} cm
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4623a' }}>
                      {fmt(piece.price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="v-action-btn v-action-btn--primary"
                    style={{ padding: '6px 10px' }}
                    onClick={() => handleEquipFromCatalog(piece)}
                  >
                    + Place
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Blueprint Spec Sheet Modal */}
      {isExportModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="export-modal-dialog"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Blueprint Spec Sheet"
          >
            <div className="export-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  📄 Blueprint Specification Sheet
                </h3>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {activeZone?.label} · Architectural Fit & Bill of Materials
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Room Parameters Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', background: '#fcfbf8', padding: '14px', borderRadius: '10px', border: '1px solid #e8e2d8' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Dimensions</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{widthFt} × {depthFt} ft</div>
                <div style={{ fontSize: '11px', color: '#888' }}>({(widthFt * 0.3048).toFixed(1)} × {(depthFt * 0.3048).toFixed(1)} m)</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Total Floor Area</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{widthFt * depthFt} sq ft</div>
                <div style={{ fontSize: '11px', color: '#888' }}>({((widthFt * depthFt) * 0.0929).toFixed(1)} m²)</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Spatial Occupancy</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: occupancyPercentage > 48 ? '#c4623a' : '#2b7a4b' }}>
                  {occupancyPercentage}%
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>{occupancyPercentage > 48 ? 'Snug circulation' : 'Generous walkways'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>Estimated Investment</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#c4623a' }}>
                  {fmt(roomTotalCost)}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>{activeItems.length} pieces placed</div>
              </div>
            </div>

            {/* Itemized Inventory Table */}
            <div>
              <h4 style={{ margin: '8px 0 8px', fontSize: '14px', fontWeight: 700 }}>
                Itemized Furniture Inventory
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f4ede4', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 6px' }}>Item</th>
                      <th style={{ padding: '8px 10px' }}>Category</th>
                      <th style={{ padding: '8px 10px' }}>Brand</th>
                      <th style={{ padding: '8px 10px' }}>Dimensions (W×D)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map(piece => (
                      <tr key={piece.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{piece.name}</td>
                        <td style={{ padding: '8px 10px', color: '#666', textTransform: 'capitalize' }}>
                          {piece.category.replace('-', ' ')}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#666' }}>{piece.brand || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{piece.widthCm} × {piece.depthCm} cm</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#c4623a' }}>
                          {piece.price ? fmt(piece.price) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="v-action-btn"
                onClick={() => window.print()}
              >
                🖨️ Print / Save as PDF
              </button>
              <button
                type="button"
                className="v-action-btn v-action-btn--primary"
                onClick={handleDownloadSpecJson}
              >
                📥 Download JSON Spec
              </button>
              <button
                type="button"
                className="v-action-btn"
                onClick={() => setIsExportModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
