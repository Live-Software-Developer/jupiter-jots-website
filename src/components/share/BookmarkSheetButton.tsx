"use client"

import type { ReactNode } from "react"

import type { PBookmark } from "@/lib/share/types"

import { useBookmarkSheet } from "./bookmarkSheetContext"

/** A whole card/row that opens the bookmark's sheet instead of navigating away. */
export function BookmarkSheetButton({
  bookmark,
  className,
  children,
}: {
  bookmark: PBookmark
  className: string
  children: ReactNode
}) {
  const open = useBookmarkSheet()
  return (
    <button type="button" aria-haspopup="dialog" onClick={(event) => open(bookmark, event.currentTarget)} className={className}>
      {children}
    </button>
  )
}
