export const spacingScale = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const

export const typographyScale = {
  label: "text-[11px] font-semibold uppercase tracking-wide",
  bodySm: "text-sm leading-6",
  body: "text-base leading-7",
  headingSm: "text-xl font-semibold leading-tight tracking-tight",
  headingMd: "text-2xl font-semibold leading-tight tracking-tight",
  headingLg: "text-4xl font-semibold leading-tight tracking-tight",
} as const

export const radiusScale = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  pill: "rounded-full",
} as const

export const shadowScale = {
  subtle: "shadow-sm",
  card: "shadow-lg shadow-neutral-200/55",
  floating: "shadow-xl shadow-neutral-200/65",
} as const

export const transitionScale = {
  fast: "duration-150",
  base: "duration-200",
  smooth: "duration-300",
} as const

export const motionTokens = {
  instant: 0.12,
  micro: 0.18,
  swift: 0.24,
  smooth: 0.34,
  deliberate: 0.46,
} as const

export const componentPatterns = {
  section: "ds-section",
  sectionShell: "ds-section-shell",
  card: "ds-card",
  cardMuted: "ds-card-muted",
  input: "ds-input",
  chip: "ds-chip",
  buttonPrimary: "ds-btn ds-btn-primary",
  buttonSecondary: "ds-btn ds-btn-secondary",
  buttonGhost: "ds-btn ds-btn-ghost",
} as const
