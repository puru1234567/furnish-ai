"use client"

import { motion } from "framer-motion"
import { RecommendationGrid } from "../recommendations/RecommendationGrid"
import { HeroCarousel } from "../recommendations/HeroCarousel"
import { transitions } from "../motion/presets"
import type { AIRecommendation } from "../recommendations/types"

interface HeroPreviewProps {
	isLoading: boolean
	recommendations: AIRecommendation[]
	compact?: boolean
}

export function HeroPreview({ isLoading, recommendations, compact = false }: HeroPreviewProps) {
	return (
		<motion.aside
			className={compact
				? "rounded-2xl border border-white/14 bg-white/8 p-3"
				: "rounded-3xl border border-neutral-200 bg-white/95 p-5 shadow-lg shadow-neutral-200/60"
			}
			aria-label="AI recommendation preview"
			initial={{ opacity: 0, y: 18 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.24 }}
			transition={transitions.reveal}
		>
			<div className="mb-3 flex items-center justify-between">
				<h2 className={compact ? "hero-preview-heading text-sm font-semibold" : "text-sm font-semibold text-neutral-900"}>
					AI recommendation assistant
				</h2>
				<span className={compact
					? "hero-preview-meta rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold"
					: "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
				}>
					Reasoned ranking
				</span>
			</div>

			{compact ? (
				<HeroCarousel items={recommendations} isLoading={isLoading} />
			) : (
				<RecommendationGrid items={recommendations} isLoading={isLoading} tone="light" />
			)}
		</motion.aside>
	)
}
