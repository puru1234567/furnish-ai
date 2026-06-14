"use client"

import { AnimatePresence, motion } from "framer-motion"
import { RecommendationCard } from "./RecommendationCard"
import { RecommendationSkeleton } from "./RecommendationSkeleton"
import type { AIRecommendation } from "./types"
import { useRecommendationActions } from "./useRecommendationActions"
import { transitions } from "../motion/presets"

interface RecommendationGridProps {
  items: AIRecommendation[]
  isLoading: boolean
  tone?: "light" | "dark"
}

export function RecommendationGrid({ items, isLoading, tone = "light" }: RecommendationGridProps) {
  const isDark = tone === "dark"

  const {
    savedIds,
    compareIds,
    compareItems,
    compareLimitReached,
    toggleSaved,
    toggleCompared,
    clearCompared,
  } = useRecommendationActions(items)

  if (isLoading) {
    return (
      <div className="space-y-3" aria-live="polite" aria-label="Loading recommendations">
        {Array.from({ length: 3 }).map((_, index) => (
          <RecommendationSkeleton key={index} tone={tone} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={[
        "rounded-2xl border border-dashed p-6 text-center text-sm",
        isDark
          ? "border-white/24 bg-white/8 text-[#f4efe4]/78"
          : "border-neutral-300 bg-white text-neutral-600",
      ].join(" ")}>
        No recommendations yet. Describe your style, space, and budget to generate personalized suggestions.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <motion.div
        layout
        className="grid gap-4 sm:grid-cols-2"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.02,
            },
          },
        }}
      >
        {items.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            isSaved={savedIds.has(item.id)}
            isCompared={compareIds.has(item.id)}
            onToggleSaved={toggleSaved}
            onToggleCompared={toggleCompared}
            tone={tone}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {compareItems.length > 0 ? (
          <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, scale: 0.985 }}
              transition={transitions.reveal}
            className={[
              "rounded-2xl p-3",
              isDark
                ? "border border-white/14 bg-white/10"
                : "border border-neutral-200 bg-neutral-50",
            ].join(" ")}
            aria-label="Selected comparisons"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={isDark ? "text-xs font-semibold text-[#f4efe4]/86" : "text-xs font-semibold text-neutral-800"}>
                Compare queue: {compareItems.length}/3 selected
              </p>
              <button
                type="button"
                className={[
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                  isDark
                    ? "border border-white/24 bg-white/12 text-[#f4efe4]/86"
                    : "border border-neutral-300 bg-white text-neutral-700",
                ].join(" ")}
                onClick={clearCompared}
              >
                Clear
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {compareItems.map((item) => (
                <span
                  key={item.id}
                  className={isDark
                    ? "rounded-full border border-white/18 bg-white/10 px-2 py-1 text-[11px] text-[#f4efe4]/84"
                    : "rounded-full bg-white px-2 py-1 text-[11px] text-neutral-700"
                  }
                >
                  {item.name}
                </span>
              ))}
            </div>
            {compareLimitReached ? (
              <p className={isDark ? "mt-2 text-[11px] text-[#f4efe4]/72" : "mt-2 text-[11px] text-neutral-700"}>
                Maximum compare items selected. Remove one to add another.
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
