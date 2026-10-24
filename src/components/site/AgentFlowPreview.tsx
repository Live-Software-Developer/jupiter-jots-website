import { cn } from "@/lib/utils"

/**
 * Two sides of one tool call: the terminal agent asks, then the extension waits for the
 * reader's decision. The terminal is deliberately fixed dark in both themes, like a terminal.
 */
export function AgentFlowPreview({ className }: { className?: string }) {
  return (
    <figure
      aria-label="Example of a terminal agent's write request waiting for approval in Jupiter Jots"
      className={cn("grid gap-3 md:grid-cols-[1.05fr_0.95fr]", className)}
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#17131f] text-[#f3eef9] shadow-xl shadow-foreground/10">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3.5 py-2.5">
          <span className="size-2 rounded-full bg-[#ff6b6b]" aria-hidden="true" />
          <span className="size-2 rounded-full bg-[#f6c453]" aria-hidden="true" />
          <span className="size-2 rounded-full bg-[#65d49a]" aria-hidden="true" />
          <span className="ml-2 font-mono text-[11px] text-white/70">claude · jupiter-jots</span>
        </div>
        <div className="space-y-2 px-4 py-4 font-mono text-[12px] leading-relaxed sm:text-[13px]">
          <p className="text-white/70">$ claude</p>
          <p>
            <span className="text-[#c9a7ff]">›</span> Save the best Postgres locking guide to
            <br />
            <span className="pl-4">my Databases collection.</span>
          </p>
          <p className="text-white/70">Searching your library…</p>
          <p>
            <span className="text-[#65d49a]">✓</span> Found 3 related bookmarks.
          </p>
          <p className="text-[#f6c453]">Write request sent · waiting for approval</p>
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl shadow-foreground/5 sm:p-5">
        <p className="text-xs font-medium text-muted-foreground">Connected agents · Waiting for you</p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Save bookmark</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Claude Code</p>
          </div>
          <span className="rounded-full bg-chart-3/15 px-2 py-0.5 text-xs font-medium text-foreground">Write</span>
        </div>
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          “Postgres locks, explained” → <span className="font-medium text-foreground">Databases</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          The agent cannot change your library until you decide.
        </p>
        <div className="mt-auto flex gap-2 pt-4" aria-hidden="true">
          <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground">Approve</span>
          <span className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium">Deny</span>
        </div>
      </div>
      <figcaption className="text-xs leading-relaxed text-muted-foreground md:col-span-2">
        Approve and Deny are a picture of the extension’s approval card, not controls. A write always
        waits, even when its tool is set to On.
      </figcaption>
    </figure>
  )
}
