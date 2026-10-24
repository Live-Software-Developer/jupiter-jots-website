import type { ReactNode } from "react"

import { PageIntro } from "@/components/site/PageIntro"
import { Toc, type TocItem } from "@/components/site/Toc"

/** Intro, then a 3/9 grid: sticky table of contents beside the article (stacked on phones). */
export function DocLayout({
  title,
  lede,
  meta,
  toc,
  tocTitle,
  children,
}: {
  title: string
  lede?: string
  meta?: ReactNode
  toc: TocItem[]
  tocTitle?: string
  children: ReactNode
}) {
  return (
    <>
      <PageIntro title={title} lede={lede} meta={meta} />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-12 lg:py-14">
        <Toc className="lg:col-span-3" items={toc} title={tocTitle} />
        <div className="mt-8 min-w-0 lg:col-span-9 lg:mt-0">{children}</div>
      </div>
    </>
  )
}

/** Intro, then the content at the header's full width (About, Support). */
export function PlainLayout({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <>
      <PageIntro title={title} lede={lede} />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="space-y-14">{children}</div>
      </div>
    </>
  )
}
