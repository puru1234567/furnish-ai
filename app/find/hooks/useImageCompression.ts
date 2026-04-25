import { useCallback } from 'react'

/**
 * Handles image file compression and conversion to data URLs
 */
export function useImageCompression() {
  const fileToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })
  }, [])

  const compressImageFile = useCallback(async (file: File, maxWidth = 1280, quality = 0.72): Promise<string> => {
    const sourceDataUrl = await fileToDataUrl(file)

    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))

        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Failed to create image compression context'))
          return
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.onerror = () => reject(new Error('Failed to decode image for compression'))
      image.src = sourceDataUrl
    })
  }, [fileToDataUrl])

  const compressImageFileForApi = useCallback(async (file: File): Promise<string> => {
    // Higher quality for vision API (92%+ confidence) — still compressed but better quality
    return compressImageFile(file, 1920, 0.92)
  }, [compressImageFile])

  return { compressImageFile, compressImageFileForApi, fileToDataUrl }
}
