import type { CSSProperties, ReactNode } from "react"
import { Bell, ChevronDown, Clipboard, FolderUp, KeyRound, Laptop, Lock, MessageSquare, MonitorSmartphone, Phone as PhoneIcon, Smartphone } from "lucide-react"
import { cn } from "cn"
import { AppIcon, Chain } from "@/components/glyph"
import { MenuBar } from "@/components/menu-bar"
import { Reveals } from "@/components/reveals"
import { Tile } from "@/components/devices"
import { DESCRIPTION, FAQ, NAME, REPO, SETUP_GUIDE, SITE_URL } from "@/lib/site"
import { Setup } from "@/components/setup"
import { buttonVariants } from "@/components/ui/button"
import { TextureButton } from "@/components/ui/texture-button"
import { BigFilesScene } from "@/components/demos/big-files"
import { CallsScene } from "@/components/demos/calls"
import { ClipboardScene } from "@/components/demos/clipboard"
import { FilesScene } from "@/components/demos/files"
import { MessagesScene } from "@/components/demos/messages"
import { NotifyScene } from "@/components/demos/notify"
import { OtpScene } from "@/components/demos/otp"

/** Entrance order within a section: heading, text, hint, then the demo. */
const r = (i: number) => ({ "data-reveal": "", style: { "--i": i } as CSSProperties })

