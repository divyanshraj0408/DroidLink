"use client"

import { useEffect } from "react"

/** Plays each [data-reveal] element's entrance (globals.css) once, as it scrolls into view. */
export function Reveals() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add("in")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    )
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}
