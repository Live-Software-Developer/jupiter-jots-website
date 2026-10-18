"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NAV } from "@/components/site/nav"
import { FOCUS } from "@/components/site/styles"

/** Header and menu links; the current page gets aria-current and the stronger style. */
export function NavLinks({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  return NAV.map((item) => {
    const on = item.match !== null && pathname === item.match
    const cls = mobile
      ? `flex items-center justify-between rounded-lg px-3 py-3 text-xl font-semibold tracking-tight transition-colors ${
          on ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
        } ${FOCUS}`
      : `rounded-md px-3 py-2 text-sm transition-colors ${
          on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
        } ${FOCUS}`
    return (
      <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className={cls} onClick={onNavigate}>
        {item.label}
      </Link>
    )
  })
}
