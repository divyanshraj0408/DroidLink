"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUp, Phone as PhoneIcon, RotateCw, SquarePen } from "lucide-react"
import { cn } from "cn"
import { MacWindow } from "@/components/devices"

type Msg = { id: number; body: string; out: boolean }
type Thread = { id: number; name: string; address: string; when: string; msgs: Msg[] }

let nextId = 100
const m = (body: string, out = false): Msg => ({ id: nextId++, body, out })

const START: Thread[] = [
  { id: 1, name: "Mom", address: "+91 98765 43210", when: "2 min ago", msgs: [m("Did you reach?"), m("Yes, just got home", true), m("Call me when you're free")] },
  { id: 2, name: "Rohan Mehta", address: "+91 91234 56780", when: "18 min ago", msgs: [m("Leaving now"), m("Running 10 min late, order for me")] },
  { id: 3, name: "AD-PARCEL", address: "AD-PARCEL", when: "1 hr ago", msgs: [m("Your order #4821 is out for delivery. Track it in the app.")] },
  { id: 4, name: "Khushi", address: "+91 99887 66554", when: "1 day ago", msgs: [m("Booked the table for 8"), m("Perfect, see you there", true)] },
]
const CONTACTS = START.filter((t) => t.address.startsWith("+"))

/** MessagesView: SMS threads on the left, the conversation on the right, ⌘N for a new message. */
export function MessagesScene() {
  const [threads, setThreads] = useState(START)
  const [selected, setSelected] = useState(1)
  const [draft, setDraft] = useState("")
  const [composing, setComposing] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const current = threads.find((t) => t.id === selected)

  const send = (threadId: number, body: string) => {
    const text = body.trim()
    if (!text) return
    setThreads((ts) => {
      const t = ts.find((x) => x.id === threadId)!
      return [{ ...t, when: "now", msgs: [...t.msgs, m(text, true)] }, ...ts.filter((x) => x.id !== threadId)]
    })
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [current?.msgs.length, selected])

  return (
    <MacWindow
      className="w-full"
      title="Messages"
      toolbar={
        <>
          <button type="button" aria-label="Refresh" title="Refresh" className="rounded p-1 hover:bg-foreground/10">
            <RotateCw className="size-4" />
          </button>
          <button type="button" aria-label="New Message" title="New Message (⌘N)" onClick={() => setComposing(true)} className="rounded p-1 hover:bg-foreground/10">
            <SquarePen className="size-4" />
          </button>
          <a href="#calls" aria-label="Call on your phone" title="Call on your phone" className="rounded p-1 hover:bg-foreground/10">
            <PhoneIcon className="size-4" />
          </a>
        </>
      }
    >
      <div
        className="relative grid h-[420px] grid-cols-[minmax(0,1fr)] sm:grid-cols-[230px_minmax(0,1fr)]"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "n") {
            e.preventDefault()
            setComposing(true)
          }
        }}
      >
        <ul className="hidden overflow-y-auto border-r bg-muted/40 p-2 sm:block" aria-label="Conversations">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelected(t.id)}
                aria-current={t.id === selected}
                className={cn(
                  "w-full rounded-md px-2.5 py-1.5 text-left",
                  t.id === selected ? "bg-sent text-white" : "hover:bg-foreground/5"
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span className="flex-1 truncate font-semibold">{t.name}</span>
                  <span className={cn("text-[11px]", t.id === selected ? "text-white/80" : "text-muted-foreground")}>{t.when}</span>
                </span>
                <span className={cn("line-clamp-2 text-xs", t.id === selected ? "text-white/85" : "text-muted-foreground")}>
                  {t.msgs.at(-1)?.body}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {current && (
          <div className="flex min-h-0 flex-col">
            <div className="border-b px-4 py-2">
              <p className="font-semibold">{current.name}</p>
              {current.name !== current.address && <p className="text-[11px] text-muted-foreground">{current.address}</p>}
            </div>
            <div ref={scroller} className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
              <AnimatePresence initial={false}>
                {current.msgs.map((msg) => (
                  <motion.p
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-[7px]",
                      msg.out ? "self-end bg-sent text-white" : "self-start bg-foreground/[0.09]"
                    )}
                  >
                    {msg.body}
                  </motion.p>
                ))}
              </AnimatePresence>
            </div>
            <form
              className="flex items-end gap-2 border-t p-2.5"
              onSubmit={(e) => {
                e.preventDefault()
                send(current.id, draft)
                setDraft("")
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={current.address.startsWith("+") ? "Text message" : "This sender can't receive replies"}
                disabled={!current.address.startsWith("+")}
                aria-label="Text message"
                className="min-w-0 flex-1 bg-transparent py-1 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send"
                className="grid size-6 place-items-center rounded-full bg-sent text-white disabled:bg-muted-foreground/40"
              >
                <ArrowUp className="size-4" strokeWidth={3} />
              </button>
            </form>
          </div>
        )}

        <AnimatePresence>
          {composing && (
            <Compose
              onClose={() => setComposing(false)}
              onSend={(number, text) => {
                const t = threads.find((x) => x.address === number)
                if (t) {
                  send(t.id, text)
                  setSelected(t.id)
                }
                setComposing(false)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </MacWindow>
  )
}

function Compose({ onClose, onSend }: { onClose: () => void; onSend: (number: string, text: string) => void }) {
  const [to, setTo] = useState("")
  const [text, setText] = useState("")
  const q = to.trim().toLowerCase()
  const matches = q ? CONTACTS.filter((c) => c.name.toLowerCase().includes(q) || c.address.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~")) : []
  const number = CONTACTS.find((c) => c.name.toLowerCase() === q)?.address ?? to.trim()
  const known = CONTACTS.some((c) => c.address === number)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 grid place-items-start justify-center bg-black/20 pt-6"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.form
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (known && text.trim()) onSend(number, text)
        }}
        className="flex w-[340px] flex-col gap-3 rounded-xl bg-card p-4 shadow-2xl ring-1 ring-foreground/10"
      >
        <p className="font-semibold">New Message</p>
        <input
          autoFocus
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="To: name or number"
          aria-label="To"
          className="rounded-md bg-background px-2 py-1 ring-1 ring-foreground/15 outline-none focus:ring-2 focus:ring-sent/60"
        />
        {matches.length > 0 && matches[0].address !== to && (
          <div className="rounded-lg bg-foreground/5 p-1.5">
            {matches.map((c) => (
              <button key={c.id} type="button" onClick={() => setTo(c.address)} className="flex w-full justify-between rounded px-1.5 py-1 hover:bg-foreground/5">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.address}</span>
              </button>
            ))}
          </div>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          aria-label="Message"
          className="rounded-md bg-background px-2 py-1 ring-1 ring-foreground/15 outline-none focus:ring-2 focus:ring-sent/60"
        />
        {to.trim() && !known && <p className="text-xs text-muted-foreground">In this demo, pick one of the suggested contacts.</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1 ring-1 ring-foreground/15">
            Cancel
          </button>
          <button type="submit" disabled={!known || !text.trim()} className="rounded-md bg-sent px-3 py-1 font-medium text-white disabled:opacity-40">
            Send
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}
