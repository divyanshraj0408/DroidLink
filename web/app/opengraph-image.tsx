import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

// The share card for links on X, LinkedIn, WhatsApp, Slack… PNG, since some platforms skip WebP.
export const alt = "DroidLink: use your Android phone from your Mac. Codes, notifications, calls, texts, clipboard and files."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const icon = `data:image/png;base64,${(await readFile(join(process.cwd(), "app/icon.png"))).toString("base64")}`
  const features = ["OTP codes", "Notifications & replies", "Calls", "SMS", "Clipboard", "Files of any size"]
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1a1b1e", color: "#ecedef" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={icon} width={96} height={96} alt="" />
          <span style={{ fontSize: 48, fontWeight: 700 }}>DroidLink</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ display: "flex", flexDirection: "column", fontSize: 80, letterSpacing: -2, lineHeight: 1.02 }}>
            <span>Your Android phone,</span>
            <span>on your Mac</span>
          </span>
          <span style={{ fontSize: 32, color: "#a9acb3" }}>Free and open source. Nothing leaves your Wi‑Fi.</span>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {features.map((f) => (
            <span key={f} style={{ fontSize: 26, padding: "10px 20px", borderRadius: 999, background: "#2c2d31" }}>
              {f}
            </span>
          ))}
        </div>
      </div>
    ),
    size
  )
}
