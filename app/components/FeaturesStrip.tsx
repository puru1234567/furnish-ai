'use client'

export function FeaturesStrip() {
  const steps = [
    {
      index: 'I',
      title: 'Upload the room',
      copy: 'Lead with the room instead of filling a long list of filters first.',
    },
    {
      index: 'II',
      title: 'Answer a few focused questions',
      copy: 'The system only asks what can still change the ranking.',
    },
    {
      index: 'III',
      title: 'See why each piece fits',
      copy: 'Recommendations come back with written fit logic, not only scores.',
    },
    {
      index: 'IV',
      title: 'Compare and shortlist',
      copy: 'Save, compare, and share without losing the room context.',
    },
  ]

  return (
    <section className="features-strip" id="how">
      <div className="features-strip-head">
        <div className="features-strip-kicker">How it works</div>
        <h2 className="features-strip-title">A calmer furniture journey, built around the room.</h2>
        <p className="features-strip-copy">The product should feel guided and spacious: room first, a few focused signals second, shortlist third.</p>
      </div>
      <div className="features-strip-grid">
        {steps.map(step => (
          <article key={step.index} className="feat-item">
            <div className="feat-index">{step.index}</div>
            <div className="feat-content">
              <div className="feat-title">{step.title}</div>
              <div className="feat-sub">{step.copy}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
