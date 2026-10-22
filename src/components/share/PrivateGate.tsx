"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"

import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { visitorKey } from "@/lib/share/api"
import { b64decode, BadCipher, decryptJson, deriveKey, encryptJson, WrongPassword } from "@/lib/share/crypto"
import { formatDate, initialsOf } from "@/lib/share/format"
import { toPayload } from "@/lib/share/payload"
import type { PublicShare, SharePayload } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import type { CommentCodec } from "./Discussion"
import { ShareView } from "./ShareView"

/** Below this PBKDF2 count a share is refused rather than unlocked (the spec's floor; shares use their own count). */
const MIN_KDF_ITERS = 100_000
const MAX_TRIES = 5
const COOLDOWN_MS = 3000

/**
 * A private share's comment fields, each its own cipher of a JSON string (fresh iv per field
 * and per comment), under the share's key. A field that is not a string does not decode.
 */
export function commentCodec(key: CryptoKey): CommentCodec {
  const open = async (cipher: string) => {
    const v = await decryptJson(key, cipher)
    if (typeof v !== "string") throw new BadCipher("comment field is not a string")
    return v
  }
  return {
    decode: async (c) => ({ author_name: await open(c.author_name), body: await open(c.body) }),
    encode: async (c) => ({ author_name: await encryptJson(key, c.author_name), body: await encryptJson(key, c.body) }),
  }
}

/** The share's salt, or null when it is not usable (bad base64, shorter than 16 bytes). */
function saltOf(share: PublicShare): Uint8Array | null {
  try {
    const s = b64decode(share.salt)
    return s.length >= 16 ? s : null
  } catch {
    return null
  }
}

type Phase = { kind: "locked" } | { kind: "damaged" } | { kind: "open"; key: CryptoKey; payload: SharePayload }

/**
 * A private share (design: site-share-private / -unlocked). The lock card renders from the
 * plaintext fields (title, curator, summary, expiry) on the server; the password is turned
 * into a key in the browser and the payload and comments are decrypted here. The key lives in
 * this component's state only, never in storage, a cookie or the URL; "Lock again" drops it.
 */
