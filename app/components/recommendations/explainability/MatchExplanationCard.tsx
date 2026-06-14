"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AIReasoningBadges } from "./AIReasoningBadges"
import { AlternativeSuggestions } from "./AlternativeSuggestions"
import { BudgetFitVisualization } from "./BudgetFitVisualization"
import { CompatibilityBreakdown } from "./CompatibilityBreakdown"
import { ConfidenceIndicator } from "./ConfidenceIndicator"
import { ExpandableReasoningSection } from "./ExpandableReasoningSection"
import type { ExplainabilityData } from "../types"
import { trackTypedEvent } from "@/lib/analytics/trackEvent"
import { Button } from "@/app/components/ui"

interface MatchExplanationCardProps {
  productId: string
  explainability: ExplainabilityData
  compatibilityScore: number
  budgetDeltaLabel: string
  tone?: "light" | "dark"
}

export function MatchExplanationCard({
  productId,
  explainability,
  compatibilityScore,
  budgetDeltaLabel,
  tone = "light",
}: MatchExplanationCardProps) {
  const isDark = tone === "dark"
  const [expanded, setExpanded] = useState(false)

  function toggleExpanded() {
    setExpanded((previous) => {
      const next = !previous
      trackTypedEvent("recommendation.engaged", {
        productId,
        action: "view_details",
        section: next ? "open_match_explanation" : "close_match_explanation",
      })
      return next
    })
  }

  return (
    <div className={isDark
      ? "mt-4 rounded-xl border border-white/14 bg-white/8 p-3.5"
      : "mt-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5"
    }>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={isDark ? "text-[11px] font-semibold uppercase tracking-wide text-[#f4efe4]/82" : "text-[11px] font-semibold uppercase tracking-wide text-neutral-700"}>Match explanation</p>
          <p className={isDark ? "mt-1 text-xs leading-5 text-[#f4efe4]/74" : "mt-1 text-xs leading-5 text-neutral-600"}>
            {explainability.confidenceLabel} with {compatibilityScore}% compatibility.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          className={isDark ? "shrink-0 text-[#f4efe4]/86" : "shrink-0"}
        >
          {expanded ? "Hide details" : "View details"}
        </Button>
      </div>

      <AIReasoningBadges badges={explainability.reasoningBadges} tone={tone} />

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -2 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <CompatibilityBreakdown
              style={explainability.compatibilityBreakdown.style}
              room={explainability.compatibilityBreakdown.room}
              budget={explainability.compatibilityBreakdown.budget}
              aesthetic={explainability.compatibilityBreakdown.aesthetic}
              tone={tone}
            />

            <BudgetFitVisualization
              indicatorLabel={explainability.budgetReasoningLabel}
              deltaLabel={budgetDeltaLabel}
              tone={tone}
            />

            <ConfidenceIndicator score={compatibilityScore} label={explainability.confidenceLabel} tone={tone} />

            <ExpandableReasoningSection
              title="Style analysis"
              description={explainability.styleAnalysis}
              bullets={explainability.detailedReasoning.style}
              tone={tone}
              onToggle={(open) => {
                trackTypedEvent("recommendation.engaged", {
                  productId,
                  action: open ? "expand_reasoning" : "collapse_reasoning",
                  section: "style_analysis",
                })
              }}
            />

            <ExpandableReasoningSection
              title="Room-size optimization"
              description={explainability.roomOptimization}
              bullets={explainability.detailedReasoning.room}
              tone={tone}
              onToggle={(open) => {
                trackTypedEvent("recommendation.engaged", {
                  productId,
                  action: open ? "expand_reasoning" : "collapse_reasoning",
                  section: "room_optimization",
                })
              }}
            />

            <ExpandableReasoningSection
              title="Aesthetic matching"
              description={explainability.aestheticMatching}
              bullets={explainability.detailedReasoning.aesthetic}
              tone={tone}
              onToggle={(open) => {
                trackTypedEvent("recommendation.engaged", {
                  productId,
                  action: open ? "expand_reasoning" : "collapse_reasoning",
                  section: "aesthetic_matching",
                })
              }}
            />

            <AlternativeSuggestions
              alternatives={explainability.alternatives}
              tone={tone}
              onAlternativeClick={(alternative) => {
                trackTypedEvent("recommendation.engaged", {
                  productId,
                  action: "view_alternatives",
                  section: alternative,
                })
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
