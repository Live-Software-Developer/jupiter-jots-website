"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import type { ComponentProps } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"

// shadcn-style Select on Radix, in the site's tokens (works in light and dark).

const chevron = (d: string, className = "size-4") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
)
const DOWN = "M6 9l6 6 6-6"
const UP = "M6 15l6-6 6 6"

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent/40 disabled:opacity-60 data-[placeholder]:text-muted-foreground [&>span]:min-w-0 [&>span]:truncate",
        FOCUS_FLAT,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>{chevron(DOWN, "size-4 shrink-0 text-muted-foreground")}</SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

const scrollButton = "flex h-6 cursor-default items-center justify-center text-muted-foreground"

export function SelectContent({ className, children, position = "popper", ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        collisionPadding={8}
        className={cn(
          "relative z-50 max-h-[min(60vh,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl",
          position === "popper" && "w-[min(24rem,calc(100vw-1rem))] data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className={scrollButton}>{chevron(UP)}</SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className={scrollButton}>{chevron(DOWN)}</SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <span className="absolute right-2 grid size-4 place-items-center text-primary">
        <SelectPrimitive.ItemIndicator>{chevron("M5 12.5l4.5 4.5L19 7")}</SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

export const SelectItemText = SelectPrimitive.ItemText

export function SelectSeparator({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}
