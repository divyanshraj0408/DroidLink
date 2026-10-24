import type { ReactNode } from "react"
import { Laptop, Lock, Smartphone } from "lucide-react"
import { cn } from "cn"
import { AppIcon, Chain } from "@/components/glyph"
import { MenuBar } from "@/components/menu-bar"
import { REPO, SETUP_GUIDE } from "@/lib/site"
import { Setup } from "@/components/setup"
import { buttonVariants } from "@/components/ui/button"
import { TextureButton } from "@/components/ui/texture-button"
import { CallsScene } from "@/components/demos/calls"
import { ClipboardScene } from "@/components/demos/clipboard"
import { FilesScene } from "@/components/demos/files"
import { MessagesScene } from "@/components/demos/messages"
import { NotifyScene } from "@/components/demos/notify"
import { OtpScene } from "@/components/demos/otp"

export default function Home() {
  return (
    <>
      <MenuBar />
      <main id="top" className="overflow-x-clip">
        <Hero />
        <div id="features" className="mx-auto max-w-6xl space-y-32 px-4 py-24 sm:space-y-40 sm:px-6 sm:py-32">
          <Feature
            title="Reply without picking up your phone"
            demo={<NotifyScene />}
            hint="Try it: hover the banner in the top-right corner of this page and click Reply."
          >
            Notifications from your phone show up as Mac banners. For chats like WhatsApp, click Reply on the banner and type.
            The answer goes out from your phone, as if you’d typed it there.
          </Feature>

          <Feature id="calls" title="Take calls at your desk" demo={<CallsScene />} flip hint="Accept or decline from the card in the corner, or dial someone on the keypad.">
            When your phone rings, a card slides into the corner of your Mac with Accept and Decline. Dial from the keypad or
            from a conversation in Messages. The audio stays on the phone, so keep it close or wear earbuds.
          </Feature>

          <Feature id="messages" title="Text from a real keyboard" demo={<MessagesScene />} wide hint="Pick a conversation and send something, or press ⌘N.">
            Your SMS conversations with their history, in a Mac window. Reply, start new ones with ⌘N, and pick people from
            your contacts. RCS chats live inside Google Messages, so answer those from the banner.
          </Feature>

          <Feature title="Copy on one, paste on the other" demo={<ClipboardScene />} wide>
            Whatever you copy on the Mac is on your phone a moment later. The other way takes a tap, because Android only lets
            an app read the clipboard while it’s open: use the Quick Settings tile, the button in the app, or Share → Send to
            Mac. Copies made by password managers never leave the Mac.
          </Feature>

          <Feature id="files" title="Send files and see your phone" demo={<FilesScene />} hint="Tap “Send to Mac” on the phone.">
            Share anything to “Send to Mac” and it lands in Downloads. From the Mac, Send File to Phone… puts it in the
            phone’s Downloads. Up to 50 MB each. With scrcpy installed, the menu also opens the phone’s camera or a live
            mirror of its screen in a Mac window.
          </Feature>
        </div>

        <Privacy />

        <section id="setup" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Set it up</h2>
          <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">
            DroidLink is open source: you build both apps from the{" "}
            <a href={REPO} className="text-foreground underline underline-offset-4">
              code on GitHub
            </a>
            , and the steps below install everything it needs. It takes about 15 minutes. You’ll need a Mac on macOS 14 or
            later, a phone on Android 14 or later on the same Wi‑Fi, and a USB cable for the first install. The{" "}
            <a href={SETUP_GUIDE} className="text-foreground underline underline-offset-4">
              full guide
            </a>{" "}
            also covers troubleshooting.
          </p>
          <div className="mt-6 mb-12 flex flex-wrap items-center gap-x-4 gap-y-2">
            <TextureButton href={REPO} className="w-auto">
              View on GitHub
            </TextureButton>
            <code className="font-mono text-sm text-muted-foreground">github.com/divyanshraj0408/DroidLink</code>
          </div>
          <Setup />

          <div className="mt-20 max-w-[60ch]">
            <h3 className="font-heading text-xl font-semibold">Not there yet</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>Call audio on the Mac. Android doesn’t let apps carry call audio.</li>
              <li>Speaker and mute from the Mac.</li>
              <li>Photos in Messages (MMS).</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <AppIcon className="size-7" />
          <span className="font-medium text-foreground">DroidLink</span>
          <span>Free and open source.</span>
          <a href={REPO} className="ml-auto underline underline-offset-4 hover:text-foreground">
            Source on GitHub
          </a>
        </div>
      </footer>
    </>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pt-24">
      <div>
        <h1 className="font-heading text-[clamp(3.2rem,11vw,5.6rem)] leading-[0.95] whitespace-nowrap font-bold tracking-[-0.035em]">
          <span className="block">Android</span>
          <span className="flex items-center gap-[0.12em]">
            <Chain className="size-[0.82em] shrink-0 text-muted-foreground" title="linked to" />
            your Mac
          </span>
        </h1>
        <p className="mt-8 max-w-[34ch] text-xl leading-relaxed text-foreground/85">
          Codes from texts paste themselves. Notifications become Mac banners you can reply to. Calls ring at your desk, and
          texts, clipboard and files move both ways.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#setup" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-[15px]")}>
            Set it up
          </a>
          <TextureButton href={REPO} size="lg" className="w-auto">
            View on GitHub
          </TextureButton>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">Free, open source, and nothing leaves your Wi‑Fi.</p>
      </div>
      <OtpScene />
    </section>
  )
}

