import type { ReactNode } from "react"

import { ShareFooter, ShareTopbar } from "@/components/share/Share"

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground">
      <ShareTopbar />
      <div className="flex flex-1 flex-col">{children}</div>
      <ShareFooter />
    </div>
  )
}
