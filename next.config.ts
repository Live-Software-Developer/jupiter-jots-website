import type { NextConfig } from "next"
import createMDX from "@next/mdx"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A self-contained server in .next/standalone for our own host (node server.js behind a proxy).
  output: "standalone",
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  poweredByHeader: false,
  // Next's gzip buffers streamed responses, which stalls the proxied /realtime/sse event stream
  // (see rewrites). Compression is left to the proxy in front of the node server.
  compress: false,
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
      // Share designs have no real counterpart (shares live at /s/[slug]); send them home.
      { source: "/site-share-:page", destination: "/", permanent: true },
    ]
  },
  async rewrites() {
    // umbral's realtime client.js (loaded from the API) opens `/realtime/worker.js` (a SharedWorker,
    // which must be same-origin) and `/realtime/sse` relative to the PAGE's origin, so those paths
    // are proxied to the backend.
    const api = (process.env.NEXT_PUBLIC_JJ_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "")
    return [{ source: "/realtime/:path*", destination: `${api}/realtime/:path*` }]
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
