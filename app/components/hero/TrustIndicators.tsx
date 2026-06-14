interface TrustIndicatorsProps {
	hasSavedResults: boolean
}

const TRUST_PILLS = [
	"Room-fit scoring",
	"Budget-aware suggestions",
	"Style and dimension checks",
]

export function TrustIndicators({ hasSavedResults }: TrustIndicatorsProps) {
	return (
		<section aria-label="Trust indicators" className="space-y-3">
			<div className="flex flex-wrap gap-2">
				{TRUST_PILLS.map((pill) => (
					<span
						key={pill}
						className="ds-pill ds-pill-muted"
					>
						<span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
						{pill}
					</span>
				))}
			</div>

			<div className="grid gap-2.5 text-xs text-neutral-600 sm:grid-cols-3">
				<div className="rounded-xl border border-neutral-200 bg-white/95 px-3 py-2.5">
					<div className="font-semibold text-neutral-900">Explainable ranking</div>
					<div>Every suggestion includes AI reasons, not just tags.</div>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white/95 px-3 py-2.5">
					<div className="font-semibold text-neutral-900">Personalized from prompt</div>
					<div>Natural language intent drives the result order.</div>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white/95 px-3 py-2.5">
					<div className="font-semibold text-neutral-900">Saved flow continuity</div>
					<div>{hasSavedResults ? "You have prior saves ready to revisit." : "Start a first shortlist and save as you compare."}</div>
				</div>
			</div>
		</section>
	)
}
