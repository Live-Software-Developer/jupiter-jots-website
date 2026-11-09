"use client"

import { useState } from "react"

/** An https image in shared markdown: lazy, no referrer; a broken one becomes a link to its address. */
export function MarkdownImage({ src, alt, linkClass }: { src: string; alt: string; linkClass: string }) {
  const [broken, setBroken] = useState(false)
  if (broken)
    return (
      <a href={src} target="_blank" rel="noopener noreferrer nofollow ugc" className={`${linkClass} break-all`}>
        {alt || src}
      </a>
    )
  return (
    <img
      src={src}
      alt={alt}
      title={alt || undefined}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="my-1 inline-block h-auto max-h-[28rem] max-w-full rounded-lg border border-border object-contain align-middle"
      onError={() => setBroken(true)}
    />
  )
}
