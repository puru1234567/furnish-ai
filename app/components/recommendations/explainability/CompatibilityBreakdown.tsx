interface CompatibilityBreakdownProps {
  style: number
  room: number
  budget: number
  aesthetic: number
  tone?: "light" | "dark"
}

interface BarProps {
  label: string
  value: number
  tone: "light" | "dark"
}

function CompatibilityBar({ label, value, tone }: BarProps) {
  const isDark = tone === "dark"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className={isDark ? "font-medium text-[#f4efe4]/74" : "font-medium text-neutral-700"}>{label}</span>
        <span className={isDark ? "font-semibold text-[#f4efe4]" : "font-semibold text-neutral-900"}>{value}%</span>
      </div>
      <div className={isDark ? "h-2 rounded-full bg-white/14" : "h-2 rounded-full bg-neutral-100"}>
        <div
          className={isDark
            ? "h-full rounded-full bg-gradient-to-r from-[#d9decd] via-[#b8935a] to-[#c4623a]"
            : "h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400"
          }
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export function CompatibilityBreakdown({ style, room, budget, aesthetic, tone = "light" }: CompatibilityBreakdownProps) {
  const isDark = tone === "dark"

  return (
    <section className={isDark
      ? "mt-3 rounded-xl border border-white/14 bg-white/8 p-2.5"
      : "mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5"
    } aria-label="Compatibility breakdown">
      <p className={isDark ? "text-[11px] font-semibold uppercase tracking-wide text-[#f4efe4]/82" : "text-[11px] font-semibold uppercase tracking-wide text-neutral-700"}>Compatibility breakdown</p>
      <div className="mt-2 space-y-2">
        <CompatibilityBar label="Style" value={style} tone={tone} />
        <CompatibilityBar label="Room fit" value={room} tone={tone} />
        <CompatibilityBar label="Budget fit" value={budget} tone={tone} />
        <CompatibilityBar label="Aesthetic" value={aesthetic} tone={tone} />
      </div>
    </section>
  )
}
