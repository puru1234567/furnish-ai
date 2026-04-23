'use client'

export function FeaturesStrip() {
  return (
    <section className="features-strip" id="how">
      <div className="feat-item">
        <div className="feat-icon">📸</div>
        <div className="feat-title">Room photo analysis</div>
        <div className="feat-sub">Upload a photo and AI reads your colors, style and space</div>
      </div>
      <div className="feat-item">
        <div className="feat-icon">💬</div>
        <div className="feat-title">Personal explanations</div>
        <div className="feat-sub">"Why it fits YOU" — not generic bestsellers</div>
      </div>
      <div className="feat-item">
        <div className="feat-icon">⚡</div>
        <div className="feat-title">Live filtering</div>
        <div className="feat-sub">See item count update as you adjust budget in real time</div>
      </div>
      <div className="feat-item">
        <div className="feat-icon">📍</div>
        <div className="feat-title">City-aware</div>
        <div className="feat-sub">Stock, delivery speed, and pricing by your city</div>
      </div>
    </section>
  )
}
