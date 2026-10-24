import Link from "next/link"

import { DocLayout } from "@/components/site/DocLayout"
import { GuideNext } from "@/components/site/GuideNext"
import { HelpBlock } from "@/components/site/HelpBlock"
import { btnPrimary, btnSecondary, textLink } from "@/components/site/styles"
import Agents, { toc } from "@/content/agents.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Agents in your terminal | Jupiter Jots",
  socialTitle: "Use Jupiter Jots from Claude Code and other terminal agents",
  description:
    "Connect Claude Code or another MCP client to your Jupiter Jots library. Runs locally, reads follow your permissions, and every write waits for your approval.",
  path: "/guide/agents",
  image: "agents",
  imageAlt: "Jupiter Jots connected to an agent in the terminal",
  keywords: ["Jupiter Jots MCP", "Claude Code bookmark manager", "MCP bookmark server", "AI agent bookmarks"],
})

export default function AgentsPage() {
  return (
    <DocLayout
      title="Agents in your terminal"
      lede="Give Claude Code or another MCP client your saved library. The bridge stays on this computer, and changes wait for you."
      meta={
        <>
          Part of the <Link href="/guide" className={textLink}>Jupiter Jots guide</Link>.
        </>
      }
      toc={toc}
      tocTitle="In this guide"
    >
      <div className="space-y-14">
        <Agents />
        <GuideNext
          href="/guide/ask-jupiter"
          label="Also in the guide"
          title="Ask Jupiter"
          action="Read about Ask Jupiter"
        >
          Prefer to stay in Chrome? Ask Jupiter uses the same library and the same approval rules,
          with a key you add in the extension.
        </GuideNext>
        <HelpBlock
          title="Need a hand?"
          actions={
            <>
              <Link href="/support" className={btnPrimary("md")}>
                Report a problem
              </Link>
              <Link href="/guide" className={btnSecondary("md")}>
                Back to the guide
              </Link>
            </>
          }
        >
          Include what your client shows for the server, without pasting any pairing token or key.
        </HelpBlock>
      </div>
    </DocLayout>
  )
}
