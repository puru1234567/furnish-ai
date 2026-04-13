// app/page.tsx  ← route /
// Landing page — entry point. Explains the value, sends users to /find.

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Nav ── */}
      <nav className="px-6 py-4 border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-stone-800 tracking-tight">FurnishAI</span>
          <Link
            href="/find"
            className="text-sm text-stone-600 hover:text-stone-800 transition-colors"
          >
            Find furniture →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg text-center">

          {/* Badge */}
          <div className="inline-block bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            AI-powered · India-first · Free to use
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-semibold text-stone-900 leading-tight mb-4">
            Find furniture that actually fits{' '}
            <span className="text-stone-400">your room, your style, your budget.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-stone-500 text-lg leading-relaxed mb-10">
            Answer a few quick questions. Our AI searches across Pepperfry, IKEA, Urban Ladder,
            and local stores — then ranks the top 10 matches and explains exactly why each one fits you.
          </p>

          {/* CTA */}
          <Link
            href="/find"
            className="inline-block bg-stone-800 text-white px-8 py-4 rounded-xl font-medium text-base hover:bg-stone-700 transition-colors"
          >
            Find my furniture — 2 minutes →
          </Link>

          {/* Social proof / trust signals */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-stone-400">
            <span>✓ No account needed</span>
            <span>✓ Delhi NCR ready</span>
            <span>✓ All price ranges</span>
          </div>
        </div>
      </main>

      {/* ── How it works ── */}
      <section className="bg-white border-t border-stone-200 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-stone-800 text-center mb-8">How it works</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { step: '01', title: 'Tell us your context', desc: 'Room size, budget, style preference, how you use the space' },
              { step: '02', title: 'AI ranks the options', desc: 'We filter by your city and budget, then our AI ranks by relevance' },
              { step: '03', title: 'See why each fits', desc: 'Every recommendation comes with a specific explanation for your situation' },
            ].map((item) => (
              <div key={item.step}>
                <div className="text-2xl font-semibold text-stone-200 mb-2">{item.step}</div>
                <div className="font-medium text-stone-800 text-sm mb-1">{item.title}</div>
                <div className="text-xs text-stone-400 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-4 border-t border-stone-200">
        <div className="max-w-4xl mx-auto text-center text-xs text-stone-400">
          Built with Next.js + Groq API · Side project → startup
        </div>
      </footer>
    </div>
  )
}
