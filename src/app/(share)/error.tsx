"use client"

import { ShareUnavailable } from "@/components/share/ShareUnavailable"

/** Anything that throws while rendering a share (e.g. a malformed payload) lands here, never on Next's error page. */
export default function ShareError({ retry }: { error: unknown; retry: () => void }) {
  return <ShareUnavailable reason="error" onRetry={retry} />
}
