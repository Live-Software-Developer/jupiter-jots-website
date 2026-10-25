import type { ReactNode } from "react"

import { AgentFlowPreview } from "@/components/site/AgentFlowPreview"
import { AskPreview } from "@/components/site/AskPreview"
import type { FeatureVisual } from "@/components/site/features/sections"
import { Shot, type ShotName } from "@/components/site/Shot"
import { cn } from "@/lib/utils"

/*
 * The pictures beside each /features section. Where a real screenshot exists (public/shots) it is
 * used; otherwise a small drawing of the extension's own screen, built in HTML with the site's
 * tokens so it follows light and dark. Drawings are one role="img" with a description: their
 * buttons and fields are pictures, not controls.
 */

const CARD = "overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl shadow-foreground/5"
const FRAME = "overflow-hidden rounded-2xl border border-border shadow-xl shadow-foreground/5"

/** A drawing of an extension screen: a window with a title bar. */
function Drawing({ label, title, className, children }: { label: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className={cn(CARD, className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <img src="/jj-logo.svg" alt="" width={16} height={16} className="size-4" />
        <span className="text-xs font-medium">{title}</span>
      </div>
      {children}
    </div>
  )
}

/** A wide screenshot, cropped wider on phones so the interface stays legible. */
function WideShot({ name }: { name: ShotName }) {
  return (
    <div className={FRAME}>
      <Shot name={name} className="w-[150%] max-w-none sm:w-full" sizes="(min-width: 1152px) 640px, (min-width: 1024px) 56vw, (min-width: 640px) 100vw, 150vw" />
    </div>
  )
}

const Pill = ({ children, on = false }: { children: ReactNode; on?: boolean }) => (
  <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium", on ? "bg-primary text-primary-foreground" : "border border-border bg-background")}>{children}</span>
)
const Toggle = ({ on }: { on: boolean }) => (
  <span className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full", on ? "bg-primary" : "bg-muted ring-1 ring-border ring-inset")}>
    <span className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow-sm", on ? "left-[18px]" : "left-0.5")} />
  </span>
)
const Fav = ({ letter, className }: { letter: string; className: string }) => (
  <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold", className)}>{letter}</span>
)

function SaveVisual() {
  return (
    <div className="relative rounded-3xl bg-muted px-6 pt-8 pb-0 sm:px-12">
      <div className="mx-auto h-80 max-w-xs overflow-hidden rounded-t-2xl border border-b-0 border-border shadow-xl shadow-foreground/10 sm:h-96">
        <Shot name="save" sizes="320px" />
      </div>
      <div
        role="img"
        aria-label="A notice in the side panel: page details changed, with an Update button"
        className="absolute right-3 bottom-6 left-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-2xl shadow-foreground/15 sm:right-auto sm:left-6 sm:w-64"
      >
        <p className="text-xs font-medium">Page details changed</p>
        <p className="mt-0.5 text-xs text-muted-foreground">New preview image and description</p>
        <div className="mt-2 flex gap-1.5">
          <Pill on>Update</Pill>
          <Pill>Not now</Pill>
        </div>
      </div>
    </div>
  )
}

function FindVisual() {
  const rows = [
    ["Postgres locks, explained", "notion.so", "P", "bg-chart-1/15 text-chart-1"],
    ["Avoiding deadlocks", "postgresql.org", "A", "bg-chart-2/15 text-chart-2"],
    ["Retries that don’t stampede", "github.com", "R", "bg-chart-5/15 text-chart-5"],
    ["Designing data-intensive apps", "oreilly.com", "D", "bg-chart-3/20 text-foreground"],
  ] as const
  return (
    <Drawing
      title="Databases"
      label="A collection shown as a list beside the selected bookmark's details: its title, note, tags and reading status, editable in place"
    >
      <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ul className="space-y-1 border-r border-border p-2">
          {rows.map(([title, host, l, c], i) => (
            <li key={title} className={cn("flex items-center gap-2 rounded-lg px-2 py-2", i === 0 && "bg-accent")}>
              <Fav letter={l} className={c} />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{host}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="min-w-0 space-y-3 p-3 sm:p-4">
          <div>
            <p className="text-sm leading-snug font-semibold">Postgres locks, explained</p>
            <p className="text-[11px] text-muted-foreground">notion.so</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5">
            <p className="text-[11px] text-muted-foreground">Note</p>
            <p className="mt-0.5 text-xs leading-relaxed">Clearest take on row locks. Read before the queue rewrite.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">#postgres</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">#work</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5">
            <span className="text-[11px] text-muted-foreground">Reading</span>
            <span className="text-xs font-medium">To read</span>
          </div>
        </div>
      </div>
    </Drawing>
  )
}

function TidyVisual() {
  const tiles = [
    ["12", "Duplicates"],
    ["Check", "Broken links"],
    ["34", "Untagged"],
    ["8", "Unsorted"],
  ]
  const trash = [
    ["Bookmark", "Old conference schedule"],
    ["Note", "Draft reading plan"],
    ["Graph", "Learning Rust"],
  ]
  return (
    <Drawing
      title="Library health"
      label="Library health: 12 duplicates, a broken-link check, 34 untagged and 8 unsorted bookmarks. Below, Trash holds a bookmark, a note and a graph, each with Restore"
    >
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
        {tiles.map(([v, t]) => (
          <div key={t} className="rounded-xl border border-border bg-background p-3">
            <p className="text-lg leading-none font-semibold tracking-tight">{v}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3 sm:p-4">
        <p className="text-xs font-medium">Trash</p>
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
          {trash.map(([kind, title]) => (
            <li key={title} className="flex items-center gap-3 px-3 py-2">
              <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{kind}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{title}</span>
              <span className="text-[11px] font-medium text-primary">Restore</span>
            </li>
          ))}
        </ul>
      </div>
    </Drawing>
  )
}

function NotesVisual() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
      <Drawing
        title="Notes"
        label="A Markdown note about Postgres locking, linked to two bookmarks, with the dictation microphone listening"
      >
        <div className="space-y-3 p-4">
          <p className="text-base font-semibold tracking-tight">Why the queue deadlocks</p>
          <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Short version:</span> two workers take row locks in a different order.
            </p>
            <p className="border-l-2 border-primary/40 pl-2 italic">Always lock in id order.</p>
            <p>
              Fix with <code className="rounded bg-muted px-1 font-mono text-[11px] text-foreground">SELECT … FOR UPDATE</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-lg border border-border bg-background px-2 py-1 text-[11px]">Postgres locks, explained</span>
            <span className="rounded-lg border border-border bg-background px-2 py-1 text-[11px]">Avoiding deadlocks</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
            <span className="size-2 rounded-full bg-primary" />
            Listening…
          </div>
        </div>
      </Drawing>
      <div role="img" aria-label="A locked note with its title hidden" className={cn(CARD, "flex flex-col items-center justify-center gap-3 p-6 text-center")}>
        <svg viewBox="0 0 24 24" className="size-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </svg>
        <div>
          <p className="text-sm font-semibold">Locked note</p>
          <p className="mt-1 text-xs text-muted-foreground">Title hidden. Encrypted on this device.</p>
        </div>
        <span className="h-8 w-full max-w-40 rounded-lg border border-border bg-background" />
      </div>
    </div>
  )
}

function GraphsVisual() {
  // Nodes of a reading path, left to right; the first two are read.
  const nodes = [
    { x: 70, y: 70, label: "Rust book", kind: "Bookmark", read: true },
    { x: 250, y: 40, label: "Ownership", kind: "Bookmark", read: true },
    { x: 250, y: 150, label: "My notes", kind: "Note", read: false },
    { x: 430, y: 95, label: "Async Rust", kind: "Collection", read: false },
  ]
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
  ]
  return (
    <Drawing
      title="Learning Rust"
      label="A graph called Learning Rust: a reading path from the Rust book to Ownership and a note, then to the Async Rust collection. Two of four steps read"
    >
      <div className="p-3 sm:p-4">
        <svg viewBox="0 0 520 200" className="h-auto w-full" aria-hidden="true">
          <defs>
            <marker id="feat-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" className="fill-muted-foreground" />
            </marker>
          </defs>
          {edges.map(([a, b]) => {
            const s = nodes[a]
            const t = nodes[b]
            return (
              <path
                key={`${a}-${b}`}
                d={`M${s.x + 62} ${s.y} C ${s.x + 110} ${s.y}, ${t.x - 110} ${t.y}, ${t.x - 64} ${t.y}`}
                className="fill-none stroke-border"
                strokeWidth="2"
                markerEnd="url(#feat-arrow)"
              />
            )
          })}
          {nodes.map((n) => (
            <g key={n.label} transform={`translate(${n.x - 60} ${n.y - 24})`}>
              <rect width="120" height="48" rx="12" className={n.read ? "fill-primary/10 stroke-primary" : "fill-background stroke-border"} strokeWidth="1.5" />
              <text x="12" y="20" className="fill-muted-foreground text-[10px]">
                {n.kind}
              </text>
              <text x="12" y="36" className="fill-foreground text-[13px] font-medium">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">Progress</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-1/2 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] font-medium">2 of 4</span>
        </div>
      </div>
    </Drawing>
  )
}

function ShareVisual() {
  return (
    <Drawing
      title="New share"
      label="Share settings: unlisted chosen from Unlisted, Public and Password protected; live updates on; comments set to Approve first; the link expires in 30 days"
    >
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-center text-[11px] font-medium sm:text-xs">
          <span className="rounded-lg bg-background py-1.5 shadow-sm">Unlisted</span>
          <span className="py-1.5 text-muted-foreground">Public</span>
          <span className="py-1.5 text-muted-foreground">Password</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
          <span>
            <span className="block text-xs font-medium">Keep it live</span>
            <span className="block text-[11px] text-muted-foreground">Changes you make later show up on the link.</span>
          </span>
          <Toggle on />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border px-3 py-2">
            <span className="block text-[11px] text-muted-foreground">Comments</span>
            <span className="block text-xs font-medium">Approve first</span>
          </div>
          <div className="rounded-xl border border-border px-3 py-2">
            <span className="block text-[11px] text-muted-foreground">Link expires</span>
            <span className="block text-xs font-medium">30 days</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5 ring-1 ring-primary/20">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px]">jj.livesoftwaredeveloper.com/s/k7Qm2x</span>
          <Pill on>Copy</Pill>
        </div>
      </div>
    </Drawing>
  )
}

function PrivacyVisual() {
  const out = [
    ["Our server", "Only what you share, and comments on it"],
    ["Your AI provider", "Only when you ask, with your key"],
  ]
  return (
    <div role="img" aria-label="Your library stays in this browser. Only shares go to our server, and Ask Jupiter requests go straight to the AI provider you chose" className="grid gap-3 sm:grid-cols-[1.1fr_auto_1fr] sm:items-center">
      <div className={cn(CARD, "p-5")}>
        <p className="text-xs text-muted-foreground">This browser</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">Your library</p>
        <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
          {["Bookmarks", "Notes", "Collections", "Graphs", "Tags", "Activity"].map((x) => (
            <li key={x} className="rounded-md bg-muted px-2 py-1">
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">IndexedDB, on this computer</p>
      </div>
      <svg viewBox="0 0 40 80" className="mx-auto hidden h-20 w-10 text-border sm:block" aria-hidden="true">
        <path d="M2 40 C 20 40, 20 14, 38 14 M2 40 C 20 40, 20 66, 38 66" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
      <ul className="grid gap-3">
        {out.map(([t, d]) => (
          <li key={t} className="rounded-2xl border border-dashed border-border bg-background p-4">
            <p className="text-sm font-medium">{t}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SettingsVisual() {
  const rows: [string, ReactNode][] = [
    [
      "Theme",
      <span key="t" className="flex gap-1">
        <Pill on>System</Pill>
        <Pill>Light</Pill>
        <Pill>Dark</Pill>
      </span>,
    ],
    ["Denser cards in the library", <Toggle key="d" on={false} />],
    ["Save with a single click", <Toggle key="s" on />],
    ["Fetch page previews and descriptions", <Toggle key="f" on />],
  ]
  return (
    <Drawing title="Settings" label="Settings: theme set to System, single-click saving and page previews on, denser cards off">
      <ul className="divide-y divide-border">
        {rows.map(([label, control]) => (
          <li key={label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-xs font-medium">{label}</span>
            {control}
          </li>
        ))}
        <li className="flex items-center gap-3 px-4 py-3">
          <span className="text-xs font-medium">Shortcuts</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <kbd className="jj-kbd text-[11px]!">Alt</kbd>
            <kbd className="jj-kbd text-[11px]!">Shift</kbd>
            <kbd className="jj-kbd text-[11px]!">1</kbd>
            <span>opens your calendar</span>
          </span>
        </li>
      </ul>
    </Drawing>
  )
}

/** The picture for one section. */
export function FeatureVisualFor({ kind }: { kind: FeatureVisual }) {
  switch (kind) {
    case "save":
      return <SaveVisual />
    case "organise":
      return <WideShot name="collection" />
    case "find":
      return <FindVisual />
    case "tidy":
      return <TidyVisual />
    case "notes":
      return <NotesVisual />
    case "graphs":
      return <GraphsVisual />
    case "share":
      return <ShareVisual />
    case "ask":
      return <AskPreview />
    case "agents":
      return <AgentFlowPreview />
    case "insights":
      return <WideShot name="insights" />
    case "import":
      return <WideShot name="import" />
    case "privacy":
      return <PrivacyVisual />
    case "settings":
      return <SettingsVisual />
  }
}
