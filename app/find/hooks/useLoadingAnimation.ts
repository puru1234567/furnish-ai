import { useState, useEffect } from 'react'

/**
 * Manages loading stage animation for recommendation process
 */
export function useLoadingAnimation(isLoading: boolean) {
  const [loadingStageIndex, setLoadingStageIndex] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setLoadingStageIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setLoadingStageIndex(prev => (prev + 1) % 4)
    }, 1600)

    return () => window.clearInterval(intervalId)
  }, [isLoading])

  return loadingStageIndex
}
