"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight, Clipboard, KeyRound } from "lucide-react"
import { DroidLinkHome, MacWindow, Phone, Tile } from "@/components/devices"
import { Button } from "@/components/ui/button"

const MAC_TEXT = "Flat 4B, Palm Grove Apartments, Indiranagar"
const PHONE_TEXT = "https://maps.example/table-for-two"

type Hop = { dir: "toPhone" | "toMac"; text: string; key: number } | null

/** Copy on the Mac, it's on the phone; send from the phone, paste on the Mac. Password copies stay put. */
export function ClipboardScene() {
  const [hop, setHop] = useState<Hop>(null)
  const [notes, setNotes] = useState<string[]>(["Dinner Friday", MAC_TEXT])
  const [phoneClip, setPhoneClip] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const key = useRef(0)

  const toPhone = () => {
    setSkipped(false)
    setHop({ dir: "toPhone", text: MAC_TEXT, key: key.current++ })
    setTimeout(() => setPhoneClip(MAC_TEXT), 700)
    setTimeout(() => setPhoneClip(null), 3600)
  }
  const toMac = () => {
    setSkipped(false)
    setFlash(true)
    setTimeout(() => setFlash(false), 250)
    setHop({ dir: "toMac", text: PHONE_TEXT, key: key.current++ })
    setTimeout(() => setNotes((n) => [...n.filter((l) => l !== PHONE_TEXT), PHONE_TEXT]), 900)
  }
  const password = () => {
    setHop(null)
    setSkipped(true)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-center lg:gap-0">
        <MacWindow className="w-full max-w-[380px]" title="Notes">
          <div className="h-[220px] space-y-1.5 p-4 text-[14px]">
            <AnimatePresence initial={false}>
              {notes.map((l, i) => (
                <motion.p
                  key={l}
                  initial={{ opacity: 0, backgroundColor: "rgba(0,122,255,0.25)" }}
                  animate={{ opacity: 1, backgroundColor: "rgba(0,122,255,0)" }}
                  transition={{ backgroundColor: { duration: 1.2 } }}
                  className={i === 0 ? "font-semibold" : "break-all rounded"}
                >
                  {l === MAC_TEXT ? <mark className="rounded bg-sent/20 text-inherit">{l}</mark> : l}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </MacWindow>

        <div className="relative flex h-14 w-full max-w-[380px] items-center justify-center lg:h-auto lg:w-40" aria-live="polite">
          <AnimatePresence mode="wait">
            {hop && (
              <motion.span
                key={hop.key}
                initial={{ opacity: 0, x: hop.dir === "toPhone" ? -40 : 40 }}
                animate={{ opacity: [0, 1, 1, 0], x: hop.dir === "toPhone" ? [-40, 0, 20, 40] : [40, 0, -20, -40] }}
                transition={{ duration: 1.1, times: [0, 0.25, 0.75, 1] }}
                className="flex max-w-36 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] text-primary-foreground shadow"
              >
                {hop.dir === "toMac" && <ArrowLeft className="size-3 shrink-0" />}
                <span className="truncate">{hop.text}</span>
                {hop.dir === "toPhone" && <ArrowRight className="size-3 shrink-0" />}
              </motion.span>
            )}
            {skipped && (
              <motion.span key="skip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-center text-xs text-muted-foreground">
                <KeyRound className="size-3.5" /> Password stays on the Mac
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:-my-11 lg:scale-[0.85]">
          <Phone
            label="Phone running DroidLink, with a Send Clipboard to Mac button"
            overlay={
              <AnimatePresence>
                {phoneClip && (
                  <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    className="flex items-center gap-2 rounded-2xl bg-white p-2.5 text-[11px] shadow-lg ring-1 ring-black/5 dark:bg-[#2b2b2f]"
                  >
                    <Tile color="#007aff"><Clipboard /></Tile>
                    <span className="min-w-0">
                      <span className="block font-semibold">Copied from Mac</span>
                      <span className="block truncate opacity-70">{phoneClip}</span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            }
          >
            <DroidLinkHome onSendClipboard={toMac} flash={flash} />
          </Phone>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={toPhone}>Copy the address on the Mac</Button>
        <Button variant="outline" onClick={toMac}>Send the link from the phone</Button>
        <Button variant="ghost" onClick={password}>
          <KeyRound /> Copy a password on the Mac
        </Button>
      </div>
    </div>
  )
}
