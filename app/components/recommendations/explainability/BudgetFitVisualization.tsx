interface BudgetFitVisualizationProps {
  indicatorLabel: string
  deltaLabel: string
  tone?: "light" | "dark"
}

export function BudgetFitVisualization({ indicatorLabel, deltaLabel, tone = "light" }: BudgetFitVisualizationProps) {
  const isDark = tone === "dark"

  return (
    <section className={isDark
      ? "mt-3 rounded-xl border border-white/14 bg-white/8 p-2.5"
      : "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5"
    } aria-label="Budget reasoning">
      <p className={isDark ? "text-[11px] font-semibold uppercase tracking-wide text-[#f4efe4]/82" : "text-[11px] font-semibold uppercase tracking-wide text-emerald-800"}>Budget reasoning</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={isDark ? "font-semibold text-[#f4efe4]" : "font-semibold text-emerald-900"}>{indicatorLabel}</span>
        <span className={isDark ? "text-[#f4efe4]/78" : "text-emerald-800"}>{deltaLabel}</span>
      </div>
      <div className={isDark ? "mt-2 h-2 rounded-full bg-white/14" : "mt-2 h-2 rounded-full bg-emerald-100"}>
        <div
          className={isDark
            ? "h-full w-3/4 rounded-full bg-gradient-to-r from-[#d9decd] to-[#c4623a]"
            : "h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
          }
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
