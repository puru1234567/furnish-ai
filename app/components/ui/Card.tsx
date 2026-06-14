import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "./cn"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: "default" | "muted"
}

export function Card({ children, className, tone = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(tone === "default" ? "ds-card" : "ds-card-muted", className)}
      {...props}
    >
      {children}
    </div>
  )
}
