interface AIReasoningBadgesProps {
  badges: string[]
  tone?: "light" | "dark"
}

export function AIReasoningBadges({ badges, tone = "light" }: AIReasoningBadgesProps) {
  const isDark = tone === "dark"

  if (badges.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="AI reasoning badges">
      {badges.map((badge) => (
        <span
          key={badge}
          role="listitem"
          className={isDark
            ? "inline-flex min-h-7 items-center rounded-full border border-white/20 bg-white/10 px-3 text-[11px] font-semibold text-[#f4efe4]/84"
            : "ds-pill ds-pill-muted"
          }
        >
          {badge}
        </span>
      ))}
    </div>
  )
}
