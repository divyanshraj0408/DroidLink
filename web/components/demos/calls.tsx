"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { Delete, Grid3x3, MicOff, Phone as PhoneIcon, PhoneOff, Volume2 } from "lucide-react"
import { Coach, useBanners } from "@/components/banners"
import { MacWindow, Phone } from "@/components/devices"
import { PHONE } from "@/lib/site"
import { Button } from "@/components/ui/button"
import { useScene } from "@/lib/scene"

type State = "idle" | "ringing" | "calling" | "active" | "ended"

const CONTACTS = [
  { name: "Mom", number: "+91 98765 43210" },
  { name: "Rohan Mehta", number: "+91 91234 56780" },
  { name: "Khushi", number: "+91 99887 66554" },
]
const digits = (s: string) => s.replace(/\D/g, "")
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
const LETTERS: Record<string, string> = { "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ", "0": "+" }

/** Calls.swift on the web: ring, accept/decline/end from the Mac, dial from the keypad. */
export function CallsScene() {
  const ref = useRef<HTMLDivElement>(null)
  const { overlay } = useBanners()
  const [state, setState] = useState<State>("idle")
  const [who, setWho] = useState({ name: "", number: "" })
  const [secs, setSecs] = useState(0)
  const [dialed, setDialed] = useState("")
  const later = useRef<ReturnType<typeof setTimeout>[]>([])

  const after = (ms: number, run: () => void) => later.current.push(setTimeout(run, ms))
  const clear = () => {
    later.current.forEach(clearTimeout)
    later.current = []
  }
  useEffect(() => () => later.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (state !== "active") return
    const t = setInterval(() => setSecs((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [state])

  const go = (s: State) => {
    if (s === "active") setSecs(0)
    setState(s)
    if (s === "ended") after(2000, () => setState("idle"))
  }

  const ring = () => {
    clear()
    setWho(CONTACTS[0])
    go("ringing")
    after(14000, () => setState((s) => (s === "ringing" ? "ended" : s))) // missed
  }
  const answer = () => (clear(), go("active"))
  const end = () => (clear(), go("ended"))
  const dial = (raw: string) => {
    const to = raw.trim()
    const match = CONTACTS.find((c) => digits(to).length >= 3 && digits(c.number).endsWith(digits(to).slice(-10))) ??
      (digits(to) ? undefined : CONTACTS.find((c) => c.name.toLowerCase().startsWith(to.toLowerCase())))
    if (!match && digits(to).length < 3) return
    clear()
    setWho(match ?? { name: "", number: to })
    setDialed("")
    go("calling")
    after(2600, () => go("active")) // they pick up
  }

  useScene(ref, () => [[700, ring]])

  const title = who.name || who.number || "Unknown Caller"
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
  const subtitle = { ringing: PHONE, calling: "Calling…", active: `${clock} · audio on ${PHONE}`, ended: "Call Ended", idle: "" }[state]

  const matches = dialed.trim()
    ? CONTACTS.filter((c) => (digits(dialed) ? digits(c.number).includes(digits(dialed)) : c.name.toLowerCase().includes(dialed.toLowerCase()))).slice(0, 3)
    : []

  return (
    <div ref={ref} className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <MacWindow className="w-[300px] shrink-0" title="Keypad">
        <form
          className="flex flex-col items-center gap-3 px-6 pt-5 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            dial(matches.length === 1 && !digits(dialed) ? matches[0].number : dialed)
          }}
        >
          <input
            value={dialed}
            onChange={(e) => setDialed(e.target.value)}
            placeholder="Enter number or name"
            aria-label="Number or name"
            className="w-full bg-transparent text-center text-2xl font-light outline-none placeholder:text-base placeholder:text-muted-foreground/70"
          />
          <div className="flex h-10 flex-col items-center text-xs">
            {matches.map((c) => (
              <button key={c.number} type="button" onClick={() => setDialed(c.number)} className="text-sent hover:underline">
                {c.name}  {c.number}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-5 gap-y-3">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setDialed((d) => d + k)}
                className="flex size-14 flex-col items-center justify-center rounded-full bg-foreground/10 leading-none hover:bg-foreground/15 active:bg-foreground/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="text-[22px]">{k}</span>
                <span className="mt-0.5 h-2 text-[7px] font-bold tracking-[0.15em]">{LETTERS[k] ?? ""}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 items-center gap-x-5">
            <span />
            <button type="submit" aria-label="Call on your phone" className="grid size-14 place-items-center rounded-full bg-signal text-white hover:brightness-95">
              <PhoneIcon className="size-6 fill-current" />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => setDialed((d) => d.slice(0, -1))}
              className="grid size-14 place-items-center text-muted-foreground data-[hide=true]:invisible"
              data-hide={!dialed}
            >
              <Delete className="size-5" />
            </button>
          </div>
        </form>
      </MacWindow>

      <div className="flex flex-col items-center gap-5">
        <Phone label={`Phone call screen: ${state === "idle" ? "no call" : `${title}, ${subtitle}`}`}>
          <CallScreen state={state} title={title} subtitle={state === "ringing" ? "Incoming call" : subtitle.replace(` · audio on ${PHONE}`, "")} />
        </Phone>
        <Button variant="outline" onClick={ring} disabled={state !== "idle"}>
          Ring my Mac
        </Button>
      </div>

      {overlay &&
        createPortal(
          <AnimatePresence>
            {state !== "idle" && (
              <motion.div
                key="call"
                initial={{ opacity: 0, y: -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                className="material pointer-events-auto relative order-first flex w-full items-center gap-3 rounded-[18px] px-3.5 py-3"
                role="dialog"
                aria-label={`Call with ${title}`}
              >
                <Avatar name={title} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <p className="truncate text-xs text-muted-foreground tabular-nums">{subtitle}</p>
                </div>
                {state === "ringing" && <Coach className="sm:top-5">Pick up here</Coach>}
                {state === "ringing" && <Round color="bg-decline" label="Decline" onClick={end} icon={<PhoneOff />} />}
                {state === "ringing" && <Round color="bg-signal" label="Accept" onClick={answer} icon={<PhoneIcon className="fill-current" />} />}
                {(state === "calling" || state === "active") && <Round color="bg-decline" label="End" onClick={end} icon={<PhoneOff />} />}
              </motion.div>
            )}
          </AnimatePresence>,
          overlay
        )}
    </div>
  )
}

function Round({ color, label, onClick, icon }: { color: string; label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-[38px] shrink-0 place-items-center rounded-full text-white hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4 ${color}`}
    >
      {icon}
    </button>
  )
}

/** Grey gradient circle with initials, like Contacts (Calls.swift Avatar). */
function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").filter((w) => /\p{L}/u.test(w[0] ?? "")).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#a8a8a8] to-[#808080] font-medium text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || "#"}
    </span>
  )
}

function CallScreen({ state, title, subtitle }: { state: State; title: string; subtitle: string }) {
  if (state === "idle") {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-[11px] text-black/45 dark:text-white/50">
        No calls right now. Ring the Mac, or dial from the keypad.
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col items-center bg-[#1c2530] px-4 pt-10 pb-8 text-white">
      <Avatar name={title} size={64} />
      <p className="mt-3 text-[18px] font-medium">{title}</p>
      <p className="text-[11px] text-white/70 tabular-nums">{subtitle}</p>
      <div className="mt-auto grid grid-cols-3 gap-4 text-[9px] text-white/70">
        {[["Mute", <MicOff key="m" />], ["Keypad", <Grid3x3 key="k" />], ["Speaker", <Volume2 key="s" />]].map(([l, i]) => (
          <span key={l as string} className="flex flex-col items-center gap-1">
            <span className="grid size-10 place-items-center rounded-full bg-white/15 [&_svg]:size-4">{i}</span>
            {l}
          </span>
        ))}
      </div>
      <span className="mt-5 grid size-12 place-items-center rounded-full bg-decline">
        <PhoneOff className="size-5" />
      </span>
    </div>
  )
}
