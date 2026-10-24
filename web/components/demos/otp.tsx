"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Lock, MessageSquare, RotateCcw } from "lucide-react"
import { useBanners } from "@/components/banners"
import { DroidLinkHome, HeadsUp, MacWindow, Phone, Tile } from "@/components/devices"
import { randomCode, useScene } from "@/lib/scene"

const sms = (code: string) => `${code} is your Parcel sign-in code. It expires in 10 minutes. Don't share it.`

/** Hero: an SMS lands on the phone, the code is on the Mac clipboard a moment later, ⌘V signs in. */
export function OtpScene() {
  const ref = useRef<HTMLDivElement>(null)
  const { push, setLastOtp } = useBanners()
  const [code, setCode] = useState("482913")
  const [sms_, setSms] = useState(false)
  const [typed, setTyped] = useState(0)
  const [pasting, setPasting] = useState(false)
  const [done, setDone] = useState(false)

  const replay = useScene(ref, () => {
    const c = randomCode()
    return [
      [0, () => { setCode(c); setTyped(0); setDone(false); setSms(false) }],
      [900, () => setSms(true)],
      [700, () => {
        setLastOtp(c)
        push({ title: `OTP ${c} copied`, body: sms(c) })
      }],
      [1400, () => setPasting(true)],
      [250, () => setTyped(6)],
      [400, () => setPasting(false)],
      [350, () => setDone(true)],
      [2200, () => setSms(false)],
    ]
  })

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[640px] pt-4 pb-6 sm:pb-0">
      <MacWindow
        className="w-full sm:w-[480px]"
        title={
          <span className="flex h-6 w-52 items-center justify-center gap-1 rounded-md bg-background/70 text-xs font-normal">
            <Lock className="size-3" /> parcel.example
          </span>
        }
      >
        <div className="flex h-[300px] flex-col items-center justify-center gap-4 px-6 sm:h-[340px] sm:pr-28">
          <p className="text-center text-[15px] font-semibold">Enter the code we texted you</p>
          <div className="flex gap-1.5" aria-label={done ? `Code ${code} entered` : "Code boxes"}>
            {code.split("").map((d, i) => (
              <span
                key={i}
                className="grid h-11 w-9 place-items-center rounded-lg bg-background text-lg font-semibold tabular-nums ring-1 ring-foreground/15 data-[on=true]:ring-2 data-[on=true]:ring-sent"
                data-on={typed === 0 && i === 0}
              >
                <AnimatePresence>
                  {i < typed && (
                    <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      {d}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            ))}
          </div>
          <div className="h-8">
            <AnimatePresence mode="wait">
              {pasting ? (
                <motion.kbd key="k" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-md bg-foreground/10 px-2 py-1 font-sans text-sm">
                  ⌘V
                </motion.kbd>
              ) : done ? (
                <motion.p key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 font-medium text-[#248a3d] dark:text-signal">
                  <Check className="size-4" /> Signed in
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </MacWindow>

      <div className="absolute -right-2 -bottom-10 hidden origin-bottom-right scale-[0.8] sm:block lg:-right-10">
        <Phone
          label="Android phone running DroidLink, receiving a text with a sign-in code"
          overlay={
            <HeadsUp
              show={sms_}
              app="Messages"
              icon={<Tile color="#34c759" className="size-3.5 rounded-full [&_svg]:size-2"><MessageSquare /></Tile>}
              title="AD-PARCEL"
              text={sms(code)}
            />
          }
        >
          <DroidLinkHome />
        </Phone>
      </div>

      <button
        type="button"
        onClick={replay}
        className="absolute top-14 -left-1 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground sm:-left-10 sm:flex-col sm:text-[11px]"
      >
        <RotateCcw className="size-3.5" />
        Replay
      </button>
    </div>
  )
}
