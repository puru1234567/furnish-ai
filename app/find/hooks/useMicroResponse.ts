import { useState, useCallback, useRef, useEffect } from 'react'
import type { MicroResponse } from '../find-page-model'
import { trackEvent } from '@/lib/analytics/trackEvent'

/**
 * Manages micro-response toast notifications with auto-dismissal
 */
export function useMicroResponse(sessionId: string) {
  const [microResponse, setMicroResponse] = useState<MicroResponse | null>(null)
  const microResponseTimeoutRef = useRef<number | null>(null)

  const showMicroResponse = useCallback((title: string, detail: string, tone: MicroResponse['tone'] = 'info') => {
    if (microResponseTimeoutRef.current) {
      window.clearTimeout(microResponseTimeoutRef.current)
    }
    setMicroResponse({ title, detail, tone })
    trackEvent(sessionId, 'micro_response', {
      eventName: title,
      value: tone,
      timestamp: Date.now(),
    })
    microResponseTimeoutRef.current = window.setTimeout(() => {
      setMicroResponse(null)
      microResponseTimeoutRef.current = null
    }, 3200)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (microResponseTimeoutRef.current) {
      window.clearTimeout(microResponseTimeoutRef.current)
    }
  }, [])

  return { microResponse, showMicroResponse }
}