function Feature({
  id,
  title,
  children,
  demo,
  hint,
  flip,
  wide,
}: {
  id?: string
  title: string
  children: ReactNode
  demo: ReactNode
  hint?: string
  flip?: boolean
  wide?: boolean
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] items-center gap-10",
        !wide && "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16",
        flip && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
      )}
    >
      <div className={cn(flip && "lg:order-last", wide && "max-w-[62ch]")}>
        <h2 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-[2.75rem] sm:leading-[1.05]">{title}</h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{children}</p>
        {hint && <p className="mt-5 border-l-2 border-foreground/20 pl-3 text-sm text-foreground/80">{hint}</p>}
      </div>
      <div>{demo}</div>
    </section>
  )
}

function Privacy() {
  const facts = [
    ["No account, no cloud", "Your phone talks straight to your Mac over the local network. There’s no server in between."],
    ["Encrypted", "Every message between them is sealed with AES‑256‑GCM."],
    ["One key, shown once", "The Mac makes a 256‑bit key and only ever shows it inside the pairing QR code. Anything that doesn’t decrypt with it is dropped."],
    ["Open source", "Every line is on GitHub, the Mac app in Swift and the phone app in Java."],
  ]
  return (
    <section id="privacy" className="bg-graphite text-[#ecedef]">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Stays on your Wi‑Fi</h2>
          <dl className="mt-10 space-y-6">
            {facts.map(([t, d]) => (
              <div key={t}>
                <dt className="font-semibold">{t}</dt>
                <dd className="mt-1 max-w-[52ch] text-[#a9acb3]">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <figure aria-label="Your phone and Mac talk directly over your Wi‑Fi, encrypted with a key from the pairing QR code" className="rounded-3xl border border-dashed border-white/20 p-6 sm:p-10">
          <figcaption className="text-sm text-[#a9acb3]">Your Wi‑Fi</figcaption>
          <div className="mt-8 flex items-center gap-3 sm:gap-5">
            <Device icon={<Smartphone />} label="Phone" />
            <div className="relative flex-1">
              <div className="h-px bg-gradient-to-r from-white/10 via-white/50 to-white/10" />
              <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-graphite px-3 py-1 text-xs whitespace-nowrap ring-1 ring-white/20">
                <Lock className="size-3" /> AES‑256‑GCM
              </span>
            </div>
            <Device icon={<Laptop />} label="Mac" />
          </div>
          <p className="mt-10 text-sm text-[#a9acb3]">Port 47821, on your network only. Off your Wi‑Fi? Plug in a USB cable and it runs over adb instead.</p>
        </figure>
      </div>
    </section>
  )
}

function Device({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex flex-col items-center gap-2 text-sm">
      <span className="grid size-16 place-items-center rounded-2xl bg-white/[0.07] ring-1 ring-white/15 [&_svg]:size-7">{icon}</span>
      {label}
    </span>
  )
}
