# Jupiter Jots website (Next.js)

The marketing site for the Jupiter Jots Chrome extension, built from the TaskFlow design group "Landing page" (project 17). It deploys separately from the extension. Live URL: https://jj.livesoftwaredeveloper.com.

Stack: Next.js 16.4.2 (App Router, Turbopack, `output: "standalone"`), React 19.3.0, Tailwind CSS 4.3.3, MDX (`@next/mdx` 16.4.2), next-themes 0.4.6, lucide-react 1.58.0, Geist via the `geist` 1.7.2 package (self-hosted, no font CDN). pnpm 10.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build; every page is prerendered
pnpm lint
pnpm og           # re-render share images and icons (needs Chrome and Python with Pillow)
```

## Placeholders to replace before launch

| What | Where | Current value |
|---|---|---|
| Chrome Web Store listing | `STORE_URL` in `src/lib/site.ts` (every "Add to Chrome" and "Chrome Web Store" link reads it) | `https://chromewebstore.google.com/` |
| Governing law in the terms | `GOVERNING_LAW` in `src/lib/site.ts` (shown with a dashed outline on /terms) | `[your country]` |

Already set: support email `support@livesoftwaredeveloper.com` (`SUPPORT_EMAIL`) and site URL `https://jj.livesoftwaredeveloper.com` (`SITE_URL`, overridable with the `SITE_URL` env var at build time).

## Routes

| Route | Source | Design route |
|---|---|---|
| `/` | `src/app/page.tsx` | `/site` |
| `/guide` | `src/content/guide.mdx` | `/site-guide` |
| `/faq` | `src/content/faq.mdx` | `/site-faq` |
| `/changelog` | `src/content/changelog.mdx` | `/site-changelog` |
| `/about` | `src/content/about.mdx` | `/site-about` |
| `/support` | `src/app/support/page.tsx` | `/site-support` |
| `/privacy` | `src/content/privacy.mdx` | `/site-privacy` |
| `/terms` | `src/content/terms.mdx` | `/site-terms` |
| 404 | `src/app/not-found.tsx` | (same style as the content pages) |

Also `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `favicon.ico`, `icon.svg`, `apple-icon.png`. The design's old paths (`/site`, `/site-privacy`...) redirect permanently to the new ones (`next.config.ts`).

## Where things are

- `src/components/site/*`: the design's components as React. Server components except `NavLinks`, `MobileMenu` (native modal `<dialog>`), `Toc` (scroll-spy), `Faq` (accordion item), `ThemeToggle` and `ThemeProvider`.
  - `SiteHeader`, `SiteFooter`, `Platforms` + `PlatformLogo` (brand SVGs inlined from the design, in `platform-logos.ts`), `PageIntro`, `Section`, `Prose` (also `Summary`, `Defs`/`Def`, `Kbd`, `Placeholder`), `Toc`, `Release`, `Shot`, `BrandLogo`.
- `src/content/*.mdx`: long-form copy. Each file exports its `toc`. MDX pages can use `<Section>`, `<Prose>`, `<Summary>`, `<Defs>`, `<Def>`, `<Kbd>`, `<Faq>`, `<SupportEmail />` and `<GoverningLaw />` without imports (`src/mdx-components.tsx`).
- `public/shots/*.webp`: real extension screenshots from the TaskFlow design surface at 2x. `next/image` serves resized copies; the hero pair is preloaded. Retake them there when the extension UI changes and update sizes in `Shot.tsx`.
- `src/app/globals.css`: light and dark tokens (the extension's shadcn values), prose styles.
- `og/`: `build.py` renders `public/og/<page>.png` (1200x630) from `template.html`, plus the icons, from `og/jj-logo.svg`.

## Themes, privacy, accessibility

- Light and dark follow the device; the footer has a System / Light / Dark switch. The choice is kept in `localStorage` only.
- No analytics, cookies or third-party requests: fonts, images and logos are all served from this site.
- Skip link, visible focus rings, keyboard-operable menu and accordion, `aria-current` in nav and TOC, smooth scrolling only without reduced motion, no horizontal scroll down to 360px.

## SEO

Every page builds its metadata with `pageMetadata()` (`src/lib/seo.ts`): absolute title, description, keywords, canonical, Open Graph and Twitter with its own image. Home metadata is in `src/app/home-seo.ts` (also the layout default). The layout adds Organization, WebSite and SoftwareApplication JSON-LD. A new page needs a row in `IMAGES` in `og/build.py` and an entry in `src/app/sitemap.ts`.

## Deploy

```bash
SITE_URL=https://jj.livesoftwaredeveloper.com pnpm bundle   # build + copy public/, static assets and deploy/ into .next/standalone
PORT=3010 pnpm serve                                        # node .next/standalone/server.js
```

On a VPS with pm2 (same scheme as the Keon site):

1. Upload `.next/standalone/` to `/home/jupiter_jots_website/releases/<id>/`.
2. Optionally write `/home/jupiter_jots_website/shared/.env` (see `.env.example`).
3. Run `deploy/activate.sh <id>`: it points `current` at the release, reloads the pm2 app `jupiter_jots_website` (port 3010, localhost only, `deploy/ecosystem.config.cjs`), waits for a 200 and rolls back if it doesn't get one. The last 5 releases are kept.
4. Proxy `jj.livesoftwaredeveloper.com` to `127.0.0.1:3010` (Caddy or nginx).

Change the app directory or port in both deploy files if the server differs. The site also deploys to Vercel unchanged.
