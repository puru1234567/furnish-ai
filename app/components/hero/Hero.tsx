"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"
import Link from "next/link"
import { HeroPreview } from "./HeroPreview"
import { useAnalyticsSession, useScrollDepthTracking, useSessionDurationTracking } from "@/lib/analytics"
import { Reveal, StaggerReveal } from "../motion/primitives"
import type { AIRecommendation } from "../recommendations/types"

interface HeroProps {
	displayName: string
	onStartRoomRead: () => void
}

const HERO_RIGHT_RECOMMENDATIONS: AIRecommendation[] = [
	{
		id: "hero-table",
		brand: "Noma Studio",
		name: "Noma Japandi Dining Table",
		priceInr: 27500,
		priceLabel: "INR 27,500",
		compatibilityScore: 89,
		budgetFit: "over",
		budgetDeltaLabel: "11% above budget",
		roomFit: "tight",
		roomFitNote: "Slightly tight",
		tasteTags: ["Japandi", "Balanced Grain", "Clean Geometry"],
		whyThisMatches: [
			"Balanced wood tone supports Japandi palettes.",
			"Tapered leg geometry keeps floor feel open.",
		],
		explainability: {
			reasoningBadges: ["Style-forward", "Room-aware", "Premium material"],
			compatibilityBreakdown: { style: 96, room: 80, budget: 74, aesthetic: 95 },
			styleAnalysis: "Strong Japandi expression through balanced grain and restrained form.",
			budgetReasoningLabel: "Above budget but high design alignment",
			roomOptimization: "Seats four with efficient leg geometry, though clearance is tighter.",
			aestheticMatching: "Material and form language align with calm interiors.",
			confidenceLabel: "Moderate-high confidence",
			detailedReasoning: {
				style: ["Muted finish stays true to Japandi sensibility."],
				room: ["Leg taper improves movement around corners."],
				aesthetic: ["Visible grain keeps the surface organic and calm."],
			},
			alternatives: ["Noma Compact 4-Seater"],
		},
	},
	{
		id: "hero-sofa",
		brand: "CloudCraft",
		name: "Mellow Cloud 2-Seater Sofa",
		priceInr: 19600,
		priceLabel: "INR 19,600",
		compatibilityScore: 91,
		budgetFit: "stretch",
		budgetDeltaLabel: "3% stretch",
		roomFit: "good",
		roomFitNote: "Good",
		tasteTags: ["Cozy", "Soft Curves", "Apartment Friendly"],
		whyThisMatches: [
			"Seat firmness tuned for longer evening lounging.",
			"Rounded arms create a softer cozy silhouette.",
		],
		explainability: {
			reasoningBadges: ["Comfort weighted", "Cozy style fit", "Apartment scale"],
			compatibilityBreakdown: { style: 92, room: 87, budget: 82, aesthetic: 90 },
			styleAnalysis: "Soft curves and plush seating align with a cozy preference.",
			budgetReasoningLabel: "Slight stretch with better comfort return",
			roomOptimization: "Width fits compact living rooms while maintaining pathway clearance.",
			aestheticMatching: "Rounded contour language supports warm, relaxed interiors.",
			confidenceLabel: "Strong confidence",
			detailedReasoning: {
				style: ["Cushion profile emphasizes lounge-ready comfort."],
				room: ["2-seater format is better for narrow wall spans."],
				aesthetic: ["Curved outlines soften hard interior lines."],
			},
			alternatives: ["Luna Cozy Loveseat"],
		},
	},
	{
		id: "hero-desk",
		brand: "FurniHaus",
		name: "Aster Compact Oak Work Desk",
		priceInr: 18900,
		priceLabel: "INR 18,900",
		compatibilityScore: 94,
		budgetFit: "under",
		budgetDeltaLabel: "6% under budget",
		roomFit: "perfect",
		roomFitNote: "Perfect",
		tasteTags: ["Warm Minimal", "Light Wood", "Compact Profile"],
		whyThisMatches: [
			"Shallow depth profile improves movement in tight rooms.",
			"Natural oak finish aligns with minimal warm interiors.",
		],
		explainability: {
			reasoningBadges: ["Intent aligned", "Budget conscious", "Spatially optimized"],
			compatibilityBreakdown: { style: 95, room: 93, budget: 90, aesthetic: 92 },
			styleAnalysis: "Natural oak and clean edges mirror warm minimal preference.",
			budgetReasoningLabel: "Budget-safe and value efficient",
			roomOptimization: "Depth and leg profile preserve circulation in compact layouts.",
			aestheticMatching: "Balanced tone and calm geometry reduce visual noise.",
			confidenceLabel: "High confidence",
			detailedReasoning: {
				style: ["Warm undertones align with cozy-neutral palettes."],
				room: ["Compact footprint leaves comfortable chair clearance."],
				aesthetic: ["Material texture adds warmth without heaviness."],
			},
			alternatives: ["Ashwood Fold Desk"],
		},
	},
]

