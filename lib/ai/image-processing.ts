/**
 * image-processing.ts
 * Server-side image utilities for the room analysis pipeline.
 *
 * Responsibilities:
 *  1. Validate base64 data-URL format
 *  2. Remove near-duplicate images (same angle uploaded twice)
 *  3. Preserve resolution — NO downscaling to protect model accuracy
 *
 * Note: EXIF metadata is already stripped by the browser's canvas.toDataURL().
 * The images arrive here already re-encoded as clean JPEG/PNG base64.
 */

const MAX_IMAGES = 4
const MIN_IMAGES = 1

/** Accepts only standard base64 data-URL strings produced by canvas.toDataURL */
function isValidDataUrl(value: string): boolean {
  return typeof value === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(value)
}

/**
 * Extracts a lightweight fingerprint from a base64 image string.
 * Samples characters at equal intervals across the base64 payload.
 * Fast and good enough for exact-duplicate or near-duplicate detection.
 */
function fingerprintImage(dataUrl: string): string {
  const base64Payload = dataUrl.split(',')[1] ?? ''
  if (base64Payload.length < 200) return base64Payload

  const sampleCount = 64
  const step = Math.floor(base64Payload.length / sampleCount)
  let fingerprint = ''

  for (let i = 0; i < sampleCount; i++) {
    fingerprint += base64Payload[i * step]
  }

  return fingerprint
}

/**
 * Measures similarity between two fingerprints (0 = identical, 1 = completely different).
 */
function fingerprintDifference(a: string, b: string): number {
  if (a.length !== b.length) return 1
  let differences = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) differences++
  }
  return differences / a.length
}

/**
 * Removes near-duplicate images from the input array.
 * Two images are considered duplicates if their fingerprints differ by <8%.
 * Keeps the first encountered of any duplicate pair.
 */
function deduplicateImages(images: string[]): { deduplicated: string[]; removedCount: number } {
  const fingerprints = images.map(fingerprintImage)
  const kept: string[] = []
  const keptFingerprints: string[] = []

  for (let i = 0; i < images.length; i++) {
    const isDuplicate = keptFingerprints.some(
      existingFingerprint => fingerprintDifference(fingerprints[i], existingFingerprint) < 0.08
    )

    if (!isDuplicate) {
      kept.push(images[i])
      keptFingerprints.push(fingerprints[i])
    }
  }

  return {
    deduplicated: kept,
    removedCount: images.length - kept.length,
  }
}

export interface ImageProcessingResult {
  images: string[]
  originalCount: number
  finalCount: number
  duplicatesRemoved: number
  warnings: string[]
}

export interface ImageProcessingError {
  code: 'NO_IMAGES' | 'TOO_MANY_IMAGES' | 'INVALID_FORMAT'
  message: string
}

/**
 * Main entry point — validates and deduplicates images for room analysis.
 * Returns an error object if inputs are unacceptable (caller returns HTTP 400).
 * Returns a result object with clean images and processing metadata.
 */
export function preprocessRoomImages(
  rawImages: unknown
): { error: ImageProcessingError } | { result: ImageProcessingResult } {
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    return {
      error: {
        code: 'NO_IMAGES',
        message: `images array is required (${MIN_IMAGES}–${MAX_IMAGES} base64 data-URLs)`,
      },
    }
  }

  if (rawImages.length > MAX_IMAGES) {
    return {
      error: {
        code: 'TOO_MANY_IMAGES',
        message: `Maximum ${MAX_IMAGES} images allowed`,
      },
    }
  }

  const validImages = (rawImages as unknown[]).filter((x): x is string => 
    typeof x === 'string' && isValidDataUrl(x)
  )
  if (validImages.length === 0) {
    return {
      error: {
        code: 'INVALID_FORMAT',
        message: 'No valid base64 image data-URLs found. Expected format: data:image/jpeg;base64,...',
      },
    }
  }

  const warnings: string[] = []
  const { deduplicated, removedCount } = deduplicateImages(validImages)

  if (removedCount > 0) {
    warnings.push(`${removedCount} near-duplicate image${removedCount > 1 ? 's' : ''} removed — uploaded from same angle`)
  }

  if (deduplicated.length === 1) {
    warnings.push('Only 1 unique image provided — analysis confidence will be reduced. Upload photos from multiple walls for best results.')
  }

  return {
    result: {
      images: deduplicated,
      originalCount: rawImages.length,
      finalCount: deduplicated.length,
      duplicatesRemoved: removedCount,
      warnings,
    },
  }
}
