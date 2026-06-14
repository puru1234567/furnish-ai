"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import type { AIRecommendation } from "./types"
import { MatchExplanationCard } from "./explainability/MatchExplanationCard"
import { transitions } from "../motion/presets"
import { trackTypedEvent } from "@/lib/analytics/trackEvent"
import { Button } from "@/app/components/ui"

interface RecommendationCardProps {
  item: AIRecommendation
  isSaved: boolean
  isCompared: boolean
  onToggleSaved: (id: string) => void
  onToggleCompared: (id: string) => void
  tone?: "light" | "dark"
}

function budgetTone(budgetFit: AIRecommendation["budgetFit"]) {
  if (budgetFit === "under") return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (budgetFit === "stretch") return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-rose-100 text-rose-800 border-rose-200"
}

function roomTone(roomFit: AIRecommendation["roomFit"]) {
  if (roomFit === "perfect") return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (roomFit === "good") return "bg-sky-100 text-sky-800 border-sky-200"
  return "bg-orange-100 text-orange-800 border-orange-200"
}

export function RecommendationCard({
  item,
  isSaved,
  isCompared,
  onToggleSaved,
  onToggleCompared,
  tone = "light",
}: RecommendationCardProps) {
  const isDark = tone === "dark"
  const [showAllReasons, setShowAllReasons] = useState(false)

  function handleCardClickCapture(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (target.closest("button")) return

    trackTypedEvent("product.clicked", {
      productId: item.id,
      productName: item.name,
      listId: "hero_recommendations",
    })
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1.5 }}
      transition={transitions.reveal}
      className={[
        "relative rounded-2xl p-5 transition duration-300",
        isDark
          ? "border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.07))] shadow-[0_18px_40px_rgba(9,12,10,0.28)] hover:shadow-[0_22px_44px_rgba(9,12,10,0.32)]"
          : "border border-neutral-200 bg-white shadow-sm hover:shadow-md",
      ].join(" ")}
      aria-label={`${item.name} recommendation card`}
      onClickCapture={handleCardClickCapture}
    >
      <div className={isDark ? "pointer-events-none absolute inset-x-4 top-0 h-px bg-white/14" : "pointer-events-none absolute inset-x-4 top-0 h-px bg-neutral-100"} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={isDark ? "text-xs font-medium uppercase tracking-wide text-[#f4efe4]/64" : "text-xs font-medium uppercase tracking-wide text-neutral-500"}>{item.brand}</p>
		  <h3 className={isDark ? "mt-1 text-base font-semibold leading-6 text-[#f4efe4]" : "mt-1 text-base font-semibold leading-6 text-neutral-900"}>{item.name}</h3>
		  <p className={isDark ? "mt-1 text-sm text-[#f4efe4]/76" : "mt-1 text-sm text-neutral-600"}>{item.priceLabel}</p>
        </div>
        <div className={isDark
          ? "rounded-full border border-white/24 bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-[#f4efe4]"
          : "rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white"
        }>
          {item.compatibilityScore}% match
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={isDark
          ? "rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#f4efe4]/86"
          : `rounded-full border px-2.5 py-1 text-[11px] font-semibold ${budgetTone(item.budgetFit)}`
        }>
          Budget: {item.budgetDeltaLabel}
        </span>
        <span className={isDark
          ? "rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#f4efe4]/86"
          : `rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roomTone(item.roomFit)}`
        }>
          Room fit: {item.roomFitNote}
        </span>
      </div>

      <div className={isDark
        ? "mt-4 rounded-xl border border-white/14 bg-white/8 p-3.5"
        : "mt-4 rounded-xl border border-amber-200/80 bg-amber-50/85 p-3.5"
      }>
        <p className={isDark ? "text-[11px] font-semibold uppercase tracking-wide text-[#f4efe4]/82" : "text-[11px] font-semibold uppercase tracking-wide text-amber-800"}>Why this matches you</p>
      <ul className={isDark ? "mt-2.5 space-y-1.5 text-sm leading-6 text-[#f4efe4]/84" : "mt-2.5 space-y-1.5 text-sm leading-6 text-amber-900"}>
          {(showAllReasons ? item.whyThisMatches : item.whyThisMatches.slice(0, 2)).map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <span className={isDark ? "mt-1 h-1.5 w-1.5 rounded-full bg-[#f4efe4]/72" : "mt-1 h-1.5 w-1.5 rounded-full bg-amber-700"} aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        {item.whyThisMatches.length > 2 ? (
          <button
            type="button"
            onClick={() => setShowAllReasons((previous) => !previous)}
            className={isDark
              ? "mt-2 text-xs font-medium text-[#f4efe4]/84 underline-offset-2 hover:underline"
              : "mt-2 text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
            }
          >
            {showAllReasons ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>

      <MatchExplanationCard
        productId={item.id}
        explainability={item.explainability}
        compatibilityScore={item.compatibilityScore}
        budgetDeltaLabel={item.budgetDeltaLabel}
        tone={tone}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {item.tasteTags.map((tag) => (
          <span
            key={tag}
            className={isDark
              ? "rounded-full border border-white/18 bg-white/10 px-2.5 py-1 text-[11px] text-[#f4efe4]/82"
              : "rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-700"
            }
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className={isDark
            ? (isSaved
              ? "border-white/28 bg-white/18 text-[#f4efe4]"
              : "border-white/24 bg-white/10 text-[#f4efe4]/86 hover:bg-white/16")
            : (isSaved
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400")
          }
          onClick={() => {
            onToggleSaved(item.id)
            trackTypedEvent("product.saved_toggled", {
              productId: item.id,
              saved: !isSaved,
              location: "hero_recommendations",
            })
          }}
          aria-pressed={isSaved}
        >
          {isSaved ? "Saved" : "Save"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={isDark
            ? (isCompared
              ? "border-white/28 bg-white/18 text-[#f4efe4]"
              : "border-white/24 bg-white/10 text-[#f4efe4]/86 hover:bg-white/16")
            : (isCompared
              ? "border-sky-300 bg-sky-50 text-sky-800"
              : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400")
          }
          onClick={() => {
            onToggleCompared(item.id)
            trackTypedEvent("product.compared_toggled", {
              productId: item.id,
              compared: !isCompared,
            })
          }}
          aria-pressed={isCompared}
        >
          {isCompared ? "Selected" : "Compare"}
        </Button>
      </div>
    </motion.article>
  )
}
