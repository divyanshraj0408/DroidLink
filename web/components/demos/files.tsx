"use client"

import { useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import { Bluetooth, Copy, FileText, ImageIcon, MessageSquare } from "lucide-react"
import { useBanners } from "@/components/banners"
import { AppIcon } from "@/components/glyph"
import { DroidLinkHome, MacWindow, Phone, Tile } from "@/components/devices"
import { PHONE } from "@/lib/site"

const PHOTOS = ["IMG_20261024_1932.jpg", "IMG_20261024_1934.jpg", "IMG_20261024_1941.jpg"]

/** Share → Send to Mac on the phone; the file lands in ~/Downloads with a banner. */
export function FilesScene() {
  const { push } = useBanners()
  const [files, setFiles] = useState([
    { name: "boarding-pass.pdf", size: "212 KB", when: "Yesterday" },
    { name: "rent-receipt-oct.pdf", size: "88 KB", when: "Oct 2" },
  ])
  const [sent, setSent] = useState(0)

  const send = () => {
    const base = PHOTOS[sent % PHOTOS.length]
    const name = sent >= PHOTOS.length ? `${Math.floor(sent / PHOTOS.length) + 1}-${base}` : base // downloadURL() numbering
    setSent((n) => n + 1)
    setTimeout(() => {
      setFiles((f) => [{ name, size: "3.1 MB", when: "Just now" }, ...f].slice(0, 5))
      push({ title: `Received ${name}`, body: "Saved to Downloads" })
    }, 500)
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <Phone label="Phone share sheet with a Send to Mac option">
        <div className="relative h-full">
          <Image src="/photos/kedarnath-peak.jpg" alt="The photo being shared: a snow-covered peak above Kedarnath" fill sizes="272px" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-[#f2f2f7] p-3 pb-4 text-[11px] text-black dark:bg-[#1c1c1e] dark:text-white">
            <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-black/20 dark:bg-white/25" />
            <div className="flex items-center gap-2">
              <span className="relative size-10 overflow-hidden rounded-lg">
                <Image src="/photos/kedarnath-peak.jpg" alt="" fill sizes="40px" className="object-cover" />
              </span>
              <span>
                <span className="block font-semibold">1 photo</span>
                <span className="opacity-60">3.1 MB</span>
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1 text-center text-[9.5px]">
              <button type="button" onClick={send} className="group flex flex-col items-center gap-1 rounded-lg p-1 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-sent focus-visible:outline-none dark:hover:bg-white/10">
                <AppIcon className="size-10 transition-transform group-active:scale-90" />
                Send to Mac
              </button>
              {[
                ["Messages", "#34c759", <MessageSquare key="m" />],
                ["Bluetooth", "#007aff", <Bluetooth key="b" />],
                ["Copy", "#8e8e93", <Copy key="c" />],
              ].map(([l, c, i]) => (
                <span key={l as string} className="flex flex-col items-center gap-1 p-1 opacity-60">
                  <Tile color={c as string} className="size-10 rounded-[11px] [&_svg]:size-5">{i}</Tile>
                  {l}
                </span>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] opacity-60">Tap “Send to Mac”</p>
          </div>
        </div>
      </Phone>

      <div className="flex w-full max-w-[420px] flex-col gap-5">
        <MacWindow title="Downloads">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-1.5 text-[11px] text-muted-foreground">
            <span>Name</span><span>Size</span><span className="w-16">Date Added</span>
          </div>
          <ul className="h-[176px] overflow-hidden px-2 py-1">
            <AnimatePresence initial={false}>
              {files.map((f, i) => (
                <motion.li
                  key={f.name}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded px-2 py-1 ${i % 2 ? "" : "bg-foreground/[0.03]"}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {f.name.endsWith(".pdf") ? <FileText className="size-4 shrink-0 text-decline" /> : <ImageIcon className="size-4 shrink-0 text-sent" />}
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">{f.size}</span>
                  <span className="w-16 text-muted-foreground">{f.when}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </MacWindow>

        <MacWindow title={PHONE} className="mx-auto w-[250px]">
          <div className="h-[300px] overflow-hidden bg-[#f2f2f7] pt-2 text-black dark:bg-black dark:text-white">
            <div className="origin-top-left scale-[0.78] [width:128%]" aria-hidden>
              <DroidLinkHome />
            </div>
          </div>
        </MacWindow>
      </div>
    </div>
  )
}
