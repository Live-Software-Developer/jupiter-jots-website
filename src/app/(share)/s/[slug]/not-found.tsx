import { ShareUnavailable } from "@/components/share/ShareUnavailable"

/** Unknown or malformed slug: the backend answered 404. */
export default function ShareNotFound() {
  return <ShareUnavailable reason="missing" />
}
