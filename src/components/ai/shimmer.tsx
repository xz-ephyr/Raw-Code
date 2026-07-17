import type { ReactNode } from "react"

export function Shimmer({ duration, children }: { duration?: number; children: ReactNode }) {
  return (
    <span
      className="shimmer-text"
      style={{ animationDuration: `${duration ?? 2}s` }}
    >
      {children}
    </span>
  )
}
