interface AlternativeSuggestionsProps {
  alternatives: string[]
  tone?: "light" | "dark"
  onAlternativeClick?: (alternative: string) => void
}

export function AlternativeSuggestions({ alternatives, tone = "light", onAlternativeClick }: AlternativeSuggestionsProps) {
  const isDark = tone === "dark"

  if (alternatives.length === 0) return null

  return (
    <section className={isDark
      ? "mt-3 rounded-xl border border-white/14 bg-white/8 p-2.5"
      : "mt-3 rounded-xl border border-neutral-200 bg-white p-2.5"
    } aria-label="Alternative recommendations">
      <p className={isDark ? "text-[11px] font-semibold uppercase tracking-wide text-[#f4efe4]/82" : "text-[11px] font-semibold uppercase tracking-wide text-neutral-700"}>Alternatives to explore</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {alternatives.map((alternative) => (
          <button
            key={alternative}
            type="button"
            onClick={() => onAlternativeClick?.(alternative)}
            className={isDark
              ? "inline-flex min-h-7 items-center rounded-full border border-white/20 bg-white/10 px-3 text-[11px] font-semibold text-[#f4efe4]/84 transition hover:bg-white/16"
              : "ds-pill transition hover:border-neutral-400"
            }
          >
            {alternative}
          </button>
        ))}
      </div>
    </section>
  )
}
