import Link from "next/link"

import { PlainLayout } from "@/components/site/DocLayout"
import { ChevronRightIcon } from "@/components/site/icons"
import { Prose } from "@/components/site/Prose"
import { Section } from "@/components/site/Section"
import { pageMetadata } from "@/lib/seo"
import { SUPPORT_EMAIL } from "@/lib/site"

export const metadata = pageMetadata({
  title: "Support | Jupiter Jots",
  description:
    "Get help with Jupiter Jots: find an answer in the guide or FAQ, report a problem, contact us by email, and what to do if your bookmarks are lost.",
  path: "/support",
  image: "support",
  imageAlt: "Jupiter Jots support",
  keywords: ["Jupiter Jots support", "Jupiter Jots help"],
})

const ANSWERS = [
  ["/guide", "Guide", "Step by step: saving, collections, tags, importing from Chrome, shortcuts, Insights and backups."],
  ["/faq", "FAQ", "Short answers about your data, privacy, import and export, and what is planned."],
  ["/privacy", "Privacy policy", "What is stored, where, and the few things the extension loads from the web."],
] as const

export default function SupportPage() {
  return (
    <PlainLayout title="Support" lede="Most questions are answered in the guide or the FAQ. If something is broken, tell us.">
      <Section anchor="self-help" title="Find an answer">
        <ul className="border-b border-border text-base">
          {ANSWERS.map(([href, title, text]) => (
            <li key={href} className="border-t border-border">
              <Link
                href={href}
                className="group flex items-start justify-between gap-6 rounded-sm py-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span>
                  <span className="block font-semibold group-hover:text-primary">{title}</span>
                  <span className="mt-1 block leading-7 text-muted-foreground">{text}</span>
                </span>
                <ChevronRightIcon className="mt-1 size-5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section anchor="bug" title="Report a problem">
        <Prose>
          <p>Email us with “Bug” in the subject. These details help us find the problem:</p>
          <ul>
            <li>What you did, what you expected, and what happened instead.</li>
            <li>Where it happened: the popup, the side panel or the full-screen library.</li>
            <li>
              Your Jupiter Jots version (on <code>chrome://extensions</code>) and your Chrome version (on <code>chrome://version</code>).
            </li>
            <li>A screenshot, if it shows the problem.</li>
          </ul>
          <p>
            We have no access to your library, so we can’t look up your bookmarks. Please don’t send a backup file unless we ask, and remove
            anything private from it first.
          </p>
        </Prose>
      </Section>

      <Section anchor="contact" title="Contact us">
        <div className="max-w-prose rounded-xl border border-border bg-muted/50 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Email</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-1 inline-block rounded-sm text-xl font-semibold tracking-tight break-all text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-3 leading-7 text-muted-foreground">For bugs, questions and ideas.</p>
        </div>
      </Section>

      <Section anchor="data" title="Lost bookmarks?">
        <Prose>
          <p>
            Your library is stored only in your browser, so we can’t restore it. If you reinstalled the extension or cleared site data, import
            your most recent JSON backup from the Import &amp; export page. To avoid this in future, back up from time to time; the{" "}
            <Link href="/guide#backup">guide</Link> shows how.
          </p>
        </Prose>
      </Section>
    </PlainLayout>
  )
}
