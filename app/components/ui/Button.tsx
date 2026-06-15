"use client"

import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"
import type { ReactNode } from "react"
import { cn } from "./cn"

type ButtonVariant = "primary" | "secondary" | "ghost"
type ButtonSize = "sm" | "md"

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ds-btn ds-btn-primary",
  secondary: "ds-btn ds-btn-secondary",
  ghost: "ds-btn ds-btn-ghost",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-xs",
  md: "h-12 px-5 text-sm",
}

export function Button({
  children,
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  )
}
