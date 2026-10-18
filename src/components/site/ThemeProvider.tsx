"use client"

import { ThemeProvider as NextThemes } from "next-themes"
import type { ReactNode } from "react"

/** Sets data-theme on <html> ("light" or "dark"); "system" follows the device. Stored in localStorage only. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="data-theme" themes={["light", "dark"]} defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  )
}
