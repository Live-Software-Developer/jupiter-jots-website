import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"

import "./globals.css"
import { ThemeProvider } from "@/components/site/ThemeProvider"
import { HOME_SEO } from "@/app/home-seo"
import { SITE, SITE_URL, STORE_URL } from "@/lib/site"

export const metadata: Metadata = {
  ...HOME_SEO,
  metadataBase: new URL(SITE_URL),
  title: { default: "Jupiter Jots | Bookmark manager for Chrome with notes", template: "%s | Jupiter Jots" },
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE_URL }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "productivity",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfe" },
    { media: "(prefers-color-scheme: dark)", color: "#130f1b" },
  ],
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE.name,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE.name,
      url: SITE_URL,
      description: SITE.description,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE.name,
      operatingSystem: "Chrome",
      applicationCategory: "BrowserApplication",
      softwareVersion: "2.0.0",
      description: SITE.description,
      url: SITE_URL,
      downloadUrl: STORE_URL,
      image: `${SITE_URL}/og/home.png`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
