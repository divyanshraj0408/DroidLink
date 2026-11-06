// Plain module, not "use client": server components read these as values, not client references.
export const REPO = "https://github.com/divyanshraj0408/DroidLink"
export const SETUP_GUIDE = `${REPO}/blob/main/SETUP.md`
// "latest/download" always points at the newest release's file of that name (scripts/release.sh).
export const DMG_URL = `${REPO}/releases/latest/download/DroidLink.dmg`
export const APK_URL = `${REPO}/releases/latest/download/DroidLink.apk`
export const PHONE = "Nothing Phone (2a)"

export const NAME = "DroidLink"
export const TITLE = "DroidLink: use your Android phone from your Mac"
export const DESCRIPTION =
  "Free, open-source Continuity for Android and Mac. OTP codes paste themselves, notifications become Mac banners you can reply to, calls ring on your Mac, and texts, clipboard and files of any size move both ways over your Wi‑Fi, end-to-end encrypted."
export const KEYWORDS = [
  "Android Mac continuity",
  "Android to Mac",
  "OTP autofill Mac",
  "Android notifications on Mac",
  "answer Android calls on Mac",
  "send SMS from Mac Android",
  "Android Mac clipboard sync",
  "send large files Android to Mac",
  "AirDrop alternative Android",
  "KDE Connect alternative Mac",
  "open source",
]

/**
 * Canonical origin for metadata, sitemap and robots. Set NEXT_PUBLIC_SITE_URL to the real domain;
 * on Vercel the production domain is picked up automatically.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "") // "https://x.app/" would give "https://x.app//sitemap.xml"

/** The questions people search for, answered on the page and in FAQPage structured data. */
export const FAQ: [string, string][] = [
  ["Is DroidLink free?", "Yes. It's free and open source, with no account, subscription or server. Download the Mac and Android apps from GitHub Releases, or build them yourself from the code."],
  ["Does it need the internet?", "No. Your phone and Mac talk directly over your Wi‑Fi, encrypted with AES‑256‑GCM. Nothing goes through a cloud service. With no shared Wi‑Fi, a USB cable works too."],
  ["Which phones and Macs does it work with?", "Android 14 or later, and macOS 14 Sonoma or later. It has been used day to day on a Nothing Phone (2a) Plus and works with any Android phone that allows SMS and notification access."],
  ["Is there a size limit on files?", "No. Files stream in encrypted 1 MiB chunks over their own connection, straight from disk to disk, with progress and Cancel on both sides and a SHA‑256 check at the end. A 20 GB video works the same way as a photo."],
  ["Can I talk on calls through my Mac?", "Not yet. You can answer, decline, end and dial calls from your Mac, but the audio stays on the phone, because Android doesn't let apps carry call audio. Keep the phone nearby or wear earbuds."],
  ["Does it work with iPhone?", "No. DroidLink is for people who use an Android phone with a Mac; iPhones already have Continuity built in."],
]
