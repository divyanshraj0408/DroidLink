import { cn } from "cn"

/** The DroidLink chain, same path as mac/Sources/Glyph.swift, rising bottom-left to top-right. */
const LINK =
  "M3.9,12c0,-1.71 1.39,-3.1 3.1,-3.1h4V7H7c-2.76,0 -5,2.24 -5,5s2.24,5 5,5h4v-1.9H7c-1.71,0 -3.1,-1.39 -3.1,-3.1zM8,13h8v-2H8v2zM17,7h-4v1.9h4c1.71,0 3.1,1.39 3.1,3.1s-1.39,3.1 -3.1,3.1h-4V17h4c2.76,0 5,-2.24 5,-5s-2.24,-5 -5,-5z"

const MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${LINK}" transform="rotate(-45 12 12)"/></svg>`
)}")`

export function Chain({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="1 1 22 22" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={LINK} transform="rotate(-45 12 12)" fill="currentColor" />
    </svg>
  )
}

/** The app icon: graphite squircle with the brushed-aluminium chain. */
export function AppIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[22.5%] bg-gradient-to-b from-[#3a3a3c] to-[#1e1e20]",
        className
      )}
      aria-hidden
    >
      {/* A masked gradient rather than an SVG <linearGradient>: gradient ids break when the first copy is display:none. */}
      <span className="size-[62%] bg-gradient-to-b from-[#f7f7f9] to-[#9a9da5]" style={{ mask: `${MASK} center / contain no-repeat` }} />
    </span>
  )
}
