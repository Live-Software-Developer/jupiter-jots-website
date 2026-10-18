/** The design's <site-page-intro>: the opening block of a content page. */
export function PageIntro({ title, lede, meta }: { title: string; lede?: string; meta?: string }) {
  return (
    <div className="block border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-10 lg:pt-16 lg:pb-12">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-5xl">{title}</h1>
        {lede && <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{lede}</p>}
        {meta && <p className="mt-5 text-sm text-muted-foreground">{meta}</p>}
      </div>
    </div>
  )
}
