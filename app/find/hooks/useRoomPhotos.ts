import { useState, useCallback, useRef } from 'react'
import type { PhotoSlotId } from '../find-page-model'

/**
 * Manages room photo upload state and references
 */
export function useRoomPhotos() {
  const [roomPhotos, setRoomPhotos] = useState<Record<PhotoSlotId, File | null>>({
    front: null,
    left: null,
    right: null,
    back: null,
  })
  const [photoPreviews, setPhotoPreviews] = useState<Record<PhotoSlotId, string | null>>({
    front: null,
    left: null,
    right: null,
    back: null,
  })
  const [isDraggingSlot, setIsDraggingSlot] = useState<PhotoSlotId | null>(null)
  const slotInputRefs = useRef<Record<PhotoSlotId, HTMLInputElement | null>>({
    front: null,
    left: null,
    right: null,
    back: null,
  })

  const photoCount = Object.values(roomPhotos).filter(Boolean).length
  const allPhotosUploaded = photoCount === 4

  const clearPhoto = useCallback((slot: PhotoSlotId) => {
    setRoomPhotos(prev => ({ ...prev, [slot]: null }))
    setPhotoPreviews(prev => ({ ...prev, [slot]: null }))
    if (slotInputRefs.current[slot]) slotInputRefs.current[slot]!.value = ''
  }, [])

  return {
    roomPhotos,
    setRoomPhotos,
    photoPreviews,
    setPhotoPreviews,
    isDraggingSlot,
    setIsDraggingSlot,
    slotInputRefs,
    photoCount,
    allPhotosUploaded,
    clearPhoto,
  }
}
