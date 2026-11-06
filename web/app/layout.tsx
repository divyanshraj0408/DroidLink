import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BannerProvider } from "@/components/banners"
import { DESCRIPTION, KEYWORDS, NAME, SITE_URL, TITLE } from "@/lib/site"
import "./globals.css"

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" })

// Icons, the share image, robots.txt, sitemap.xml and the manifest come from their app/ files.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${NAME}` },
  description: DESCRIPTION,
  applicationName: NAME,
  keywords: KEYWORDS,
  authors: [{ name: "Divyansh Raj", url: "https://github.com/divyanshraj0408" }],
  creator: "Divyansh Raj",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  appleWebApp: { title: NAME, statusBarStyle: "black-translucent", capable: true },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9eaed" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b1e" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} antialiased`} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions add attributes to <body> before React loads. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {/* Marks that scripts run, so entrance animations may hide content until it scrolls in. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <TooltipProvider>
          <BannerProvider>{children}</BannerProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
