"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { revealUpVariants, staggerContainerVariants, transitions } from "./presets"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.24 }}
      variants={revealUpVariants}
      transition={{ ...transitions.reveal, delay }}
    >
      {children}
    </motion.div>
  )
}

interface StaggerRevealProps {
  children: ReactNode
  className?: string
}

export function StaggerReveal({ children, className }: StaggerRevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  )
}

interface LiftCardProps {
  children: ReactNode
  className?: string
}

export function LiftCard({ children, className }: LiftCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={transitions.hover}
    >
      {children}
    </motion.div>
  )
}
