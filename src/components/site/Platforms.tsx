import { PlatformLogo } from "@/components/site/PlatformLogo"
import type { PlatformKey } from "@/components/site/platform-logos"
import { PlusIcon } from "@/components/site/icons"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import { STORE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

type Status = "now" | "store" | "soon"

const ROWS: { key: PlatformKey; name: string; kind: string; status: Status; detail: string }[] = [
  { key: "chrome", name: "Chrome", kind: "Browser extension", status: "now", detail: "Install from the Chrome Web Store." },
  { key: "brave", name: "Brave", kind: "Browser extension", status: "store", detail: "Brave installs Chrome extensions. Add it from the Chrome Web Store." },
  { key: "edge", name: "Microsoft Edge", kind: "Browser extension", status: "store", detail: "Edge can install from the Chrome Web Store once you allow extensions from other stores." },
  { key: "firefox", name: "Firefox", kind: "Browser extension", status: "soon", detail: "A Firefox version is in the works." },
  { key: "android", name: "Android", kind: "Phone app", status: "soon", detail: "Save from the share menu on your phone." },
  { key: "ios", name: "iPhone and iPad", kind: "iOS app", status: "soon", detail: "Save from the share sheet on iPhone and iPad." },
]

/** The design's <site-platforms>: where Jupiter Jots runs, one row per platform. */
export function Platforms({ className }: { className?: string }) {
  return (
    <ul className={cn("divide-y divide-border border-y border-border", className)}>
      {ROWS.map((r) => (
        <li key={r.key} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground">
              <PlatformLogo name={r.key} className="size-8" />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-base font-semibold">{r.name}</span>
                {r.status === "now" && <span className="text-sm font-medium text-primary">Available now</span>}
                {r.status === "store" && <span className="text-sm font-medium text-primary">Works now</span>}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {r.kind}. {r.detail}
              </p>
            </div>
          </div>
          <div className="pl-16 sm:pl-0">
            {r.status === "now" && (
              <a href={STORE_URL} target="_blank" rel="noopener" className={btnPrimary("md")}>
                <PlusIcon />
                Add to Chrome
                <span className="sr-only"> (opens the Chrome Web Store in a new tab)</span>
              </a>
            )}
            {r.status === "store" && (
              <a
                href={STORE_URL}
                target="_blank"
                rel="noopener"
                aria-label={`Get Jupiter Jots for ${r.name} from the Chrome Web Store (opens in a new tab)`}
                className={btnSecondary("md")}
              >
                Chrome Web Store
              </a>
            )}
            {r.status === "soon" && (
              <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-dashed border-border px-5 text-sm whitespace-nowrap text-muted-foreground">
                Coming soon
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
