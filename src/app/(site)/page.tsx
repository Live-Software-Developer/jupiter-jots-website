import Link from "next/link"

import { BrandLogo } from "@/components/site/BrandLogo"
import { AskPreview } from "@/components/site/AskPreview"
import { StoreLink } from "@/components/site/ExternalStoreLink"
import { ChevronRightIcon, PlusIcon } from "@/components/site/icons"
import { Platforms } from "@/components/site/Platforms"
import { Shot } from "@/components/site/Shot"
import { FOCUS_FLAT, btnPrimary, btnSecondary, textLink } from "@/components/site/styles"
import { HOME_SEO } from "@/app/home-seo"

export const metadata = HOME_SEO

/** A row of facts with hairlines above each (the design's two <dl> blocks). */
function Facts({ items, className }: { items: [string, string][]; className: string }) {
  return (
    <dl className={className}>
      {items.map(([term, text]) => (
        <div key={term} className="border-t border-border py-5">
          <dt className="font-semibold">{term}</dt>
          <dd className="mt-1 text-muted-foreground">{text}</dd>
        </div>
      ))}
    </dl>
  )
}

const H2 = "text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
const LEAD = "text-lg leading-relaxed text-muted-foreground"
/** Wide screenshots: on phones the image is 170% wide and cropped, so the UI stays legible. */
const WIDE_CROP = "w-[170%] max-w-none sm:w-full"
const FRAME = "overflow-hidden rounded-2xl border border-border shadow-xl shadow-foreground/5"

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="overflow-x-clip" aria-labelledby="hero-h">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pt-24">
          <div className="lg:col-span-5">
            <p className="mb-4 text-sm font-semibold tracking-[0.08em] text-primary uppercase">Save your RAM!</p>
            {/* One sentence per line, as in the design. Geist is wider than the design surface's
                font, so the size steps down in the narrow lg column to keep each line whole. */}
            <h1 id="hero-h" className="text-5xl leading-none font-semibold tracking-tighter text-balance sm:text-6xl lg:text-5xl xl:text-[3.5rem]">
              <span className="block">Save the page.</span> <span className="block">Keep the reason.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              A bookmark manager that saves any page in one click, with a note on why it mattered. Bookmark the tabs you mean to read, give them a reason, then close them. Free, and your library stays on your device.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StoreLink className={btnPrimary("lg")}>
                <PlusIcon />
                Add to Chrome
              </StoreLink>
              <a href="#get" className={btnSecondary("lg")}>
                All platforms
              </a>
            </div>
            <p className="mt-6 max-w-md text-sm text-muted-foreground">Also works in Brave and Edge. Firefox, Android and iOS are coming soon.</p>
          </div>
          <div className="relative pb-16 sm:pb-20 lg:col-span-7 lg:pb-12">
            <div className="overflow-hidden rounded-xl border border-border bg-card lg:mt-6 lg:w-[112%] lg:origin-top-left lg:-rotate-3">
              <Shot name="search" priority sizes="(min-width: 1152px) 750px, (min-width: 1024px) 66vw, 100vw" />
            </div>
            <div className="absolute right-2 bottom-0 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-foreground/20 sm:right-6 sm:w-52 lg:-right-16 lg:-bottom-4 lg:w-56 lg:rotate-3">
              <Shot name="save" priority sizes="(min-width: 1024px) 224px, (min-width: 640px) 208px, 160px" />
            </div>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="pt-20 sm:pt-28" aria-label="At a glance">
        <Facts
          className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4"
          items={[
            ["One click", "Save the tab you are on from the toolbar, a right-click or Alt+Shift+S."],
            ["A note for future you", "Write why you saved it. Search finds it by that note later."],
            ["Collections that nest", "Folders inside folders, with tags, favourites and an archive."],
            ["Yours alone", "No account. Your library lives in your browser; only what you share is stored on our server."],
          ]}
        />
      </section>

      {/* The app */}
      <section id="features" className="scroll-mt-20 pt-20 sm:pt-28" aria-labelledby="app-h">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <h2 id="app-h" className={`${H2} lg:col-span-6`}>
              One library, three places
            </h2>
            <div className="lg:col-span-5 lg:col-start-8">
              <p className={`max-w-lg ${LEAD}`}>
                The full-screen library, the toolbar popup and the side panel are the same app. Save from one, sort in another.
              </p>
              <Link href="/features" className={`mt-3 inline-flex items-center gap-1 ${textLink}`}>
                See every feature
                <ChevronRightIcon className="size-4" />
              </Link>
            </div>
          </div>
          <figure className="mt-10">
            <div className={FRAME}>
              <Shot name="library" className={WIDE_CROP} sizes="(min-width: 1152px) 1104px, (min-width: 640px) 100vw, 170vw" />
            </div>
            <figcaption className="mt-3 text-sm text-muted-foreground">The full-screen library.</figcaption>
          </figure>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <figure>
              <div className="h-104 overflow-hidden rounded-3xl bg-muted px-8 pt-10 sm:px-12">
                <div className="mx-auto max-w-xs overflow-hidden rounded-t-2xl border border-b-0 border-border shadow-xl shadow-foreground/10">
                  <Shot name="popup" sizes="320px" />
                </div>
              </div>
              <figcaption className="mt-3 text-sm text-muted-foreground">The toolbar popup, for a quick save.</figcaption>
            </figure>
            <figure>
              <div className="h-104 overflow-hidden rounded-3xl bg-muted px-8 pt-10 sm:px-12">
                <div className="mx-auto max-w-xs overflow-hidden rounded-t-2xl border border-b-0 border-border shadow-xl shadow-foreground/10">
                  <Shot name="sidepanel" sizes="320px" />
                </div>
              </div>
              <figcaption className="mt-3 text-sm text-muted-foreground">The side panel, open beside what you are reading.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Organise */}
      <section className="pt-20 sm:pt-28" aria-labelledby="org-h">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <h2 id="org-h" className={H2}>
              Collections inside collections
            </h2>
            <p className={`mt-4 ${LEAD}`}>
              Nest them as deep as you like and give each an icon, emoji or colour. Search covers titles, notes, page descriptions and tags.
            </p>
          </div>
          <div className="lg:col-span-8">
            <div className={FRAME}>
              <Shot name="collection" className={WIDE_CROP} sizes="(min-width: 1152px) 736px, (min-width: 1024px) 64vw, (min-width: 640px) 100vw, 170vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Import */}
      <section className="pt-20 sm:pt-28" aria-labelledby="imp-h">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:order-2 lg:col-span-4">
            <h2 id="imp-h" className={H2}>
              Bring your bookmarks with you
            </h2>
            <p className={`mt-4 ${LEAD}`}>
              Import straight from Chrome, folders and all, with duplicates skipped. Firefox, Safari and Edge files, Raindrop and Pocket CSVs work too.
            </p>
            <p className="mt-4 text-muted-foreground">Export any time as JSON, HTML or CSV.</p>
          </div>
          <div className="lg:order-1 lg:col-span-8">
            <div className={FRAME}>
              <Shot name="import" className={WIDE_CROP} sizes="(min-width: 1152px) 736px, (min-width: 1024px) 64vw, (min-width: 640px) 100vw, 170vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Insights */}
      <section className="pt-20 sm:pt-28" aria-labelledby="ins-h">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
            <h2 id="ins-h" className={`${H2} lg:col-span-6`}>
              See what you go back to
            </h2>
            <p className={`max-w-lg ${LEAD} lg:col-span-5 lg:col-start-8`}>
              What you open, when you read, and what you saved but never opened. Worked out on your computer.
            </p>
          </div>
          <div className={`mt-10 ${FRAME}`}>
            <Shot name="insights" className={WIDE_CROP} sizes="(min-width: 1152px) 1104px, (min-width: 640px) 100vw, 170vw" />
          </div>
        </div>
      </section>

      {/* Ask Jupiter */}
      <section id="ask" className="scroll-mt-20 pt-20 sm:pt-28" aria-labelledby="ask-h">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-sm font-semibold text-primary">Ask Jupiter</p>
            <h2 id="ask-h" className={`mt-2 ${H2}`}>
              Ask your library a question.
            </h2>
            <p className={`mt-4 ${LEAD}`}>
              “What did I save about Postgres locks?” Jupiter searches your titles, notes and tags, answers with the items
              it used, and prepares a change for you to approve.
            </p>
            <ul className="mt-6 space-y-2.5 text-muted-foreground">
              <li className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span><strong className="font-medium text-foreground">Bring your own AI key.</strong> Anthropic, OpenAI, Google, OpenRouter and more. It stays encrypted on this computer.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span><strong className="font-medium text-foreground">Nothing changes on its own.</strong> Edits arrive as a proposal; Apply is your call.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span><strong className="font-medium text-foreground">Some things stay private.</strong> Hidden and locked notes never reach the model.</span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/guide/ask-jupiter" className={textLink}>
                How Ask Jupiter works
              </Link>
              <Link href="/guide/agents" className={textLink}>
                Use it from your terminal
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <AskPreview />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="pt-20 sm:pt-28" aria-labelledby="priv-h">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="priv-h" className={H2}>
              Your library stays in your browser
            </h2>
            <Link href="/privacy" className={`mt-4 inline-block ${textLink}`}>
              Read the privacy policy
            </Link>
          </div>
          <Facts
            className="grid gap-x-10 sm:grid-cols-2 lg:col-span-8"
            items={[
              ["Stored in your browser", "Bookmarks, notes and collections live in IndexedDB on this computer."],
              ["No account, no tracking", "Nothing to sign up for. No analytics, no ads."],
              ["Free", "Every feature on this page costs nothing."],
              ["Not synced yet", "Move your library between computers with export or a backup file."],
              [
                "Shares live on our server",
                "Items you share, and comments on them, are stored on our server so the link works. Owners can delete a share from the extension.",
              ],
            ]}
          />
        </div>
      </section>

      {/* Get it */}
      <section id="get" className="scroll-mt-20 pt-20 sm:pt-28" aria-labelledby="get-h">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="get-h" className={H2}>
              Get Jupiter Jots
            </h2>
            <p className={`mt-4 ${LEAD}`}>Free in Chrome today, and in Brave and Edge through the Chrome Web Store.</p>
            <p className="mt-4 text-muted-foreground">
              Also coming: sync across devices and reminders.{" "}
              <Link href="/changelog" className={textLink}>
                Changelog
              </Link>
            </p>
          </div>
          <Platforms className="lg:col-span-8" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-24 sm:px-6 sm:py-32" aria-labelledby="cta-h">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <BrandLogo className="size-14" />
          <h2 id="cta-h" className="mt-6 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Try it on the next page you save
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Import your Chrome bookmarks in one step. Your folders arrive as collections.</p>
          <StoreLink className={`mt-8 ${btnPrimary("lg")}`}>
            <PlusIcon />
            Add to Chrome
          </StoreLink>
          <a
            href="#get"
            className={`mt-4 rounded text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${FOCUS_FLAT}`}
          >
            Using another browser or a phone?
          </a>
        </div>
      </section>
    </>
  )
}
