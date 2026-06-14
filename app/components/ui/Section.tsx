import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "./cn"

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  shellClassName?: string
}

export function Section({ children, className, shellClassName, ...props }: SectionProps) {
  return (
    <section className={cn("ds-section", className)} {...props}>
      <div className={cn("ds-section-shell", shellClassName)}>{children}</div>
    </section>
  )
}
