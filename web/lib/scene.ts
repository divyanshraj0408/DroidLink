"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import { useInView } from "motion/react"

type Step = [delayMs: number, run: () => void]

/**
 * Plays a timed script of steps. `play` restarts it; it starts by itself the first time `ref`
 * is mostly on screen. Pending steps are cancelled on restart and unmount.
 */
export function useScene(ref: RefObject<Element | null>, script: () => Step[]) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const inView = useInView(ref, { once: true, amount: 0.55 })
  const scriptRef = useRef(script)
  useEffect(() => {
    scriptRef.current = script
  })

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout)
    let at = 0
    timers.current = scriptRef.current().map(([delay, run]) => setTimeout(run, (at += delay)))
  }, [])

  useEffect(() => {
    if (inView) play()
  }, [inView, play])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return play
}

export const randomCode = () => String(Math.floor(100000 + Math.random() * 900000))
