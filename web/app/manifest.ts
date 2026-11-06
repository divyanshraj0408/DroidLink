import type { MetadataRoute } from "next"
import { DESCRIPTION, NAME, TITLE } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: TITLE,
    short_name: NAME,
    description: DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#1a1b1e",
    theme_color: "#1f2023",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