export function PrivateGate({ share }: { share: PublicShare }) {
  const [phase, setPhase] = useState<Phase>({ kind: "locked" })
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [cooling, setCooling] = useState(false)
  const failures = useRef(0)
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const salt = useMemo(() => saltOf(share), [share])
  const unsafe = !salt || !Number.isInteger(share.kdf_iters) || share.kdf_iters < MIN_KDF_ITERS

  useEffect(() => {
    // Sets the jj_visitor cookie before the visitor reloads, so the server forwards it and the view dedupes.
    visitorKey()
    return () => {
      if (cooldown.current) clearTimeout(cooldown.current)
    }
  }, [])

  const key = phase.kind === "open" ? phase.key : null
  const codec = useMemo(() => (key ? commentCodec(key) : undefined), [key])

  async function unlock(e: FormEvent) {
    e.preventDefault()
    if (busy || cooling || !password || !salt) return
    setBusy(true)
    setWrong(false)
    try {
      const k = await deriveKey(password, salt, share.kdf_iters)
      const payload = toPayload(await decryptJson(k, share.payload))
      failures.current = 0
      setPassword("")
      setPhase(payload ? { kind: "open", key: k, payload } : { kind: "damaged" })
    } catch (err) {
      if (!(err instanceof WrongPassword)) {
        setPhase({ kind: "damaged" })
        return
      }
      setWrong(true)
      failures.current += 1
      if (failures.current >= MAX_TRIES) {
        failures.current = 0
        setCooling(true)
        cooldown.current = setTimeout(() => {
          cooldown.current = null
          setCooling(false)
        }, COOLDOWN_MS)
      }
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  function lockAgain() {
    setPhase({ kind: "locked" })
    setPassword("")
    setShow(false)
    setWrong(false)
    window.scrollTo({ top: 0 })
  }

  if (phase.kind === "open")
    return (
      <ShareView
        share={share}
        payload={phase.payload}
        codec={codec}
        heroAction={
          <button
            type="button"
            onClick={lockAgain}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              FOCUS_FLAT,
            )}
          >
            <LockIcon className="size-3.5" />
            Lock again
          </button>
        }
      />
    )

  const curator = share.curator_name
  const who = curator.split(/\s+/)[0] || "the person who shared it"
  const expires = formatDate(share.expires_at)
  const askable = !unsafe && phase.kind === "locked"
  const chips = share.summary
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <main className="grid flex-1 place-items-center px-3 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-xl shadow-foreground/5 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-chart-3/15 text-chart-3">
              <LockIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Private share{curator ? " from" : ""}</p>
              {curator ? (
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[0.625rem] font-semibold text-primary" aria-hidden="true">
                    {initialsOf(curator)}
                  </span>
                  <span className="truncate">{curator}</span>
                </p>
              ) : null}
            </div>
          </div>

          <h1 className="mt-6 font-serif text-3xl leading-tight tracking-tight break-words text-balance">{share.title}</h1>
          {askable ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the password {who} sent you. It unlocks in your browser — the server never sees what’s inside.
            </p>
          ) : null}

          {chips.length ? (
            <ul className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="What’s inside">
              {chips.map((chip, i) => {
                const tone = chipTone(chip)
                return (
                  <li key={i} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", tone.bg)}>
                    <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden="true" />
                    {chip}
                  </li>
                )
              })}
            </ul>
          ) : null}

          {unsafe ? (
            <Notice title="This share can’t be opened safely">
              It was locked with settings too weak to trust, so it won’t be unlocked here. Ask {who} to share it again.
            </Notice>
          ) : phase.kind === "damaged" ? (
            <Notice title="This share looks damaged">
              The password may be right, but what’s inside can’t be read. Ask {who} to share it again.
            </Notice>
          ) : (
            <>
              {/* No action or input name: without JS, submitting must never put the password in a URL. */}
              <form className="mt-6" onSubmit={unlock} aria-busy={busy}>
                <label htmlFor="private-share-password" className="text-sm font-medium">
                  Password
                </label>
                <div
                  className={cn(
                    "mt-2 flex items-center gap-2 rounded-xl border bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
                    wrong ? "border-destructive" : "border-input",
                  )}
                >
                  <input
                    ref={input}
                    id="private-share-password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    aria-invalid={wrong || undefined}
                    aria-describedby={wrong ? "private-share-error" : undefined}
                    className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground focus:outline-none sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-pressed={show}
                    aria-controls="private-share-password"
                    className={cn("rounded px-1 text-xs font-medium text-muted-foreground hover:text-foreground", FOCUS_FLAT)}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                <p id="private-share-error" aria-live="polite" className="mt-2 text-sm text-destructive empty:hidden">
                  {wrong ? (cooling ? "That password didn’t work. Too many tries — wait a few seconds." : "That password didn’t work. Check it against the message it came in.") : ""}
                </p>
                <button
                  type="submit"
                  disabled={busy || cooling}
                  className={cn(
                    "mt-4 flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60",
                    FOCUS,
                    "focus-visible:ring-offset-card",
                  )}
                >
                  {busy ? "Unlocking…" : "Unlock share"}
                </button>
              </form>
            </>
          )}

          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {expires ? `Expires ${expires}` : "Never expires"}. Lost the password? Ask {who} — Jupiter Jots can’t recover it.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/support" className={cn("rounded underline-offset-4 hover:text-foreground hover:underline", FOCUS_FLAT)}>
            Report this share
          </Link>
        </p>
      </div>
    </main>
  )
}

const CHIP_TONES = [
  { test: /graph/i, bg: "bg-chart-1/10", dot: "bg-chart-1" },
  { test: /collection/i, bg: "bg-chart-5/10", dot: "bg-chart-5" },
  { test: /bookmark|link/i, bg: "bg-chart-2/10", dot: "bg-chart-2" },
]
function chipTone(chip: string) {
  return CHIP_TONES.find((t) => t.test.test(chip)) ?? { bg: "bg-muted", dot: "bg-muted-foreground" }
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

function LockIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  )
}
