"use client"

import { useEffect, useState } from "react"
import { Wifi } from "lucide-react"
import { Chain } from "@/components/glyph"
import { useBanners } from "@/components/banners"
import { REPO, PHONE } from "@/lib/site"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const LINKS = [
  ["Features", "#features"],
  ["Privacy", "#privacy"],
  ["Set up", "#setup"],
] as const

/** The page's nav, drawn as the macOS menu bar with DroidLink's status item in it. */
export function MenuBar() {
  const { lastOtp, recent } = useBanners()
  const go = (hash: string) => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" })

  return (
    <header className="material sticky top-0 z-50 flex h-8 items-center gap-1 px-2 text-[13px] !shadow-[0_0.5px_0_var(--material-line)]">
      <a href="#top" className="flex items-center gap-1.5 rounded px-2 py-0.5 font-bold hover:bg-foreground/10">
        <Chain className="size-3.5" />
        DroidLink
      </a>
      <nav aria-label="Sections" className="hidden sm:flex">
        {LINKS.map(([label, href]) => (
          <a key={href} href={href} className="rounded px-2 py-0.5 hover:bg-foreground/10">
            {label}
          </a>
        ))}
        <a href={REPO} className="rounded px-2 py-0.5 hover:bg-foreground/10">
          GitHub
        </a>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="DroidLink menu"
            className="grid h-6 w-7 place-items-center rounded hover:bg-foreground/10 data-popup-open:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Chain className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="material w-72 rounded-xl border-0 !bg-material p-1.5 text-[13px] ring-0"
          >
            <DropdownMenuLabel className="text-[13px] font-normal text-muted-foreground">
              Connected to {PHONE}
            </DropdownMenuLabel>
            {lastOtp && (
              <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(lastOtp)} className="text-[13px]">
                Copy Last OTP: {lastOtp}
              </DropdownMenuItem>
            )}
            {recent.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {recent.map((r, i) => (
                  <DropdownMenuItem
                    key={i}
                    onClick={() => navigator.clipboard?.writeText(r.text)}
                    className="block truncate text-[13px]"
                  >
                    {r.line} — {r.text}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("#messages")} className="text-[13px]">Messages…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("#calls")} className="text-[13px]">Keypad…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("#files")} className="text-[13px]">Send File to Phone…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("#files")} className="text-[13px]">Phone Camera</DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("#files")} className="text-[13px]">Mirror Phone Screen</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("#setup")} className="text-[13px]">Pair Phone…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Wifi className="mx-1.5 size-4" aria-hidden />
        <Clock />
      </div>
    </header>
  )
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    const first = setTimeout(tick, 0)
    const t = setInterval(tick, 15_000)
    return () => (clearTimeout(first), clearInterval(t))
  }, [])
  // Rendered after mount only, so server and client HTML agree.
  if (!now) return <span className="w-12 sm:w-28" />
  return (
    <time className="px-1.5 tabular-nums">
      <span className="hidden sm:inline">{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} </span>
      {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
    </time>
  )
}
