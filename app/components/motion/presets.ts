import type { Transition, Variants } from "framer-motion"

export const motionTiming = {
  instant: 0.12,
  micro: 0.18,
  swift: 0.22,
  smooth: 0.3,
  deliberate: 0.4,
} as const

export const motionEase = {
  premium: [0.22, 1, 0.36, 1] as const,
  settle: [0.2, 0.8, 0.2, 1] as const,
  softOut: [0.16, 1, 0.3, 1] as const,
} as const

export const transitions = {
  reveal: {
    duration: motionTiming.smooth,
    ease: motionEase.premium,
  } satisfies Transition,
  hover: {
    duration: motionTiming.micro,
    ease: motionEase.softOut,
  } satisfies Transition,
  press: {
    duration: motionTiming.instant,
    ease: motionEase.settle,
  } satisfies Transition,
}

export const revealUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.reveal,
  },
}

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
}
