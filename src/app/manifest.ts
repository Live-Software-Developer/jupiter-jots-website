import type { MetadataRoute } from "next"

import { SITE } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "browser",
    background_color: "#fdfcfe",
    theme_color: "#7a40da",
    icons: [
      { src: "/icons/jj-48.png", sizes: "48x48", type: "image/png" },
      { src: "/icons/jj-128.png", sizes: "128x128", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
