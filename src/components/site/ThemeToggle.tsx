"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const

const subscribe = () => () => {}

/** Theme choice in the footer: a radio group of three icon buttons. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // The stored theme is only known in the browser; render nothing selected on the server.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const current = mounted ? (theme ?? "system") : null

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const on = current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`grid size-8 place-items-center rounded-full transition-colors ${
              on ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            } ${FOCUS_FLAT}`}
          >
            <Icon className="size-4" aria-hidden="true" strokeWidth={1.8} />
          </button>
        )
      })}
    </div>
  )
}
