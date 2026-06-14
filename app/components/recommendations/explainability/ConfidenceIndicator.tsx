interface ConfidenceIndicatorProps {
  score: number
  label: string
  tone?: "light" | "dark"
}

function toneForScore(score: number, tone: "light" | "dark") {
  if (tone === "dark") {
    if (score >= 90) return "text-[#d9decd]"
    if (score >= 75) return "text-[#ead7b3]"
    return "text-[#f0c5aa]"
  }

  if (score >= 90) return "text-emerald-700"
  if (score >= 75) return "text-sky-700"
  return "text-amber-700"
}

export function ConfidenceIndicator({ score, label, tone = "light" }: ConfidenceIndicatorProps) {
  const isDark = tone === "dark"

  return (
    <div className={isDark
      ? "mt-3 rounded-xl border border-white/14 bg-white/8 p-2.5"
      : "mt-3 rounded-xl border border-neutral-200 bg-white p-2.5"
    } aria-label="Recommendation confidence indicator">
      <div className="flex items-center justify-between text-xs">
        <span className={isDark ? "font-semibold text-[#f4efe4]/74" : "font-semibold text-neutral-700"}>Confidence</span>
        <span className={`font-semibold ${toneForScore(score, tone)}`}>{label}</span>
      </div>
      <div className={isDark ? "mt-2 h-2 rounded-full bg-white/14" : "mt-2 h-2 rounded-full bg-neutral-100"}>
        <div
          className={isDark
            ? "h-full rounded-full bg-gradient-to-r from-[#f4efe4] to-[#b8935a]"
            : "h-full rounded-full bg-gradient-to-r from-neutral-900 to-neutral-600"
          }
          style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
