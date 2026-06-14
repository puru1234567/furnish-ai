"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"

interface FloatingSearchExamplesProps {
	examples: string[]
	onExampleApply: (example: string) => void
	autoRotateMs?: number
}

export function FloatingSearchExamples({
	examples,
	onExampleApply,
	autoRotateMs = 2800,
}: FloatingSearchExamplesProps) {
	const [activeIndex, setActiveIndex] = useState(0)

	useEffect(() => {
		if (examples.length <= 1) return

		const timer = window.setInterval(() => {
			setActiveIndex((previous) => (previous + 1) % examples.length)
		}, autoRotateMs)

		return () => window.clearInterval(timer)
	}, [autoRotateMs, examples.length])

	const activeExample = examples[activeIndex] ?? ""

	return (
		<div className="rounded-2xl border border-amber-200/60 bg-white/88 p-4 shadow-sm">
			<p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
				Try asking
			</p>

			<div aria-live="polite" className="mt-2 min-h-10">
				<AnimatePresence mode="wait">
					<motion.button
						key={activeExample}
						type="button"
						onClick={() => onExampleApply(activeExample)}
						className="w-full rounded-xl bg-amber-50 px-3 py-2 text-left text-sm font-medium text-neutral-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
					>
						{activeExample}
					</motion.button>
				</AnimatePresence>
			</div>

			<div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Suggested search prompts">
				{examples.map((example, index) => {
					const isActive = index === activeIndex
					return (
						<button
							key={example}
							type="button"
							role="listitem"
							onClick={() => {
								setActiveIndex(index)
								onExampleApply(example)
							}}
							className={[
								"rounded-full border px-3 py-1 text-xs transition",
								isActive
									? "border-amber-600 bg-amber-600 text-white"
									: "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
							].join(" ")}
							aria-pressed={isActive}
						>
							Example {index + 1}
						</button>
					)
				})}
			</div>
		</div>
	)
}
