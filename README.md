# Jupiter Jots website (Next.js)

The marketing site for the Jupiter Jots Chrome extension, built from the TaskFlow design group "Landing page" (project 17). It deploys separately from the extension. Live URL: https://jj.livesoftwaredeveloper.com.

Stack: Next.js 16.4.2 (App Router, Turbopack, `output: "standalone"`), React 19.3.0, Tailwind CSS 4.3.3, MDX (`@next/mdx` 16.4.2), next-themes 0.4.6, lucide-react 1.58.0, Geist via the `geist` 1.7.2 package (self-hosted, no font CDN). pnpm 10.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build; share pages (/s/[slug]) are partially prerendered, the rest static
pnpm lint
pnpm og           # re-render share images and icons (needs Chrome and Python with Pillow)
```

## Placeholders to replace before launch

| What | Where | Current value |
|---|---|---|
| Governing law in the terms | `GOVERNING_LAW` in `src/lib/site.ts` (shown with a dashed outline on /terms) | `[your country]` |

Already set: the Chrome Web Store listing (`STORE_URL`, every "Add to Chrome" link reads it), support email `support@livesoftwaredeveloper.com` (`SUPPORT_EMAIL`) and site URL `https://jj.livesoftwaredeveloper.com` (`SITE_URL`, overridable with the `SITE_URL` env var at build time).

## Routes

| Route | Source | Design route |
|---|---|---|
| `/` | `src/app/(site)/page.tsx` | `/site` |
| `/features` | `src/app/(site)/features/page.tsx` (sections in `src/components/site/features/sections.ts`) | — |
| `/guide` | `src/content/guide.mdx` | `/site-guide` |
| `/guide/ask-jupiter` | `src/content/ask-jupiter.mdx` | — |
| `/guide/agents` | `src/content/agents.mdx` | — |
| `/faq` | `src/content/faq.mdx` | `/site-faq` |
| `/changelog` | `src/content/changelog.mdx` | `/site-changelog` |
| `/about` | `src/content/about.mdx` | `/site-about` |
| `/support` | `src/app/(site)/support/page.tsx` | `/site-support` |
| `/privacy` | `src/content/privacy.mdx` | `/site-privacy` |
| `/terms` | `src/content/terms.mdx` | `/site-terms` |
| `/s/[slug]` | `src/app/(share)/s/[slug]/page.tsx` | `/site-share-*` |
| 404 | `src/app/not-found.tsx` | (same style as the content pages) |

