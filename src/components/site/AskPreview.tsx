import { SparkleIcon } from "@/components/site/icons"
import { cn } from "@/lib/utils"

/**
 * A static transcript showing the part that matters: an answer grounded in saved items, and a
 * change that is still only a proposal. It is marked as an example, because it is not live.
 */
export function AskPreview({ className }: { className?: string }) {
  return (
    <figure
      aria-label="Example of an Ask Jupiter conversation and a proposed change"
      className={cn("overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-xl shadow-foreground/5", className)}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <SparkleIcon className="size-4" />
        </span>
        <span className="text-sm font-medium">Ask Jupiter</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Example</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground">
          What did I save about database locks?
        </p>

        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <SparkleIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm leading-relaxed">
              You saved three pieces on Postgres locking. The shortest is a practical guide to deadlocks; the other two go
              deeper into <code className="rounded bg-muted px-1 py-0.5 text-xs">SELECT FOR UPDATE</code> and retries.
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Sources Jupiter used">
              {[
                ["Postgres locks, explained", "notion.so"],
                ["Avoiding deadlocks", "postgresql.org"],
                ["Retries that don’t stampede", "github.com"],
              ].map(([title, domain]) => (
                <li key={title} className="max-w-full rounded-lg border border-border bg-background px-2.5 py-1.5">
                  <span className="block truncate text-xs font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">{domain}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <p className="text-xs font-medium text-primary">Proposed change · waiting for you</p>
              <p className="mt-1 text-sm leading-relaxed">
                Move these 3 bookmarks into <strong>Databases</strong>.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2" aria-hidden="true">
                <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground">
                  Apply
                </span>
                <span className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-xs font-medium">
                  Discard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5">
        Nothing in the library changes until you choose Apply. The buttons in this example are a picture, not controls.
      </figcaption>
    </figure>
  )
}
