"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { ArrowDown, ArrowRight, X } from "lucide-react"
import { AppIcon } from "@/components/glyph"

/** A macOS notification banner, as DroidLink posts them (App.swift notify()). */
export type BannerInput = {
  title: string
  body: string
  /** Shown instead of the DroidLink icon, e.g. the phone app the notification came from. */
  icon?: ReactNode
  /** Adds the Reply action; called with the typed text. */
  onReply?: (text: string) => void
  duration?: number
}
type Banner = BannerInput & { id: number }

type Ctx = {
  push: (b: BannerInput) => number
  dismiss: (id: number) => void
  /** Fixed top-right layer, so the call card can sit above banners like the real floating panel. */
  overlay: HTMLDivElement | null
  /** What the menu bar menu lists: last OTP and recent notifications. */
  lastOtp: string | null
  setLastOtp: (code: string) => void
  recent: { line: string; text: string }[]
  /** A file going to the phone: the menu bar shows its percentage and the menu a Cancel row. */
  transfer: Transfer | null
  setTransfer: (t: Transfer | null) => void
}

export type Transfer = { name: string; pct: number; waiting?: boolean; cancel: () => void }

const BannerContext = createContext<Ctx | null>(null)

export function useBanners() {
  const ctx = useContext(BannerContext)
  if (!ctx) throw new Error("useBanners needs <BannerProvider>")
  return ctx
}

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  const [lastOtp, setLastOtp] = useState<string | null>(null)
  const [recent, setRecent] = useState<Ctx["recent"]>([])
  const [transfer, setTransfer] = useState<Transfer | null>(null)
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setBanners((bs) => bs.filter((b) => b.id !== id)), [])
  const push = useCallback((b: BannerInput) => {
    const id = nextId.current++
    // Newest on top, at most three on screen, like Notification Center's banner stack.
    setBanners((bs) => [{ ...b, id }, ...bs].slice(0, 3))
    setRecent((r) => [{ line: b.title, text: b.body }, ...r].slice(0, 4))
    return id
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <BannerContext.Provider value={{ push, dismiss, overlay, lastOtp, setLastOtp, recent, transfer, setTransfer }}>
        {children}
        <div
          ref={setOverlay}
          data-ui
          aria-live="polite"
          className="pointer-events-none fixed right-2 bottom-2 left-2 z-40 flex flex-col items-end gap-2 sm:top-9 sm:bottom-auto sm:left-auto sm:w-[360px]"
        >
          <AnimatePresence initial={false}>
            {banners.map((b) => (
              <BannerView key={b.id} banner={b} dismiss={dismiss} />
            ))}
          </AnimatePresence>
        </div>
      </BannerContext.Provider>
    </MotionConfig>
  )
}

function BannerView({ banner, dismiss }: { banner: Banner; dismiss: (id: number) => void }) {
  const onDone = () => dismiss(banner.id)
  const [replying, setReplying] = useState(false)
  const [hover, setHover] = useState(false)
  const [text, setText] = useState("")

  // Auto-dismiss, held while the pointer is on it or a reply is being typed.
  useEffect(() => {
    if (hover || replying) return
    const t = setTimeout(() => dismiss(banner.id), banner.duration ?? 6500)
    return () => clearTimeout(t)
  }, [hover, replying, banner, dismiss])

  const send = () => {
    if (!text.trim()) return
    banner.onReply?.(text.trim())
    onDone()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 380 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 380, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="material pointer-events-auto relative w-full rounded-2xl p-3 text-[13px] leading-snug"
      role="status"
    >
      <div className="flex gap-2.5">
        <div className="pt-0.5">{banner.icon ?? <AppIcon className="size-8" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="flex-1 truncate font-semibold">{banner.title}</p>
            <span className="text-xs text-muted-foreground">now</span>
          </div>
          <p className="line-clamp-3 text-foreground/85">{banner.body}</p>
        </div>
      </div>

      {banner.onReply && !replying && <Coach className="sm:bottom-2.5">Reply from here</Coach>}
      {banner.onReply && !replying && (
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="mt-2 w-full rounded-lg bg-foreground/[0.07] py-1 text-[13px] font-medium hover:bg-foreground/[0.12] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Reply
        </button>
      )}
      {replying && (
        <form
          className="mt-2 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setReplying(false)}
            placeholder="Message"
            aria-label="Reply"
            className="h-7 min-w-0 flex-1 rounded-md bg-background/80 px-2 text-[13px] outline-none ring-1 ring-foreground/10 focus:ring-2 focus:ring-sent/60"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="h-7 rounded-md bg-sent px-3 text-[13px] font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onDone}
        aria-label="Dismiss"
        className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-card text-[11px] text-muted-foreground opacity-0 shadow ring-1 ring-foreground/10 transition-opacity focus-visible:opacity-100 [div:hover>&]:opacity-100"
      >
        <X className="size-3" />
      </button>
    </motion.div>
  )
}

/**
 * A pulsing "do this" hint pointing at a banner or the call card, so visitors know the demo is live.
 * Left of the card on wider screens; above it on phones, where cards span the width at the bottom.
 */
export function Coach({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className={`pointer-events-none absolute z-10 flex items-center whitespace-nowrap max-sm:bottom-full max-sm:right-4 max-sm:mb-2 sm:right-full sm:mr-3 ${className ?? ""}`}
    >
      <motion.span
        animate={{ x: [0, -5, 0], y: 0 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg"
      >
        <ArrowDown className="size-3.5 sm:hidden" />
        {children}
        <ArrowRight className="hidden size-3.5 sm:block" />
      </motion.span>
    </motion.span>
  )
}