// What the search result says this page is: the app, and the questions answered on it.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: NAME,
    description: DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/icon.png`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS 14 or later, Android 14 or later",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isAccessibleForFree: true,
    downloadUrl: REPO,
    sameAs: [REPO],
    author: { "@type": "Person", name: "Divyansh Raj", url: "https://github.com/divyanshraj0408" },
    featureList: [
      "OTP codes from SMS copied to the Mac clipboard",
      "Android notifications as Mac banners with reply",
      "Answer, decline and dial phone calls from the Mac",
      "SMS conversations in a Mac window",
      "Clipboard sync both ways",
      "Send files of any size both ways, encrypted, with progress and SHA-256 check",
      "Phone camera and screen mirroring with scrcpy",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
]

const FEATURES = [
  ["Codes", "#top", "#8e8e93", <KeyRound key="k" />],
  ["Notifications", "#notifications", "#ff3b30", <Bell key="b" />],
  ["Calls", "#calls", "#34c759", <PhoneIcon key="p" />],
  ["Messages", "#messages", "#34c759", <MessageSquare key="m" />],
  ["Clipboard", "#clipboard", "#0068d9", <Clipboard key="c" />],
  ["Files of any size", "#any-size", "#5856d6", <FolderUp key="f" />],
  ["Camera and mirroring", "#files", "#30b0c7", <MonitorSmartphone key="s" />],
] as const

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MenuBar />
      <Reveals />
      <main id="top" className="overflow-x-clip">
        <Hero />

        <nav aria-label="Features" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
          <ul className="flex flex-wrap gap-2">
            {FEATURES.map(([label, href, color, icon], i) => (
              <li key={label} {...r(i)}>
                <a
                  href={href}
                  className="flex items-center gap-2 rounded-full bg-card py-1.5 pr-4 pl-1.5 text-[15px] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Tile color={color} className="size-7 rounded-full [&_svg]:size-3.5">{icon}</Tile>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div id="features" className="mx-auto max-w-6xl space-y-36 px-4 py-28 sm:space-y-48 sm:px-6 sm:py-36">
          <Feature id="notifications" title="Reply from your Mac" demo={<NotifyScene />} hint="Try it: click Reply on the banner in the top-right corner of this page.">
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

          <Feature id="clipboard" title="Copy on one, paste on the other" demo={<ClipboardScene />} wide>
            Whatever you copy on the Mac is on your phone a moment later. The other way takes a tap, because Android only lets
            an app read the clipboard while it’s open: use the Quick Settings tile, the button in the app, or Share → Send to
            Mac. Copies made by password managers never leave the Mac.
          </Feature>

          <Feature
            id="any-size"
            title="Send files of any size"
            demo={<BigFilesScene />}
            wide
            hint="Share the 4.2 GB video, watch the menu bar at the top of this page, or cancel it from the phone halfway."
          >
            Pick photos in Photos or files in Finder, choose Share → DroidLink, and they land in your phone’s Downloads. A
            20 GB video goes the same way as a photo: it streams straight from disk in encrypted 1 MiB chunks over its own
            connection, with progress in the menu bar, Cancel on both sides and a SHA‑256 check at the end.
          </Feature>

          <Feature id="files" title="From your phone to your Mac" demo={<FilesScene />} hint="Tap “Send to Mac” on the phone.">
            On the phone, Share → Send to Mac puts any file, at any size, in your Mac’s Downloads. With scrcpy installed, the
            menu also opens the phone’s camera or a live mirror of its screen in a Mac window.
          </Feature>
        </div>

        <Privacy />

        <section id="setup" className="mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36">
          <h2 {...r(0)} className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
            Set it up
          </h2>
          <p {...r(1)} className="mt-5 max-w-[60ch] text-lg leading-relaxed">
            DroidLink is open source: you build both apps from the{" "}
            <a href={REPO} className="underline underline-offset-4">
              code on GitHub
            </a>
            , and the steps below install everything it needs. It takes about 15 minutes. You’ll need a Mac on macOS 14 or
            later, a phone on Android 14 or later on the same Wi‑Fi, and a USB cable for the first install. The{" "}
            <a href={SETUP_GUIDE} className="underline underline-offset-4">
              full guide
            </a>{" "}
            also covers troubleshooting.
          </p>
          <div {...r(2)} className="mt-7 mb-14 flex flex-wrap items-center gap-x-4 gap-y-2">
            <TextureButton href={REPO} className="w-auto">
              View on GitHub
            </TextureButton>
            <span className="text-sm text-muted-foreground">github.com/divyanshraj0408/DroidLink</span>
          </div>
          <div {...r(3)}>
            <Setup />
          </div>
        </section>

        <Faq />
      </main>

      <footer className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <AppIcon className="size-12" />
            <p className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">DroidLink</p>
            <a href={REPO} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "ml-auto h-11 px-5 text-[15px]")}>
              Source on GitHub
            </a>
          </div>
          <p className="mt-6 max-w-[60ch]">Free and open source. Your Android phone and your Mac, on your own Wi‑Fi.</p>
          <p className="mt-8 max-w-[90ch] text-[13px] text-muted-foreground">
            Photos:{" "}
            <a className="underline" href="https://commons.wikimedia.org/w/index.php?curid=7727613">“Kedarnath1”</a> by Bikingdiaries,{" "}
            <a className="underline" href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>;{" "}
            <a className="underline" href="https://commons.wikimedia.org/w/index.php?curid=134682226">“Mountains in snow, Mountain lake, Chola Valley, Nepal, Himalayas”</a> by Vyacheslav Argenberg,{" "}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, both via Wikimedia Commons;{" "}
            <a className="underline" href="https://wordpress.org/photos/photo/89267570ca/">“A scenic view from Kedarnath Valley”</a> by Shweta Yadav and{" "}
            <a className="underline" href="https://wordpress.org/photos/photo/80866ecf01/">a bridge in Rudraprayag</a> by Krupa Nanda, CC0, via the WordPress Photo Directory.
          </p>
        </div>
      </footer>
    </>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pt-24">
      <div>
        <h1 className="font-heading text-[clamp(3.2rem,11vw,5.6rem)] leading-[0.95] font-bold tracking-[-0.035em] whitespace-nowrap">
          <span className="block">Android</span>
          <span className="flex items-center gap-[0.12em]">
            <Chain className="size-[0.82em] shrink-0 text-muted-foreground" title="linked to" />
            your Mac
          </span>
        </h1>
        <p className="mt-8 max-w-[34ch] text-xl leading-relaxed">
          Codes from texts paste themselves. Notifications become Mac banners you can reply to. Calls ring at your desk, and
          texts, clipboard and files of any size move both ways.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#setup" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-[15px] transition-transform active:scale-[0.97]")}>
            Set it up
          </a>
          <TextureButton href={REPO} size="lg" className="w-auto transition-transform active:scale-[0.97]">
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
  id: string
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
      aria-labelledby={`${id}-title`}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] items-center gap-12",
        !wide && "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16",
        flip && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
      )}
    >
      <div className={cn(flip && "lg:order-last", wide && "grid gap-x-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-end")}>
        <h2 id={`${id}-title`} {...r(0)} className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.02]">
          {title}
        </h2>
        <div>
          <p {...r(1)} className="mt-5 text-lg leading-relaxed">
            {children}
          </p>
          {hint && (
            <p {...r(2)} className="mt-5 rounded-lg bg-card px-4 py-3 text-[15px] text-foreground/85">
              {hint}
            </p>
          )}
        </div>
      </div>
      <div {...r(3)}>{demo}</div>
    </section>
  )
}

function Privacy() {
  const facts = [
    ["No account, no cloud", "Your phone talks straight to your Mac over the local network. There’s no server in between."],
    ["Encrypted end to end", "Every message and every 1 MiB chunk of every file is sealed with AES‑256‑GCM, and each file is checked with SHA‑256 when it lands."],
    ["One key, shown once", "The Mac makes a 256‑bit key and only ever shows it inside the pairing QR code. Anything that doesn’t decrypt with it is dropped."],
    ["Open source", "Every line is on GitHub, the Mac app in Swift and the phone app in Java."],
  ]
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="bg-graphite text-[#ecedef]">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-28 sm:px-6 sm:py-36 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="privacy-title" {...r(0)} className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
            Stays on your Wi‑Fi
          </h2>
          <dl className="mt-10 space-y-7">
            {facts.map(([t, d], i) => (
              <div key={t} {...r(i + 1)}>
                <dt className="text-lg font-semibold">{t}</dt>
                <dd className="mt-1 max-w-[52ch] text-[#c9ccd1]">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <figure {...r(2)} aria-label="Your phone and Mac talk directly over your Wi‑Fi, encrypted with a key from the pairing QR code" className="rounded-3xl bg-white/[0.05] p-6 sm:p-10">
          <figcaption className="text-sm text-[#c9ccd1]">Your Wi‑Fi</figcaption>
          <div className="mt-10 flex items-center gap-3 sm:gap-5">
            <Device icon={<Smartphone />} label="Phone" />
            <div className="relative h-16 flex-1" aria-hidden>
              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-white/20" />
              {/* Packets both ways along the line: the wrapper spans it, so 100% is its far end. */}
              {[0, 0.8, 1.6].map((d) => (
                <span key={`r${d}`} className="packet-right absolute inset-x-0 top-[calc(50%-14px)] h-2" style={{ animationDelay: `${d}s`, ["--run" as string]: "calc(100% - 10px)" }}>
                  <span className="block size-2.5 rounded-sm bg-signal" />
                </span>
              ))}
              {[0.4, 1.2, 2].map((d) => (
                <span key={`l${d}`} className="packet-left absolute inset-x-0 top-[calc(50%+6px)] h-2" style={{ animationDelay: `${d}s`, ["--run" as string]: "calc(100% - 10px)" }}>
                  <span className="block size-2.5 rounded-sm bg-[#8ab4ff]" />
                </span>
              ))}
              <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-graphite px-3 py-1 text-xs whitespace-nowrap">
                <Lock className="size-3" /> AES‑256‑GCM
              </span>
            </div>
            <Device icon={<Laptop />} label="Mac" />
          </div>
          <p className="mt-10 text-sm text-[#c9ccd1]">
            Messages on port 47821, files on 47822, on your network only. Off your Wi‑Fi? Plug in a USB cable and it runs over adb instead.
          </p>
        </figure>
      </div>
    </section>
  )
}

function Device({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex flex-col items-center gap-2 text-sm">
      <span className="grid size-16 place-items-center rounded-2xl bg-white/[0.08] [&_svg]:size-7">{icon}</span>
      {label}
    </span>
  )
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto grid max-w-6xl gap-10 px-4 pb-28 sm:px-6 sm:pb-36 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
      <h2 id="faq-title" {...r(0)} className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
        Questions
      </h2>
      <div className="space-y-2">
        {FAQ.map(([q, a], i) => (
          <details key={q} {...r(i + 1)} className="group rounded-xl bg-card open:bg-accent/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="max-w-[65ch] px-5 pb-5 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
