import type { ReactNode } from "react"

import { BookmarkSheetProvider } from "@/components/share/BookmarkSheet"
import { CollectionSheetProvider } from "@/components/share/CollectionSheet"
import { Discussion, ShareDiscussionProvider, type CommentCodec } from "@/components/share/Discussion"
import { ShareReadProvider } from "@/components/share/ReadState"
import { ShareBand, toBands } from "@/components/share/ShareBand"
import { ShareHero } from "@/components/share/ShareHero"
import { ShareSidebar } from "@/components/share/ShareSidebar"
import { sheetEntries } from "@/lib/share/collections"
import { commentTargets } from "@/lib/share/targets"
import type { PublicShare, SharePayload } from "@/lib/share/types"

/**
 * A readable share: hero, bands and the discussion. Rendered on the server for public shares
 * and by PrivateGate after unlocking, which passes the comment codec and the "Lock again" action.
 */
export function ShareView({
  share,
  payload,
  codec,
  heroAction,
}: {
  share: PublicShare
  payload: SharePayload
  codec?: CommentCodec
  heroAction?: ReactNode
}) {
  const bands = toBands(payload.items)
  const curator = payload.curator.name || share.curator_name

  return (
    <ShareReadProvider slug={share.slug}>
      <ShareDiscussionProvider
        slug={share.slug}
        mode={share.comment_mode}
        locked={share.locked}
        count={share.comment_count}
        targets={commentTargets(payload.items)}
        audience={share.visibility === "private" ? "password" : "link"}
        codec={codec}
        live={share.live === true}
        updatedAt={share.updated_at}
      >
        <BookmarkSheetProvider>
          <CollectionSheetProvider collections={sheetEntries(payload.items)} curator={curator}>
            <main>
              <ShareHero share={share} payload={payload} action={heroAction} />
              {bands.map((band, i) => (
                <ShareBand key={band.key} item={band} index={i} total={bands.length} curator={curator} />
              ))}
              <div className="border-t border-border py-10 sm:py-14">
                <div className="mx-auto grid w-full max-w-6xl gap-10 px-3 sm:px-6 lg:grid-cols-12 lg:gap-12">
                  <div className="min-w-0 lg:col-span-8">
                    <Discussion />
                  </div>
                  <div className="lg:col-span-4">
                    <ShareSidebar share={share} bands={bands} />
                  </div>
                </div>
              </div>
            </main>
          </CollectionSheetProvider>
        </BookmarkSheetProvider>
      </ShareDiscussionProvider>
    </ShareReadProvider>
  )
}
