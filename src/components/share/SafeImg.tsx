"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { httpsUrl } from "@/lib/share/format"

/**
 * Every image on a share page goes through this: a favicon, preview or collection logo from the
 * payload, loaded straight from its site. Only `https:` addresses load, with no referrer, lazily
 * and at an explicit size; a missing, refused or broken image shows `fallback` instead, never a
 * broken box. Decorative (`alt=""`).
 */
export function SafeImg({
  src,
  width,
  height,
  className,
  fallback,
}: {
  src: string | undefined
  width: number
  height: number
  className?: string
  fallback: ReactNode
}) {
  const url = httpsUrl(src)
  const [failed, setFailed] = useState<string | null>(null)
  const img = useRef<HTMLImageElement>(null)

  // An image that failed before hydration fired its error before React listened for it. decode()
  // settles once the image has loaded or broken (a lazy one waits until it is fetched).
  useEffect(() => {
    const el = img.current
    if (!url || !el?.decode) return
    el.decode().catch(() => {
      if (el.complete && el.naturalWidth === 0) setFailed(url)
    })
  }, [url])

  if (!url || failed === url) return fallback
  return (
    <img
      ref={img}
      src={url}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(url)}
      className={className}
    />
  )
}