Also `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `favicon.ico`, `icon.svg`, `apple-icon.png`. The design's old paths (`/site`, `/site-privacy`...) redirect permanently to the new ones, and `/site-share-*` to `/` (`next.config.ts`). The share pages are `noindex` and deliberately stay out of `sitemap.xml`; they also use their own slim chrome (`src/app/(share)/layout.tsx`), not the marketing header and footer.

## Where things are

- `src/components/site/*`: the design's marketing components as React; `src/components/share/*` is the share-page set (topbar, footer, hero, bands, graph view, private gate, discussion); `src/lib/share/*` holds its API client, payload types, crypto, graph layout and markdown. Server components except `NavLinks`, `MobileMenu` (native modal `<dialog>`), `Toc` (scroll-spy), `Faq` (accordion item), `ThemeToggle` and `ThemeProvider`.
  - `GuideTabs`, `GuidePager` and `GuideMore` (`GuideNav.tsx`) link the three guide pages in order (`GUIDE_STEPS` in `nav.ts`). `features/*` is the /features page: section data, sticky section nav (`FeatureNav`, client), hero `Orbit` and the drawings in `visuals.tsx`.
  - `SiteHeader`, `SiteFooter`, `Platforms` + `PlatformLogo` (brand SVGs inlined from the design, in `platform-logos.ts`), `PageIntro`, `Section`, `Prose` (also `Summary`, `Defs`/`Def`, `Kbd`, `Placeholder`), `Toc`, `Release`, `Shot`, `BrandLogo`.
- `src/content/*.mdx`: long-form copy. Each file exports its `toc`. MDX pages can use `<Section>`, `<Prose>`, `<Summary>`, `<Defs>`, `<Def>`, `<Kbd>`, `<Faq>`, `<SupportEmail />` and `<GoverningLaw />` without imports (`src/mdx-components.tsx`).
- `public/shots/*.webp`: real extension screenshots from the TaskFlow design surface at 2x. `next/image` serves resized copies; the hero pair is preloaded. Retake them there when the extension UI changes and update sizes in `Shot.tsx`.
- `src/app/globals.css`: light and dark tokens (the extension's shadcn values), prose styles.
- `og/`: `build.py` renders `public/og/<page>.png` (1200x630) from `template.html`, plus the icons, from `og/jj-logo.svg`.

## Themes, privacy, accessibility

- Light and dark follow the device; the footer has a System / Light / Dark switch. The choice is kept in `localStorage` only.
- No analytics or third-party requests on the marketing pages: fonts, images and logos are all served from this site. Share pages also call the Jupiter Jots backend (`NEXT_PUBLIC_JJ_API_URL`) and set one functional cookie, `jj_visitor`.
- Skip link, visible focus rings, keyboard-operable menu and accordion, `aria-current` in nav and TOC, smooth scrolling only without reduced motion, no horizontal scroll down to 360px.

## SEO

Every page builds its metadata with `pageMetadata()` (`src/lib/seo.ts`): absolute title, description, keywords, canonical, Open Graph and Twitter with its own image. Home metadata is in `src/app/home-seo.ts` (also the layout default). The layout adds Organization, WebSite and SoftwareApplication JSON-LD. A new indexable page needs a row in `IMAGES` in `og/build.py` and an entry in `src/app/sitemap.ts`. Share pages build their own metadata in `src/app/(share)/s/[slug]/page.tsx` with `robots: { index: false, follow: false }`; a private share puts only its title and curator name in it. They share one generic Open Graph image, `src/app/(share)/s/[slug]/opengraph-image.tsx`, which never fetches the share.

## Deploy

Share pages need the backend URL. `NEXT_PUBLIC_JJ_API_URL` is inlined at build time, so set it when you run `pnpm build` or `pnpm bundle`; `JJ_API_URL` optionally overrides it for server renders at runtime. A production build without `NEXT_PUBLIC_JJ_API_URL` still succeeds, but share pages show "This share can't be loaded" and the server logs a warning. In development both default to `http://127.0.0.1:8000`. See `.env.example`.

The share page's "Save to Jupiter Jots" button talks to the installed extension through `NEXT_PUBLIC_JJ_EXTENSION_ID` (also inlined at build time; the store id is `dnfmgdmobmoglemckapnbgncnfhkighd`, an unpacked dev build has its own id on `chrome://extensions`). The extension only accepts it from origins in its manifest's `externally_connectable` (production and `http://localhost:3000`). Unset, the button only shows how to install Jupiter Jots and import the link by hand.

```bash
SITE_URL=https://jj.livesoftwaredeveloper.com NEXT_PUBLIC_JJ_API_URL=https://<backend> pnpm bundle   # build + copy public/, static assets and deploy/ into .next/standalone
PORT=3010 pnpm serve                                        # node .next/standalone/server.js
```

On a VPS with pm2 (same scheme as the Keon site):

1. Upload `.next/standalone/` to `/home/jupiter_jots_website/releases/<id>/`.
2. Optionally write `/home/jupiter_jots_website/shared/.env` (see `.env.example`), for example `JJ_API_URL` for server renders.
3. Run `deploy/activate.sh <id>`: it points `current` at the release, reloads the pm2 app `jupiter_jots_website` (port 3010, localhost only, `deploy/ecosystem.config.cjs`), waits for a 200 and rolls back if it doesn't get one. The last 5 releases are kept.
4. Proxy `jj.livesoftwaredeveloper.com` to `127.0.0.1:3010` (Caddy or nginx).

Change the app directory or port in both deploy files if the server differs. The site also deploys to Vercel unchanged.