export function Hero({ displayName, onStartRoomRead }: HeroProps) {
	useAnalyticsSession(null)
	useScrollDepthTracking("/")
	useSessionDurationTracking("/")

	const heading = useMemo(() => {
		if (!displayName || displayName === "there") {
			return "The shortlist begins with the"
		}
		return `${displayName}, your shortlist begins with the`
	}, [displayName])

	return (
		<section className="landing-hero" aria-label="Hero">
			<div className="hero-orbit hero-orbit-left" aria-hidden="true" />
			<div className="hero-orbit hero-orbit-right" aria-hidden="true" />

			<motion.div
				className="hero-left"
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
			>
				<StaggerReveal className="space-y-7">
					<Reveal delay={0.02}>
						<div className="hero-badge">
							<span className="hero-badge-dot" aria-hidden="true" />
							A room-aware way to choose furniture
						</div>
					</Reveal>

					<Reveal delay={0.06}>
						<div>
							<h1 className="hero-h1">
								{heading}{" "}
								<em>room.</em>
							</h1>
							<p className="hero-sub">
								Upload your space, answer a few focused questions, and get furniture recommendations that feel considered,
								calm, and actually right for the room.
							</p>
						</div>
					</Reveal>

					<Reveal delay={0.08}>
						<div className="hero-cta">
							<button type="button" className="primary" onClick={onStartRoomRead}>Start your room read</button>
							<Link href="#how" className="secondary">See the journey</Link>
						</div>
					</Reveal>

					<Reveal delay={0.1}>
						<div className="hero-journey-strip" aria-label="Journey overview">
							<div className="hero-journey-step">
								<div className="hero-journey-index hero-journey-index--terracotta">I</div>
								<div>
									<strong>Show the room</strong>
									<span>Upload a few angles</span>
								</div>
							</div>
							<div className="hero-journey-step">
								<div className="hero-journey-index hero-journey-index--gold">II</div>
								<div>
									<strong>Refine what matters</strong>
									<span>Answer only ranking questions</span>
								</div>
							</div>
							<div className="hero-journey-step">
								<div className="hero-journey-index hero-journey-index--moss">III</div>
								<div>
									<strong>Review the shortlist</strong>
									<span>Compare, save, and share</span>
								</div>
							</div>
						</div>
					</Reveal>
				</StaggerReveal>
			</motion.div>

			<motion.aside
				className="hero-right"
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
			>
				<div className="hero-atmosphere-card hero-atmosphere-primary">
					<p className="hero-atmosphere-label">Why it fits</p>
					<h2 className="hero-atmosphere-title">A calmer, room-aware shortlist</h2>
					<p className="hero-atmosphere-copy">
						These example products stay visible so users can understand the shortlist format immediately.
					</p>
					<div className="mt-4 rounded-2xl border border-white/18 bg-white/10 p-3">
						<HeroPreview isLoading={false} recommendations={HERO_RIGHT_RECOMMENDATIONS} compact />
					</div>
				</div>
			</motion.aside>
		</section>
	)
}
