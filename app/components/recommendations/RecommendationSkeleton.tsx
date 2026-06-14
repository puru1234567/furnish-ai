"use client"

import { motion } from "framer-motion"

interface RecommendationSkeletonProps {
  tone?: "light" | "dark"
}

export function RecommendationSkeleton({ tone = "light" }: RecommendationSkeletonProps) {
  const isDark = tone === "dark"

  return (
    <div className={[
      "relative overflow-hidden rounded-2xl p-4",
      isDark
        ? "border border-white/14 bg-white/8 shadow-[0_16px_36px_rgba(9,12,10,0.24)]"
        : "border border-neutral-200 bg-white shadow-sm",
    ].join(" ")}>
      <motion.div
        className={[
          "pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent to-transparent",
          isDark ? "via-white/25" : "via-white/60",
        ].join(" ")}
        animate={{ x: ["-20%", "220%"] }}
        transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <div className={isDark ? "h-4 w-2/3 rounded bg-white/30" : "h-4 w-2/3 rounded bg-neutral-200/90"} />
      <div className={isDark ? "mt-2 h-3 w-1/3 rounded bg-white/22" : "mt-2 h-3 w-1/3 rounded bg-neutral-200/90"} />
      <div className={isDark ? "mt-3 h-2.5 w-5/6 rounded bg-white/18" : "mt-3 h-2.5 w-5/6 rounded bg-neutral-200/90"} />
      <div className={isDark ? "mt-2 h-2.5 w-4/6 rounded bg-white/18" : "mt-2 h-2.5 w-4/6 rounded bg-neutral-200/90"} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className={isDark ? "h-8 rounded bg-white/18" : "h-8 rounded bg-neutral-200/90"} />
        <div className={isDark ? "h-8 rounded bg-white/18" : "h-8 rounded bg-neutral-200/90"} />
      </div>
    </div>
  )
}
