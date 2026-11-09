import { cacheLife } from "next/cache"

import { apiBase } from "@/lib/share/api"

/** A "News & updates" post, the same ones the extension shows (written in the backend admin). */
export interface NewsPost {
  id: number
  title: string
  kind: string
  summary: string
  body: string
  published_at: string
}

/** Published posts, newest first, cached for minutes; null when the API is unset or unreachable (the page says so). */
export async function getNews(): Promise<NewsPost[] | null> {
  "use cache"
  cacheLife("minutes")
  const base = apiBase()
  if (!base) return null
  try {
    const res = await fetch(`${base}/api/sharing/news`)
    if (!res.ok) return null
    return ((await res.json()) as { posts: NewsPost[] }).posts ?? []
  } catch {
    return null
  }
}
