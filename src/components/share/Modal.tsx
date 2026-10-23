"use client"

import { useEffect, type ComponentProps, type RefObject } from "react"

import { cn } from "@/lib/utils"

type DialogProps = Omit<ComponentProps<"dialog">, "ref" | "open" | "onClose">

/**
 * A native modal `<dialog>` that opens with `showModal()` on mount, so the browser handles focus
 * containment, inertness of the page behind, Esc (topmost dialog only) and the top layer. Close it
 * with `dialogRef.current.close()`; `onClose` runs after every close, Esc included. The page stops
 * scrolling while it is open. The element fills the viewport and is transparent: children draw
 * the visible surface.
 */
export function Modal({
  dialogRef,
  initialFocus,
  onClose,
  className,
  children,
  ...rest
}: DialogProps & {
  dialogRef: RefObject<HTMLDialogElement | null>
  initialFocus?: RefObject<HTMLElement | null>
  onClose(): void
}) {
  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (!d.open) d.showModal()
    initialFocus?.current?.focus()
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = overflow
    }
  }, [dialogRef, initialFocus])

  return (
    <dialog
      ref={dialogRef}
      // React bubbles `close` through its tree, so a dialog nested inside this one (a note's sheet
      // in a graph sheet) would close this one too; only this dialog's own close counts.
      onClose={(e) => e.target === e.currentTarget && onClose()}
      className={cn("fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent", className)}
      {...rest}
    >
      {children}
    </dialog>
  )
}
