"use client"

import { useRef } from "react"

import { Wordmark } from "@/components/site/BrandLogo"
import { StoreLink } from "@/components/site/ExternalStoreLink"
import { CloseIcon, MenuIcon, PlusIcon } from "@/components/site/icons"
import { NavLinks } from "@/components/site/NavLinks"
import { FOCUS, btnPrimary } from "@/components/site/styles"
import { cn } from "@/lib/utils"

/**
 * The phone menu: a native modal <dialog>, so focus is trapped, Escape closes it and focus
 * returns to the menu button. Clicking the backdrop or any link closes it too.
 */
export function MobileMenu() {
  const ref = useRef<HTMLDialogElement>(null)
  const close = () => ref.current?.close()

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-controls="site-menu"
        onClick={() => ref.current?.showModal()}
        className={`grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent md:hidden ${FOCUS}`}
      >
        <MenuIcon />
      </button>
      <dialog
        ref={ref}
        id="site-menu"
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-sm border-l border-border bg-popover p-0 text-popover-foreground backdrop:bg-black/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between px-4">
            <span className="flex items-center gap-2.5">
              <Wordmark />
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className={`grid size-10 place-items-center rounded-full transition-colors hover:bg-accent ${FOCUS}`}
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Main" className="flex flex-col gap-1 px-2 pt-4">
            <NavLinks mobile onNavigate={close} />
          </nav>
          <div className="mt-auto border-t border-border p-4">
            <StoreLink className={cn(btnPrimary("md"), "h-11 w-full px-4 text-base")}>
              <PlusIcon />
              Add to Chrome
            </StoreLink>
            <p className="mt-3 text-center text-sm text-muted-foreground">Free. No account. Your library stays on your device.</p>
          </div>
        </div>
      </dialog>
    </>
  )
}
