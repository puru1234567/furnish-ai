'use client'

import { useEffect, useRef } from 'react'

// ViewBox matches reference proportions exactly
const VB_W = 375
const VB_H = 1376

// Path stored bottom-to-top: getPointAtLength(0) = bottom, getPointAtLength(total) = top.
// Item positioning uses fromTop = 1 - progress to map scroll progress → path position.
const PATH_D =
  'M258.803 1375.68C258.803 1375.68 184.931 1017.16 243.803 800.182C275.981 681.588 384.817 635.475 372.803 513.182C355.046 332.418 -21.6799 412.791 1.80342 232.682C18.73 102.86 243.803 0.681641 243.803 0.681641'

const STEPS = [
  { index: 'I',   side: 'right' as const, progress: 0.00, title: 'Upload the room',                copy: 'Lead with the room instead of filling a long list of filters first.' },
  { index: 'II',  side: 'right' as const, progress: 0.40, title: 'Answer a few focused questions', copy: 'The system only asks what can still change the ranking.' },
  { index: 'III', side: 'left'  as const, progress: 0.60, title: 'See why each piece fits',        copy: 'Recommendations come back with written fit logic, not only scores.' },
  { index: 'IV',  side: 'right' as const, progress: 0.80, title: 'Compare and shortlist',          copy: 'Save, compare, and share without losing the room context.' },
]

export function FeaturesStrip() {
  const sectionRef  = useRef<HTMLElement>(null)
  const canvasRef   = useRef<HTMLDivElement>(null)
  const svgRef      = useRef<SVGSVGElement>(null)
  const maskRectRef = useRef<SVGRectElement>(null)
  const itemRefs    = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const section  = sectionRef.current
    const canvas   = canvasRef.current
    const svg      = svgRef.current
    const maskRect = maskRectRef.current
    if (!section || !canvas || !svg || !maskRect) return

    const path = svg.querySelector<SVGPathElement>('path')
    if (!path) return

    const pathLength = path.getTotalLength()
    const vb         = svg.viewBox.baseVal

    function positionItems() {
      const canvasRect = canvas!.getBoundingClientRect()
      const svgRect    = svg!.getBoundingClientRect()
      const w = svgRect.width
      const h = svgRect.height
      const offsetX = svgRect.left - canvasRect.left
      const offsetY = svgRect.top  - canvasRect.top

      STEPS.forEach(({ progress }, idx) => {
        const el = itemRefs.current[idx]
        if (!el) return
        // Path is bottom-to-top; fromTop = 1 - progress maps scroll progress to path position
        const fromTop = 1 - progress
        const pt = path!.getPointAtLength(pathLength * fromTop)
        el.style.left = `${((pt.x - vb.x) / vb.width)  * w + offsetX}px`
        el.style.top  = `${((pt.y - vb.y) / vb.height) * h + offsetY}px`
      })
    }

    function handleScroll() {
      const rect     = section!.getBoundingClientRect()
      const viewH    = window.innerHeight
      // Adjusted formula to reach 1.0 across full section height
      const progress = Math.min(
        Math.max((viewH * 0.7 - rect.top) / (rect.height * 0.6 + viewH * 0.1), 0),
        1
      )

      // Grow mask rect height to reveal path top-down
      maskRect!.setAttribute('height', String(VB_H * progress))

      positionItems()

      STEPS.forEach(({ progress: itemProg }, idx) => {
        const el = itemRefs.current[idx]
        if (!el) return
        if (progress >= itemProg) {
          el.classList.add('tl-item--visible')
        } else {
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
          ref={svgRef}
          className="tl-svg"
          width="375"
          height="1376"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="tl-grad" x1="187" y1="1" x2="187" y2="1375" gradientUnits="userSpaceOnUse">
              <stop stopColor="#171a16" stopOpacity="0" />
              <stop offset="0.06" stopColor="#171a16" stopOpacity="0.20" />
              <stop offset="0.94" stopColor="#171a16" stopOpacity="0.20" />
              <stop offset="1" stopColor="#171a16" stopOpacity="0" />
            </linearGradient>
            <mask id="tl-mask" maskUnits="userSpaceOnUse">
              <rect ref={maskRectRef} x="0" y="0" width={VB_W} height="0" fill="white" />
            </mask>
          </defs>
          <path
            d={PATH_D}
            stroke="url(#tl-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            mask="url(#tl-mask)"
          />
        </svg>

        <div className="tl-items">
          {STEPS.map((step, idx) => (
            <div
              key={step.index}
              ref={el => { itemRefs.current[idx] = el }}
              className="tl-item"
              data-side={step.side}
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
