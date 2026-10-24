"use client"

import { createContext, useContext } from "react"

import type { PBookmark } from "@/lib/share/types"

export type OpenBookmarkSheet = (bookmark: PBookmark, trigger?: HTMLElement | null) => void

/** Opens the read-focused bookmark sheet; no-op when the caller is not on a share page. */
export const BookmarkSheetContext = createContext<OpenBookmarkSheet>(() => {})

export const useBookmarkSheet = () => useContext(BookmarkSheetContext)
