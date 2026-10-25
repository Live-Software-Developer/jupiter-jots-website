import Link from "next/link"

import { BrandLogo } from "@/components/site/BrandLogo"
import { StoreLink } from "@/components/site/ExternalStoreLink"
import { FeatureNav } from "@/components/site/features/FeatureNav"
import { Orbit } from "@/components/site/features/Orbit"
import { COMING_SOON, FEATURE_SECTIONS, type FeatureSection } from "@/components/site/features/sections"
import { FeatureVisualFor } from "@/components/site/features/visuals"
import { ChevronRightIcon, PlusIcon } from "@/components/site/icons"
import { btnPrimary, btnSecondary, textLink } from "@/components/site/styles"
import { pageMetadata } from "@/lib/seo"
import { cn } from "@/lib/utils"

export const metadata = pageMetadata({
  title: "Features | Jupiter Jots bookmark manager for Chrome",
  socialTitle: "Everything Jupiter Jots does",
  description:
    "Every Jupiter Jots feature: one-click saving, nested collections, notes, reading paths, live share links, Ask Jupiter with your own AI key, and terminal agents.",
  path: "/features",
  image: "features",
  imageAlt: "Everything Jupiter Jots does",
  keywords: ["Jupiter Jots features", "bookmark manager features", "share bookmarks", "bookmark notes", "AI bookmark assistant"],
})

const NAV_ITEMS = [...FEATURE_SECTIONS.map((s) => ({ id: s.id, label: s.nav })), { id: "soon", label: "Coming soon" }]

function FeatureBlock({ section, flip, first }: { section: FeatureSection; flip: boolean; first: boolean }) {
  const h = `${section.id}-h`
  return (
    <section id={section.id} aria-labelledby={h} className={cn("scroll-mt-32 py-16 sm:py-24", !first && "border-t border-border")}>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12">
        <div className={cn("lg:col-span-5", flip && "lg:order-2")}>
          <h2 id={h} className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {section.title}
          </h2>
          <p className="mt-4 font-serif text-xl leading-snug text-pretty text-foreground/80 sm:text-2xl">{section.promise}</p>
          <dl className="mt-8">
            {section.points.map((p) => (
              <div key={p.term} className="border-t border-border py-4">
                <dt className="font-semibold">{p.term}</dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">{p.text}</dd>
              </div>
            ))}
          </dl>
          {section.more && (
            <Link href={section.more.href} className={cn("mt-4 inline-flex items-center gap-1", textLink)}>
              {section.more.label}
              <ChevronRightIcon className="size-4" />
            </Link>
          )}
        </div>
        <div className={cn("min-w-0 lg:col-span-7 lg:self-start lg:sticky lg:top-36", flip && "lg:order-1")}>
          <FeatureVisualFor kind={section.visual} />
        </div>
      </div>
    </section>
  )
}

export default function FeaturesPage() {
  return (
    <>
      <section className="overflow-x-clip" aria-labelledby="features-h">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:items-center lg:pt-24 lg:pb-20">
          <div className="lg:col-span-6">
            <h1 id="features-h" className="text-5xl leading-none font-semibold tracking-tighter text-balance sm:text-6xl">
              <span className="block">Save it.</span> <span className="block">Find it.</span> <span className="block">Share it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Everything the Jupiter Jots extension does, in one place: saving and sorting, notes and reading paths, share links, an assistant that uses
              your own AI key, and agents in your terminal. All of it free, with your library kept on your device.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StoreLink className={btnPrimary("lg")}>
                <PlusIcon />
                Add to Chrome
              </StoreLink>
              <Link href="/guide" className={btnSecondary("lg")}>
                Read the guide
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <Orbit />
          </div>
        </div>
      </section>

      <FeatureNav items={NAV_ITEMS} />

      {FEATURE_SECTIONS.map((s, i) => (
        <FeatureBlock key={s.id} section={s} flip={i % 2 === 1} first={i === 0} />
      ))}

      <section id="soon" aria-labelledby="soon-h" className="scroll-mt-32 border-t border-border py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <h2 id="soon-h" className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              Coming soon
            </h2>
            <p className="mt-4 font-serif text-xl leading-snug text-foreground/80 sm:text-2xl">On the way. The extension already marks these as Coming soon.</p>
            <Link href="/changelog" className={cn("mt-4 inline-flex items-center gap-1", textLink)}>
              See what changed lately
              <ChevronRightIcon className="size-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
            {COMING_SOON.map((c) => (
              <li key={c.term} className="rounded-2xl border border-dashed border-border p-5">
                <p className="font-semibold">{c.term}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border px-4 py-24 sm:px-6 sm:py-32" aria-labelledby="features-cta-h">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <BrandLogo className="size-14" />
          <h2 id="features-cta-h" className="mt-6 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Start with the tab you keep meaning to read
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Free in Chrome, Brave and Edge. No account to create.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <StoreLink className={btnPrimary("lg")}>
              <PlusIcon />
              Add to Chrome
            </StoreLink>
            <Link href="/guide" className={btnSecondary("lg")}>
              Read the guide
            </Link>
          </div>
          <p className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/guide/ask-jupiter" className={textLink}>
              Ask Jupiter guide
            </Link>
            <Link href="/guide/agents" className={textLink}>
              Terminal agents guide
            </Link>
            <Link href="/faq" className={textLink}>
              FAQ
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
