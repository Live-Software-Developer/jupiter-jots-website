import { PageIntro } from "@/components/site/PageIntro"
import { cn } from "@/lib/utils"
import { getNews } from "@/lib/news"
import { pageMetadata } from "@/lib/seo"
import { MARKDOWN_CLASS, renderMarkdown, RICH } from "@/lib/share/markdown"

export const metadata = pageMetadata({
  title: "News & updates | Jupiter Jots",
  description: "Announcements, release notes and notices from the Jupiter Jots team, the same posts the extension shows under News & updates.",
  path: "/news",
  image: "changelog",
  imageAlt: "Jupiter Jots news and updates",
  keywords: ["Jupiter Jots news", "Jupiter Jots updates", "Jupiter Jots announcements"],
})

/** Posts change rarely; refresh the page every five minutes. */
export const revalidate = 300

const KIND: Record<string, { label: string; className: string }> = {
  update: { label: "Update", className: "bg-primary/10 text-primary" },
  announcement: { label: "Announcement", className: "bg-muted text-foreground" },
  notice: { label: "Notice", className: "bg-destructive/10 text-destructive" },
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

export default async function NewsPage() {
  const posts = await getNews()
  return (
    <>
      <PageIntro title="News & updates" lede="Announcements, release notes and anything you should know about, from the people who build Jupiter Jots." />
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        {posts == null ? (
          <p className="text-muted-foreground">News can’t be loaded right now. Try again in a little while.</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">Nothing yet. Updates will appear here and in the extension under News &amp; updates.</p>
        ) : (
          <ol className="space-y-12">
            {posts.map((p) => {
              const kind = KIND[p.kind] ?? KIND.update
              return (
                <li key={p.id} id={`post-${p.id}`} className="scroll-mt-24">
                  <article aria-labelledby={`post-${p.id}-title`}>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={cn("rounded-full px-2.5 py-0.5 font-medium", kind.className)}>{kind.label}</span>
                      <time dateTime={p.published_at} className="text-muted-foreground">
                        {day(p.published_at)}
                      </time>
                    </div>
                    <h2 id={`post-${p.id}-title`} className="mt-3 text-2xl font-semibold tracking-tight text-pretty">
                      {p.title}
                    </h2>
                    {p.summary && <p className="mt-2 text-lg leading-8 text-muted-foreground">{p.summary}</p>}
                    {p.body && <div className={cn(MARKDOWN_CLASS, "mt-5 space-y-4 text-base leading-7 break-words")}>{renderMarkdown(p.body, 20000, RICH)}</div>}
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </>
  )
}
