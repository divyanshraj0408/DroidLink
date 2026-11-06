"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { Check, Download, Lock, Mail, MessageSquare, Play, Share, Upload, Wifi } from "lucide-react"
import { cn } from "cn"
import { Coach, useBanners } from "@/components/banners"
import { MacWindow, Phone } from "@/components/devices"
import { AppIcon } from "@/components/glyph"
import { useScene } from "@/lib/scene"

const MiB = 1 << 20
const ITEMS = [
  { src: "/photos/kedarnath-peak.jpg", name: "IMG_2041.JPG", bytes: 3_100_000, alt: "Snow-covered peak above Kedarnath against a clear blue sky" },
  { src: "/photos/chola-valley.jpg", name: "Himalaya trek.mov", bytes: 4_200_000_000, video: "12:48", alt: "Trekkers crossing snow beside a mountain lake below Himalayan peaks" },
  { src: "/photos/kedarnath-valley.jpg", name: "IMG_2055.JPG", bytes: 2_800_000, alt: "Terraced fields and forest in the Kedarnath valley under heavy clouds" },
  { src: "/photos/rudraprayag-bridge.jpg", name: "IMG_2063.HEIC", bytes: 2_400_000, alt: "A steel arch bridge over the river at Rudraprayag" },
]

/** Like macOS ByteCountFormatter (.file): decimal units. */
const size = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`)

type Status = "idle" | "waiting" | "sending" | "done" | "cancelled"

/**
 * Transfers.swift / Transfers.java: Share → DroidLink offers the file, the phone accepts and it
 * streams in encrypted 1 MiB chunks. The menu bar shows the percentage, the phone a progress
 * notification with Cancel, and a SHA-256 check closes it.
 */
export function BigFilesScene() {
  const ref = useRef<HTMLDivElement>(null)
  const { push, setTransfer } = useBanners()
  const [sel, setSel] = useState(1)
  const [menu, setMenu] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [pct, setPct] = useState(0)
  const [sending, setSending] = useState(ITEMS[1])
  const [cancelledBy, setCancelledBy] = useState<"Mac" | "phone">("phone")
  const raf = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const stop = () => {
    cancelAnimationFrame(raf.current)
    clearTimeout(timer.current)
    setTransfer(null)
  }
  useEffect(() => stop, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = (by: "Mac" | "phone", item = sending) => {
    stop()
    setCancelledBy(by)
    setStatus("cancelled")
    push({ title: `Sending ${item.name} failed`, body: by === "phone" ? "Cancelled on the phone" : "Cancelled" })
  }

  const send = (i: number) => {
    stop()
    const item = ITEMS[i]
    setMenu(false)
    setSending(item)
    setPct(0)
    setStatus("waiting")
    setTransfer({ name: item.name, pct: 0, waiting: true, cancel: () => cancel("Mac", item) })
    // Demo pace: big files take longer, but nothing here claims a real speed.
    const duration = item.bytes > 1e9 ? 9000 : 1500
    timer.current = setTimeout(() => {
      setStatus("sending")
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(100, Math.floor(((now - start) / duration) * 100))
        setPct(p)
        setTransfer({ name: item.name, pct: p, cancel: () => cancel("Mac", item) })
        if (p < 100) raf.current = requestAnimationFrame(tick)
        else {
          setTransfer(null)
          setStatus("done")
          push({ title: `Sent ${item.name} to your phone`, body: size(item.bytes) })
        }
      }
      raf.current = requestAnimationFrame(tick)
    }, 600)
  }

  useScene(ref, () => [
    [700, () => setSel(1)],
    [500, () => setMenu(true)],
    [1100, () => send(1)],
  ])

  const chunks = Math.ceil(sending.bytes / MiB)
  const chunk = Math.max(1, Math.round((pct / 100) * chunks))
  const active = status === "waiting" || status === "sending"

  return (
    <div ref={ref} className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_10rem_auto] lg:gap-6">
      {/* The Mac: Photos, with the share menu from the screenshot that started this feature. */}
      <MacWindow
        title="Photos"
        toolbar={
          <div className="relative">
            <button
              type="button"
              aria-label="Share"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="grid size-7 place-items-center rounded-md text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Share className="size-4" />
            </button>
            {status === "idle" && !menu && <Coach className="sm:top-0.5">Share it to your phone</Coach>}
            <AnimatePresence>
              {menu && (
                <motion.ul
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="material absolute top-9 right-0 z-20 w-56 rounded-xl p-1.5 text-[13px] text-foreground"
                  aria-label="Share menu"
                >
                  <li className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">1 item selected</li>
                  {[
                    ["AirDrop", <Wifi key="a" />],
                    ["Mail", <Mail key="m" />],
                    ["Messages", <MessageSquare key="s" />],
                  ].map(([l, icon]) => (
                    <li key={l as string} className="flex items-center gap-2 rounded-md px-2 py-1.5 opacity-45 [&_svg]:size-4">
                      {icon}
                      {l}
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={() => send(sel)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium hover:bg-sent hover:text-white focus-visible:bg-sent focus-visible:text-white focus-visible:outline-none"
                    >
                      <AppIcon className="size-4" />
                      DroidLink
                    </button>
                  </li>
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-1 p-1" role="listbox" aria-label="Photos library">
          {ITEMS.map((it, i) => (
            <button
              key={it.name}
              type="button"
              role="option"
              aria-selected={sel === i}
              onClick={() => setSel(i)}
              onDoubleClick={() => send(i)}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-sent",
                sel === i && "ring-4 ring-sent ring-inset"
              )}
            >
              <Image src={it.src} alt={it.alt} fill sizes="(min-width: 1024px) 280px, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-2 py-1 text-[11px] text-white">
                <span className="flex items-center gap-1 truncate">
                  {it.video && <Play className="size-3 fill-current" />}
                  {it.name}
                </span>
                <span className="tabular-nums">{it.video ?? size(it.bytes)}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {ITEMS[sel].name} · {size(ITEMS[sel].bytes)}
        </p>
      </MacWindow>

      {/* The stream: what actually crosses the Wi‑Fi. */}
      <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
        <div className="relative h-10 w-full max-w-[22rem] overflow-hidden rounded-full bg-foreground/[0.06] lg:max-w-none">
          {active &&
            status === "sending" &&
            Array.from({ length: 6 }, (_, i) => (
              // The wrapper spans the track, so translateX(100%) carries the chunk to its far end.
              <span key={i} className="chunk absolute inset-0" style={{ animationDelay: `${i * 0.27}s` }}>
                <span className="absolute top-1/2 left-0 -mt-3 grid size-6 place-items-center rounded-md bg-sent text-white">
                  <Lock className="size-3" />
                </span>
              </span>
            ))}
          {status === "done" && (
            <span className="absolute inset-0 grid place-items-center text-sm font-medium text-[#248a3d] dark:text-signal">
              <span className="flex items-center gap-1.5"><Check className="size-4" /> SHA‑256 matches</span>
            </span>
          )}
        </div>
        <p className="text-sm tabular-nums">
          {status === "sending" && <>Chunk {chunk.toLocaleString("en")} of {chunks.toLocaleString("en")}</>}
          {status === "waiting" && "Offered to the phone…"}
          {status === "done" && `${chunks.toLocaleString("en")} chunks, all there`}
          {status === "cancelled" && `Cancelled on the ${cancelledBy}`}
          {status === "idle" && "Waiting for a file"}
        </p>
        <p className="text-xs text-muted-foreground">1 MiB each, AES‑256‑GCM</p>
      </div>

      {/* The phone: Android's progress notification, Cancel included. */}
      <div className="justify-self-center lg:scale-[0.9]">
        <Phone label={`Phone showing ${status === "done" ? "the received file" : status === "sending" ? "download progress" : "its lock screen"}`}>
          <div className="relative h-full">
            <Image src="/photos/kedarnath-valley.jpg" alt="" fill sizes="272px" className="object-cover" />
            <div className="absolute inset-0 bg-black/45" />
            <div className="relative flex h-full flex-col items-center px-3 pt-6 text-white">
              <p className="text-[11px] opacity-85">Friday 6 November</p>
              <p className="font-heading text-[54px] leading-none font-semibold tabular-nums">14:32</p>
              <div className="mt-5 w-full space-y-2">
                <AnimatePresence mode="popLayout">
                  {status !== "idle" && (
                    <motion.div
                      key={status === "done" || status === "cancelled" ? "end" : "progress"}
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-[20px] bg-white/90 p-3 text-[11px] text-black dark:bg-[#2b2b2f]/95 dark:text-white"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] opacity-60">
                        {status === "done" ? <Download className="size-3" /> : <Upload className="size-3 rotate-180" />}
                        DroidLink · now
                      </div>
                      <p className="mt-1 truncate font-semibold">{status === "done" ? `Received ${sending.name}` : sending.name}</p>
                      <p className="opacity-75 tabular-nums">
                        {status === "waiting" && "Waiting for Mac…"}
                        {status === "sending" && `From Mac · ${pct}% of ${size(sending.bytes)}`}
                        {status === "done" && "Saved to Downloads"}
                        {status === "cancelled" && (cancelledBy === "Mac" ? "Cancelled on the Mac" : "Cancelled")}
                      </p>
                      {active && (
                        <>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                            <div className="h-full rounded-full bg-sent transition-[width] duration-100" style={{ width: `${pct}%` }} />
                          </div>
                          <button
                            type="button"
                            onClick={() => cancel("phone")}
                            className="pointer-events-auto mt-2 rounded-full px-2 py-1 font-semibold text-sent hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Phone>
      </div>
    </div>
  )
}

