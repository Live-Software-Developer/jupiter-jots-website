import type { NextConfig } from "next"
import createMDX from "@next/mdx"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A self-contained server in .next/standalone for our own host (node server.js behind a proxy).
  output: "standalone",
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  poweredByHeader: false,
  images: {
    // 85 for the product screenshots (small UI text), 75 is Next's default.
    qualities: [75, 85],
  },
  experimental: {
    // Same as the Keon site: the on-disk dev cache can serve a stale globals.css after edits.
    turbopackFileSystemCacheForDev: false,
  },
  async redirects() {
    return [
      // The design's routes, in case anyone shares a link from the design surface.
      { source: "/site", destination: "/", permanent: true },
      { source: "/site-:page(privacy|terms|faq|guide|about|changelog|support)", destination: "/:page", permanent: true },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
