import { useState, useEffect } from 'react'

interface PassiveContext {
  device: string
  timeLabel: string
  isReturn: boolean
  refSource: string
}

/**
 * Captures passive context for analytics (device, time, referrer, return visitor)
 */
export function usePassiveContext() {
  const [passiveCtx, setPassiveCtx] = useState<PassiveContext | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const isMobile = /Mobi|Android/i.test(ua)
    const hour = new Date().getHours()
    const timeLabel = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
    const refSource = document.referrer.includes('google')
      ? 'Google'
      : document.referrer.includes('instagram')
      ? 'Instagram'
      : document.referrer
      ? 'Link'
      : 'Direct'
    const isReturn = sessionStorage.getItem('furnish-visited') === 'true'
    sessionStorage.setItem('furnish-visited', 'true')

    setPassiveCtx({
      device: isMobile ? 'Mobile' : 'Desktop',
      timeLabel,
      isReturn,
      refSource,
    })
  }, [])

  return passiveCtx
}
