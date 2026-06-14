"use client"

import { FormEvent, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useConversationalSearch } from "./hooks/useConversationalSearch"
import { Button, Card } from "@/app/components/ui"

interface HeroSearchProps {
	query: string
	onQueryChange: (value: string) => void
	onSubmit: () => void
	isLoading: boolean
	onStartRoomRead: () => void
	examples: string[]
}

export function HeroSearch({
	query,
	onQueryChange,
	onSubmit,
	isLoading,
	onStartRoomRead,
	examples,
}: HeroSearchProps) {
	const [intentExpanded, setIntentExpanded] = useState(false)

	const {
		placeholder,
		recentSearches,
		clearRecentSearches,
		dropdownOpen,
		filteredSuggestions,
		activeIndex,
		setActiveIndex,
		openDropdown,
		closeDropdown,
		handleInputKeyDown,
		applySuggestion,
		storeRecentSearch,
		parsedIntent,
	} = useConversationalSearch({
		query,
		setQuery: onQueryChange,
		examples,
	})

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		storeRecentSearch(query)
		closeDropdown()
		onSubmit()
	}

	const hasIntent = Boolean(parsedIntent.style || parsedIntent.space || parsedIntent.budget || parsedIntent.product)

	return (
		<div className="space-y-3" role="search" aria-label="Conversational AI furniture search">
			<form
				onSubmit={handleSubmit}
				className="rounded-2xl border border-white/18 bg-white/8 p-2 backdrop-blur-sm"
			>
				<label htmlFor="hero-ai-search" className="sr-only">
					Describe furniture needs using natural language
				</label>
				<div className="flex flex-col gap-2 sm:flex-row">
					<input
						id="hero-ai-search"
						value={query}
						onChange={(event) => onQueryChange(event.target.value)}
						onFocus={openDropdown}
						onBlur={() => {
							window.setTimeout(() => closeDropdown(), 120)
						}}
						onKeyDown={handleInputKeyDown}
						placeholder={placeholder}
						className="h-12 flex-1 rounded-xl border border-white/25 bg-white/85 px-3 text-sm text-neutral-900 placeholder:text-neutral-500"
						autoComplete="off"
						role="combobox"
						aria-expanded={dropdownOpen}
						aria-controls="hero-ai-search-list"
						aria-autocomplete="list"
					/>
					<Button
						type="submit"
						disabled={isLoading}
						variant="primary"
						size="md"
						className="border-white/20 bg-[#f4efe4] text-neutral-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isLoading ? "Generating..." : "Find with AI"}
					</Button>
				</div>

				<AnimatePresence>
					{dropdownOpen ? (
						<motion.div
							id="hero-ai-search-list"
							role="listbox"
							initial={{ opacity: 0, y: -6, scale: 0.99 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -4, scale: 0.99 }}
							transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
							className="mt-2 rounded-xl border border-white/20 bg-[#fffdf9] p-2 shadow-lg shadow-black/10"
						>
							<div className="mb-2 flex items-center justify-between px-1">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
									Suggestions
								</p>
								{recentSearches.length > 0 ? (
									<button
										type="button"
										onClick={clearRecentSearches}
										className="text-[11px] font-medium text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
									>
										Clear recent
									</button>
								) : null}
							</div>

							{filteredSuggestions.length > 0 ? (
								<ul className="space-y-1">
									{filteredSuggestions.map((suggestion, index) => {
										const isActive = index === activeIndex
										return (
											<li key={suggestion}>
												<button
													type="button"
													role="option"
													aria-selected={isActive}
													onMouseEnter={() => setActiveIndex(index)}
													onMouseDown={(event) => event.preventDefault()}
													onClick={() => applySuggestion(suggestion)}
													className={[
														"w-full rounded-lg px-3 py-2 text-left text-sm transition duration-200",
														isActive ? "bg-[#f6ecdf] text-[#4b433d]" : "hover:bg-neutral-100 text-neutral-800",
													].join(" ")}
												>
													{suggestion}
												</button>
											</li>
										)
									})}
								</ul>
							) : (
								<div className="rounded-lg border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-500">
									No direct match yet. Keep typing naturally and AI will infer intent.
								</div>
							)}

							{recentSearches.length > 0 ? (
								<div className="mt-3 border-t border-neutral-100 pt-2">
									<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Recent</p>
									<div className="flex flex-wrap gap-2">
										{recentSearches.map((item) => (
											<button
												key={item}
												type="button"
												onMouseDown={(event) => event.preventDefault()}
												onClick={() => applySuggestion(item, { shouldStore: false })}
												className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-700 hover:border-neutral-400"
											>
												{item}
											</button>
										))}
									</div>
								</div>
							) : null}
						</motion.div>
					) : null}
				</AnimatePresence>
			</form>

			<div className="flex flex-wrap items-center gap-2 text-xs text-[#f4efe4]/78">
				<Button
					onClick={onStartRoomRead}
					variant="secondary"
					size="sm"
					className="rounded-full border-white/28 bg-white/12 text-[#f4efe4] hover:bg-white/18 focus-visible:ring-white/50"
				>
					Start your room read
				</Button>
				<span>Room-aware ranking beats static filter combinations.</span>
			</div>

			<Card className="border-white/18 bg-white/10 p-3" aria-live="polite" aria-label="AI intent interpretation">
				<div className="flex items-center justify-between gap-3">
					<div>
						<div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f4efe4]/86">AI interpretation</div>
						<p className="mt-1 text-xs leading-5 text-[#f4efe4]/76">
							{hasIntent
								? `Detected ${parsedIntent.product ?? "furniture"} intent with ${parsedIntent.style ?? "style"} and ${parsedIntent.budget ?? "budget"} context.`
								: "Share style, room type, and budget in one line to unlock richer intent extraction."}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setIntentExpanded((previous) => !previous)}
						className="shrink-0 text-[#f4efe4]"
					>
						{intentExpanded ? "Hide details" : "Show details"}
					</Button>
				</div>

				<AnimatePresence initial={false}>
					{intentExpanded && hasIntent ? (
						<motion.div
							initial={{ opacity: 0, height: 0, y: -4 }}
							animate={{ opacity: 1, height: "auto", y: 0 }}
							exit={{ opacity: 0, height: 0, y: -2 }}
							transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="mt-3 overflow-hidden"
						>
							<div className="grid gap-2 text-xs text-[#f4efe4]/82 sm:grid-cols-2">
								<div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2"><strong>Style:</strong> {parsedIntent.style ?? "-"}</div>
								<div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2"><strong>Space:</strong> {parsedIntent.space ?? "-"}</div>
								<div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2"><strong>Budget:</strong> {parsedIntent.budget ?? "-"}</div>
								<div className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-2"><strong>Product:</strong> {parsedIntent.product ?? "-"}</div>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>
			</Card>

			<div className="flex flex-wrap gap-2" role="list" aria-label="Quick intent chips">
				{examples.slice(0, 4).map((example) => (
					<button
						key={example}
						type="button"
						role="listitem"
						onClick={() => applySuggestion(example)}
						className="rounded-full border border-white/24 bg-white/12 px-3 py-1.5 text-[11px] font-medium text-[#f4efe4]/90 transition hover:bg-white/20"
					>
						{example}
					</button>
				))}
			</div>

			<AnimatePresence>
			{isLoading ? (
				<motion.div
					className="rounded-2xl border border-white/20 bg-white/12 p-4 shadow-sm"
					aria-live="polite"
					aria-label="AI recommendation generation status"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 8 }}
					transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
				>
					<p className="text-xs font-medium text-[#f4efe4]/85">Understanding intent and space constraints...</p>
					<div className="mt-3 space-y-2">
						<motion.div className="h-2.5 w-5/6 rounded bg-white/35" animate={{ opacity: [0.45, 0.95, 0.45] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
						<motion.div className="h-2.5 w-3/4 rounded bg-white/35" animate={{ opacity: [0.45, 0.95, 0.45] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.12, ease: "easeInOut" }} />
						<motion.div className="h-2.5 w-2/3 rounded bg-white/35" animate={{ opacity: [0.45, 0.95, 0.45] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2, ease: "easeInOut" }} />
					</div>
				</motion.div>
			) : null}
			</AnimatePresence>
		</div>
	)
}
