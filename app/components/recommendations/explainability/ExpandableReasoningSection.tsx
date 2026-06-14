"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useId, useState } from "react"
import { transitions } from "../../motion/presets"

interface ExpandableReasoningSectionProps {
  title: string
  description: string
  bullets: string[]
  tone?: "light" | "dark"
  onToggle?: (open: boolean) => void
}

export function ExpandableReasoningSection({
  title,
  description,
  bullets,
  tone = "light",
  onToggle,
}: ExpandableReasoningSectionProps) {
  const isDark = tone === "dark"
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <section className={isDark
      ? "mt-3 rounded-xl border border-white/14 bg-white/8 p-3"
      : "mt-3 rounded-xl border border-neutral-200 bg-white p-3"
    } aria-label={title}>
      <button
        type="button"
        className={isDark
          ? "flex w-full items-center justify-between gap-3 text-left text-[#f4efe4]/82 transition-colors duration-200 hover:text-[#f4efe4]"
          : "flex w-full items-center justify-between gap-3 text-left transition-colors duration-200 hover:text-neutral-900"
        }
        onClick={() => {
          setOpen((previous) => {
            const next = !previous
            onToggle?.(next)
            return next
          })
        }}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="max-w-[52ch]">
          <p className={isDark ? "text-[11px] font-semibold uppercase tracking-wide text-[#f4efe4]/78" : "text-[11px] font-semibold uppercase tracking-wide text-neutral-700"}>{title}</p>
          <p className={isDark ? "mt-1 text-sm leading-6 text-[#f4efe4]/72" : "mt-1 text-sm leading-6 text-neutral-600"}>{description}</p>
        </div>
        <span className={isDark
          ? "rounded-full border border-white/22 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-[#f4efe4]/86"
          : "rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold text-neutral-700"
        }>
          {open ? "Hide" : "Explain"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            id={panelId}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, y: -2 }}
            transition={transitions.hover}
            className={isDark
              ? "mt-2.5 space-y-1.5 overflow-hidden text-sm leading-6 text-[#f4efe4]/78"
              : "mt-2.5 space-y-1.5 overflow-hidden text-sm leading-6 text-neutral-700"
            }
          >
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <span className={isDark ? "mt-1 h-1.5 w-1.5 rounded-full bg-[#f4efe4]/65" : "mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"} aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
