'use client'

import { useEffect, useRef } from 'react'

const VB_W = 100
const VB_H = 200
const PATH_D =
  'M 50 0 C 90 25, 90 25, 50 50 C 10 75, 10 75, 50 100 C 90 125, 90 125, 50 150 C 10 175, 10 175, 50 200'

const STEPS = [
  { index: 'I',   side: 'left'  as const, progress: 0.125, title: 'Upload the room',                copy: 'Lead with the room instead of filling a long list of filters first.' },
  { index: 'II',  side: 'right' as const, progress: 0.375, title: 'Answer a few focused questions', copy: 'The system only asks what can still change the ranking.' },
  { index: 'III', side: 'left'  as const, progress: 0.625, title: 'See why each piece fits',        copy: 'Recommendations come back with written fit logic, not only scores.' },
  { index: 'IV',  side: 'right' as const, progress: 0.875, title: 'Compare and shortlist',          copy: 'Save, compare, and share without losing the room context.' },
]

export function FeaturesStrip() {
  const sectionRef  = useRef<HTMLElement>(null)
  const canvasRef   = useRef<HTMLDivElement>(null)
  const pathRef     = useRef<SVGPathElement>(null)
  const maskRectRef = useRef<SVGRectElement>(null)
  const itemRefs    = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const section  = sectionRef.current
    const canvas   = canvasRef.current
    const pathEl   = pathRef.current
    const maskRect = maskRectRef.current
    if (!section || !canvas || !pathEl || !maskRect) return

    const pathLength = pathEl.getTotalLength()

    function positionItems() {
      const w = canvas!.offsetWidth
      const h = canvas!.offsetHeight
      const scaleX = w / VB_W
      const scaleY = h / VB_H
      STEPS.forEach(({ progress }, idx) => {
        const el = itemRefs.current[idx]
        if (!el) return
        const pt = pathEl!.getPointAtLength(pathLength * progress)
        el.style.left = `${pt.x * scaleX}px`
        el.style.top  = `${pt.y * scaleY}px`
      })
    }

    function handleScroll() {
      const rect  = section!.getBoundingClientRect()
      const viewH = window.innerHeight
      const raw   = (viewH * 0.76 - rect.top) / rect.height
      const progress = Math.min(Math.max(raw, 0), 1)
      maskRect!.setAttribute('height', String(VB_H * progress))
      STEPS.forEach(({ progress: itemProg }, idx) => {
        const el = itemRefs.current[idx]
        if (!el) return
        if (progress >= itemProg - 0.02) {
          el.style.transitionDelay = `${idx * 0.07}s`
          el.classList.add('tl-item--visible')
        } else {
          el.style.transitionDelay = '0s'
          el.classList.remove('tl-item--visible')
        }
      })
    }

    const onResize = () => requestAnimationFrame(() => { positionItems(); handleScroll() })

    positionItems()
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section ref={sectionRef} className="features-strip" id="how">
      <div className="features-strip-head">
        <div className="features-strip-kicker">How it works</div>
        <h2 className="features-strip-title">A calmer furniture journey, built around the room.</h2>
        <p className="features-strip-copy">The product should feel guided and spacious: room first, a few focused signals second, shortlist third.</p>
      </div>

      <div ref={canvasRef} className="tl-canvas">
        <svg
          className="tl-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="tl-clip" clipPathUnits="userSpaceOnUse">
              <rect ref={maskRectRef} x="0" y="0" width={VB_W} height="0" />
            </clipPath>
          </defs>
          <path d={PATH_D} className="tl-path tl-path--base" />
          <path ref={pathRef} d={PATH_D} className="tl-path tl-path--lit" clipPath="url(#tl-clip)" />
        </svg>

        <div className="tl-items" aria-hidden="true">
          {STEPS.map((step, idx) => (
            <div
              key={step.index}
              ref={el => { itemRefs.current[idx] = el }}
              className={`tl-item tl-item--${step.side}`}
            >
              <div className="tl-dot" />
              <div className="tl-panel">
                <div className="tl-step-index">{step.index}</div>
                <div className="tl-step-title">{step.title}</div>
                <div className="tl-step-copy">{step.copy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ol className="tl-sr-list">
        {STEPS.map(step => (
          <li key={step.index}><strong>{step.title}</strong> — {step.copy}</li>
        ))}
      </ol>
    </section>
  )
}
