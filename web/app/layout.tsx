import type { Metadata } from "next"
import { Bricolage_Grotesque } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BannerProvider } from "@/components/banners"
import "./globals.css"

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" })

export const metadata: Metadata = {
  title: "DroidLink: your Android phone, on your Mac",
  description:
    "OTPs that paste themselves, notifications you can reply to, calls, texts, clipboard and files between an Android phone and a Mac. Free, open source, local network only.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} antialiased`}>
      {/* suppressHydrationWarning: browser extensions add attributes to <body> before React loads. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <TooltipProvider>
          <BannerProvider>{children}</BannerProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
