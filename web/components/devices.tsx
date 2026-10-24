"use client"

import type { ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Battery, Bell, ChevronRight, Clipboard, KeyRound, Laptop, MessageSquare, Phone as PhoneIcon, Signal, SquarePlus, User, Wifi } from "lucide-react"
import { cn } from "cn"
import { AppIcon } from "@/components/glyph"

/** An Android phone: graphite frame, punch-hole camera, status bar. */
export function Phone({ children, overlay, className, label }: { children: ReactNode; overlay?: ReactNode; className?: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative w-[272px] shrink-0 rounded-[46px] bg-[#0d0d0f] p-[9px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45),inset_0_0_0_1.5px_#3a3a3e]", className)}
    >
      <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[38px] bg-[#f2f2f7] text-black dark:bg-black dark:text-white">
        <div className="relative z-20 flex h-8 shrink-0 items-center justify-between px-6 pt-1 text-[11px] font-semibold">
          <span>14:32</span>
          <span className="absolute top-2.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-black ring-2 ring-[#1a1a1a]" />
          <span className="flex items-center gap-1">
            <Wifi className="size-3" strokeWidth={2.5} />
            <Signal className="size-3" strokeWidth={2.5} />
            <span className="rounded-[3px] bg-signal px-0.5 text-[8px] leading-[11px] text-black">65</span>
          </span>
        </div>
        <div className="relative min-h-0 flex-1">{children}</div>
        <div className="mx-auto mb-1.5 h-1 w-24 shrink-0 rounded-full bg-current opacity-80" />
        <div className="pointer-events-none absolute inset-x-2 top-9 z-30">{overlay}</div>
      </div>
    </div>
  )
}

/** Android's heads-up notification card, sliding down from the status bar. */
export function HeadsUp({ show, app, icon, title, text }: { show: boolean; app: string; icon: ReactNode; title: string; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="rounded-[22px] bg-white p-3 text-[11px] shadow-lg ring-1 ring-black/5 dark:bg-[#2b2b2f]"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-black/55 dark:text-white/60">
            {icon}
            <span>{app}</span>
            <span>· now</span>
          </div>
          <p className="mt-1 font-semibold">{title}</p>
          <p className="text-black/75 dark:text-white/75">{text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A macOS window: traffic lights, title, optional toolbar content. */
export function MacWindow({
  title,
  toolbar,
  children,
  className,
}: {
  title?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card text-[13px] text-card-foreground shadow-[0_0_0_0.5px_rgb(0_0_0/0.25),0_24px_50px_-16px_rgb(0_0_0/0.35)]", className)}>
      <div className="flex h-10 items-center gap-3 border-b bg-muted/60 px-3.5">
        <span className="flex gap-2" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        {title && <span className="min-w-0 truncate font-semibold">{title}</span>}
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">{toolbar}</div>
      </div>
      {children}
    </div>
  )
}

/** Colored icon tile, as in the phone app's settings rows. */
export function Tile({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-[7px] text-white [&_svg]:size-3.5", className)} style={{ background: color }}>
      {children}
    </span>
  )
}

const ROWS = [
  { icon: <Bell />, color: "#ff3b30", label: "Notifications" },
  { icon: <KeyRound />, color: "#8e8e93", label: "OTP Autofill" },
  { icon: <MessageSquare />, color: "#34c759", label: "Messages" },
  { icon: <PhoneIcon />, color: "#34c759", label: "Calls" },
  { icon: <User />, color: "#ff9500", label: "Contact Names" },
]

/** The DroidLink phone app's main screen (MainActivity), iOS-Settings style. */
export function DroidLinkHome({ onSendClipboard, flash }: { onSendClipboard?: () => void; flash?: boolean }) {
  const group = "overflow-hidden rounded-xl bg-white dark:bg-[#1c1c1e]"
  const row = "flex items-center gap-2.5 px-3 py-2 [&+&]:border-t [&+&]:border-black/10 dark:[&+&]:border-white/10"
  const caption = "mt-3.5 mb-1 px-3 text-[9.5px] text-black/45 dark:text-white/50"
  return (
    <div className="h-full overflow-hidden px-3 text-[12px]">
      <p className="mt-1 mb-2.5 text-[25px] font-bold tracking-tight">DroidLink</p>
      <div className={cn(group, "flex items-center gap-2.5 p-2.5")}>
        <AppIcon className="size-11" />
        <div className="flex-1">
          <p className="text-[14px] font-semibold">Connected</p>
          <p className="text-[10.5px] text-black/50 dark:text-white/55">Mac at 192.168.1.24</p>
        </div>
        <span className="size-2 rounded-full bg-signal" />
      </div>

      <p className={caption}>ON YOUR MAC</p>
      <div className={group}>
        {ROWS.map((r) => (
          <div key={r.label} className={row}>
            <Tile color={r.color}>{r.icon}</Tile>
            <span className="flex-1">{r.label}</span>
            <span className="text-black/45 dark:text-white/50">On</span>
          </div>
        ))}
      </div>

      <p className={caption}>CLIPBOARD</p>
      <div className={group}>
        <button
          type="button"
          onClick={onSendClipboard}
          disabled={!onSendClipboard}
          className={cn(row, "w-full text-left transition-colors enabled:hover:bg-black/5 dark:enabled:hover:bg-white/5", flash && "bg-black/10 dark:bg-white/10")}
        >
          <Tile color="#007aff"><Clipboard /></Tile>
          <span className="flex-1">Send Clipboard to Mac</span>
          <ChevronRight className="size-3.5 opacity-40" />
        </button>
        <div className={row}>
          <Tile color="#5856d6"><SquarePlus /></Tile>
          <span className="flex-1">Add Quick Settings Tile</span>
          <ChevronRight className="size-3.5 opacity-40" />
        </div>
      </div>

      <p className={caption}>SYSTEM</p>
      <div className={group}>
        <div className={row}>
          <Tile color="#30b0c7"><Battery /></Tile>
          <span className="flex-1">Run in Background</span>
          <span className="text-black/45 dark:text-white/50">On</span>
        </div>
        <div className={row}>
          <Tile color="#007aff"><Laptop /></Tile>
          <span className="flex-1">Pair with a Mac</span>
          <ChevronRight className="size-3.5 opacity-40" />
        </div>
      </div>
    </div>
  )
}
