"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, MessageCircle } from "lucide-react"
import { useBanners } from "@/components/banners"
import { HeadsUp, Phone, Tile } from "@/components/devices"
import { Button } from "@/components/ui/button"
import { useScene } from "@/lib/scene"

type Msg = { id: number; text: string; out: boolean }

const INCOMING = [
  "Are we still on for dinner at 8?",
  "Also, can you bring the charger I left at yours?",
  "Booked the table. See you there!",
]

/** A chat notification on the phone shows up as a Mac banner; the reply typed there lands in the chat. */
export function NotifyScene() {
  const ref = useRef<HTMLDivElement>(null)
  const { push } = useBanners()
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, text: "Leaving office now", out: true }])
  const [heads, setHeads] = useState<string | null>(null)
  const [next, setNext] = useState(0)
  const id = useRef(1)

  const add = (text: string, out: boolean) => setMsgs((m) => [...m, { id: id.current++, text, out }].slice(-6))

  const arrive = () => {
    const text = INCOMING[next % INCOMING.length]
    setNext((n) => n + 1)
    add(text, false)
    setHeads(text)
    setTimeout(() => setHeads(null), 2600)
    push({ title: "WhatsApp · Khushi", body: text, onReply: (r) => add(r, true), duration: 12000 })
  }

  useScene(ref, () => [[600, arrive]])

  return (
    <div ref={ref} className="flex flex-col items-center gap-5">
      <Phone
        label="Phone showing a WhatsApp chat with Khushi"
        overlay={
          <HeadsUp
            show={heads !== null}
            app="WhatsApp"
            icon={<Tile color="#25d366" className="size-3.5 rounded-full [&_svg]:size-2"><MessageCircle /></Tile>}
            title="Khushi"
            text={heads ?? ""}
          />
        }
      >
        <div className="flex h-full flex-col bg-[#efeae2] text-[12px] dark:bg-[#0b141a]">
          <div className="flex items-center gap-2 bg-white px-2 py-2 dark:bg-[#1f2c34]">
            <ChevronLeft className="size-4" />
            <span className="grid size-7 place-items-center rounded-full bg-[#ff9500] text-[11px] font-semibold text-white">K</span>
            <span className="font-semibold">Khushi</span>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-1.5 p-2.5">
            <AnimatePresence initial={false}>
              {msgs.map((m) => (
                <motion.p
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={
                    m.out
                      ? "max-w-[80%] self-end rounded-lg rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 dark:bg-[#005c4b]"
                      : "max-w-[80%] self-start rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5 dark:bg-[#1f2c34]"
                  }
                >
                  {m.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Phone>
      <Button variant="outline" onClick={arrive}>
        Get a message from Khushi
      </Button>
    </div>
  )
}
