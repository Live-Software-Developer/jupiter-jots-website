"use client"

import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"

import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { WrongPassword } from "@/lib/share/crypto"
import { lockSig, openLockedNote } from "@/lib/share/noteLock"
import { noteLabel } from "@/lib/share/targets"
import type { PNote } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { LockIcon } from "./icons"
import { NoteCard, NoteRow } from "./NoteRow"

/**
 * Locked notes on a share page (the curator chose "Include locked notes"). Each one opens with
 * its own password, in this page's memory only: the decrypted note lives in React state, never in
 * storage, a cookie or the URL, and a reload locks it again. Once open, the same note (by key) is
 * open everywhere on the page: its band, a collection sheet, a graph node.
 */

type Opened = Map<string, { sig: string; note: PNote }>
interface Store {
  opened: Opened
  open(locked: PNote, note: PNote): void
}

const LockedNotesContext = createContext<Store | null>(null)

function useStoreState(): Store {
  const [opened, setOpened] = useState<Opened>(() => new Map())
  const open = useCallback((locked: PNote, note: PNote) => {
    if (!locked.lock) return
    const sig = lockSig(locked.lock)
    setOpened((m) => new Map(m).set(locked.key, { sig, note }))
  }, [])
  return useMemo(() => ({ opened, open }), [opened, open])
}

/** Holds the page's unlocked notes. It sits above the bands, so a live refresh keeps them. */
export function LockedNotesProvider({ children }: { children: ReactNode }) {
  const store = useStoreState()
  return <LockedNotesContext.Provider value={store}>{children}</LockedNotesContext.Provider>
}

/** The page's store, or one of this component's own when it renders outside a share page. */
function useStore(): Store {
  const local = useStoreState()
  return useContext(LockedNotesContext) ?? local
}

/**
 * The note as it should show: a locked one decrypted when it was unlocked on this page with the
 * same ciphertext, otherwise null (still locked). A live refresh that changed the note's
 * ciphertext locks it again. A note that isn't locked comes back as it is.
 */
export function useOpenedNote(note: PNote): { opened: PNote | null; open: (n: PNote) => void } {
  const store = useStore()
  const entry = note.lock ? store.opened.get(note.key) : undefined
  const opened = !note.lock ? note : entry && entry.sig === lockSig(note.lock) ? entry.note : null
  const open = useCallback((n: PNote) => store.open(note, n), [store, note])
  return { opened, open }
}

/** The password form of a locked note. `compact` for rows and sheets, roomier for a note's own band. */
export function LockedNoteForm({ note, onOpen, compact = false }: { note: PNote; onOpen: (n: PNote) => void; compact?: boolean }) {
  const id = useId()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const input = useRef<HTMLInputElement>(null)

  async function unlock(e: FormEvent) {
    e.preventDefault()
    if (busy || !password) return
    setBusy(true)
    setError("")
    try {
      const opened = await openLockedNote(note, password)
      setPassword("")
      onOpen(opened)
    } catch (err) {
      setError(err instanceof WrongPassword ? "That password doesn’t open this note." : "This note can’t be opened here. Ask the curator to share it again.")
      if (!(err instanceof WrongPassword)) setPassword("")
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    // No action or input name: without JS, submitting must never put the password in a URL.
    <form onSubmit={unlock} aria-busy={busy} className={compact ? "mt-2" : "mt-5"}>
      <label htmlFor={`${id}-pw`} className={cn("font-medium", compact ? "text-xs text-muted-foreground" : "text-sm")}>
        Enter the note’s password
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          id={`${id}-pw`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Note password"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-err`}
          className={cn(
            "h-10 min-w-0 flex-1 basis-40 rounded-xl border bg-background px-3 text-base text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none sm:text-sm",
            error ? "border-destructive" : "border-input",
          )}
        />
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60",
            FOCUS,
          )}
        >
          <LockIcon className="size-3.5" />
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </div>
      <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-destructive empty:hidden">
        {error}
      </p>
    </form>
  )
}

/** The lock tile, in the notes hue. */
export const LockedMark = ({ className, glyph = "size-4" }: { className: string; glyph?: string }) => (
  <span className={cn("grid shrink-0 place-items-center bg-chart-4/15 text-chart-4", className)} aria-hidden="true">
    <LockIcon className={glyph} />
  </span>
)

/** A locked note that is its own band: a card with its lock, title and the password form; the note once unlocked. */
export function LockedNoteCard({ note }: { note: PNote }) {
  const { opened, open } = useOpenedNote(note)
  if (opened) return <NoteCard note={opened} heading={!!note.lock?.title} />
  return (
    <article data-locked-note className="max-w-3xl rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-8">
      <div className="flex items-center gap-3">
        <LockedMark className="size-10 rounded-xl" />
        <div className="min-w-0">
          <p className="text-base font-medium break-words">{noteLabel(note)}</p>
          <p className="text-sm text-muted-foreground">Locked with its own password. It opens in your browser.</p>
        </div>
      </div>
      <div className="max-w-md">
        <LockedNoteForm note={note} onOpen={open} />
      </div>
    </article>
  )
}

/** A locked note in a collection's band or sheet; the usual row once unlocked. */
export function LockedNoteRow({ note, clamp = false }: { note: PNote; clamp?: boolean }) {
  const { opened, open } = useOpenedNote(note)
  if (opened) return <NoteRow note={opened} clamp={clamp} />
  return (
    <div data-note-row data-locked-note className="flex items-start gap-3.5 px-4 py-4 sm:gap-4 sm:px-5">
      <LockedMark className="size-9 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words text-foreground">{noteLabel(note)}</p>
        <LockedNoteForm note={note} onOpen={open} compact />
      </div>
    </div>
  )
}

/** A locked graph node's face: lock, title and a hint; its sheet asks for the password. */
export function LockedNodeFace({ note }: { note: PNote }) {
  return (
    <>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockedMark className="size-5 rounded" glyph="size-3" />
        <span className="min-w-0 truncate">Locked note</span>
      </span>
      <span className="mt-1.5 block text-sm leading-snug font-medium break-words text-pretty text-card-foreground">{noteLabel(note)}</span>
      <span className="mt-2.5 flex items-center text-xs text-muted-foreground">
        Needs its password
        <span className={cn("ml-auto font-medium text-primary", FOCUS_FLAT)}>Unlock</span>
      </span>
    </>
  )
}
