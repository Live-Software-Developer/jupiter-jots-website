"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"

export function SharePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (password.trim()) router.push("/share/private/unlocked")
      }}
    >
      <label htmlFor="share-password" className="block text-sm font-medium">
        Password
      </label>
      <div className="relative mt-2">
        <input
          id="share-password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-background pr-11 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className={cn(
            "absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground",
            FOCUS_FLAT,
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.8" />
          </svg>
        </button>
      </div>
      <button
        type="submit"
        className={cn(
          "mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          FOCUS,
        )}
      >
        Unlock share
      </button>
    </form>
  )
}
