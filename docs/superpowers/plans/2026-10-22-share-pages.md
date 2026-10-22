# Website share pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/s/[slug]` renders any real share (public or private, any mix of items) with full-width graphs, collection sheets and a live, threaded discussion.

**Architecture:** A server component fetches the share from the backend and renders the hero + one band per payload item; private shares render a server-side lock screen and decrypt client-side. Interactive parts (graph view toggles, collection sheet, discussion with realtime) are client components. Pure logic — crypto, restricted markdown, graph layout and wire paths — lives in `src/lib/share/` with unit tests.

**Tech Stack:** Next.js 16 (app router, `cacheComponents`), React 19, Tailwind 4, WebCrypto, umbral realtime `client.js` (loaded from the backend), Vitest + jsdom (new dev deps).

**Spec:** `../jj_backend/docs/superpowers/specs/2026-10-22-sharing-and-graphs-design.md` (*Share payload*, *Private-share crypto*, *API contract*, *Website*). Designs: TaskFlow group **8 · Public share pages**.

**Depends on:** sharing backend plan Tasks 1–9. Crypto vectors from the extension sharing plan, Task 1.

## Global Constraints

- Backend base URL `JJ_API_URL` (server) / `NEXT_PUBLIC_JJ_API_URL` (client).
- Every share page: `robots: { index: false, follow: false }`. Public pages get OG title/description from `title`/`summary`; private pages never put anything but `title` and curator in metadata.
- Restricted markdown only: paragraphs, `**bold**`, `*italic*`, `` `code` ``, `- ` / `1. ` lists, `> ` quotes. Everything else renders as escaped text. No links, images or raw HTML.
- Visitor key: 32 random hex in `localStorage['jj.visitor']`, sent as `X-Visitor-Key`.
- Graph layout constants identical to the extension (node 240 wide, column x `40 + i*300`, row y `64 + j*176`).
- Remove the fixture routes `/share/public`, `/share/bookmark`, `/share/private`, `/share/private/unlocked`, `src/lib/share.ts` fixtures, and their redirects in `next.config.ts`; keep `/site-share-*` redirects pointing at `/`.
- Commit after every task; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Backend down: `/s/[slug]` shows a friendly "This share can't be loaded right now" page with retry, not a Next error page (Task 3).
2. Revoked/expired (410) and unknown (404) render distinct messages (Task 3).
3. A comment body containing `<script>` or `[x](javascript:…)` renders as literal text (Task 2 tests).
4. Wrong password shows an inline error and keeps the typed password; five wrong tries in a row add a 3 s wait (Task 6).
5. On a 360px phone the board scrolls one column at a time and nothing overflows horizontally (Task 4 manual check).

---

### Task 1: Test harness, crypto and API client

**Files:**
- Modify: `package.json` (dev deps `vitest`, `jsdom`; script `test`), create `vitest.config.ts`
- Create: `src/lib/share/crypto.ts` (same interface as the extension's `shareCrypto.ts`: `deriveKey`, `decryptJson`, `encryptJson`, `WrongPassword`), `src/lib/share/crypto.vectors.json` (copied from the extension), `src/lib/share/api.ts` (`getShare(slug) → { status: 'ok', share } | { status: 'missing' | 'gone' | 'error' }`, `getComments(slug)`, `postComment(slug, body)`, `vote(id)`, `report(id)`; `visitorKey()`), `src/lib/share/types.ts` (payload v1 + API types from the spec)
- Test: `src/lib/share/crypto.test.ts`, `src/lib/share/api.test.ts`

- [ ] **Step 1: Tests:** vector decrypts to `{"hello":"world"}`; wrong password throws; `getShare` maps 404 → `missing`, 410 → `gone`, network error → `error`; `postComment` sends `X-Visitor-Key`.
- [ ] **Step 2: Run** `pnpm test`, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**, expect PASS.
- [ ] **Step 5: Commit** `feat(share): crypto, types and backend client`

### Task 2: Restricted markdown + graph layout helpers

**Files:**
- Create: `src/lib/share/markdown.tsx` (`renderMarkdown(src: string): ReactNode` — builds React elements, never `dangerouslySetInnerHTML`), `src/lib/share/graph.ts` (`boardColumns(g: PGraph)`, `bandOf(g)`, `computePath(a, b)` — same behaviour as the extension's functions)
- Test: `src/lib/share/markdown.test.tsx`, `src/lib/share/graph.test.ts`

- [ ] **Step 1: Tests:** bold/italic/code/list/quote render as elements; `<script>alert(1)</script>` appears as text; `[x](javascript:alert(1))` appears as text; derived columns for a stepless graph match the extension's test case; `computePath` cases.
- [ ] **Step 2: Run**, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**, expect PASS.
- [ ] **Step 5: Commit** `feat(share): restricted markdown and graph layout helpers`

### Task 3: `/s/[slug]` route, hero and bands

**Files:**
- Create: `src/app/(share)/s/[slug]/page.tsx`, `.../not-found.tsx`, `.../opengraph-image.tsx` (public only), `src/components/share/ShareHero.tsx`, `ShareBand.tsx`, `BookmarkRow.tsx`, `ShareSidebar.tsx`, `ShareUnavailable.tsx`
- Delete: fixture routes and `src/lib/share.ts` fixtures (see constraints); update `next.config.ts` redirects
- Test: `src/components/share/ShareBand.test.tsx`

**Interfaces:**
- `ShareHero({ share, payload })` — badge, title, intro, curator, updated/expires, CTA card, "In this share" index (≥ 2 items).
- `ShareBand({ item, index, total })` — switches on `item.kind`: collection → 2-col list of up to 4 rows + "See all N" (opens sheet), bookmarks → cards, graph → `width="full"` with `GraphView` (Task 4).

- [ ] **Step 1: Test:** a payload with graph + collection + 2 bookmarks renders three bands in order with the right headings; a collection band with 6 bookmarks shows 4 rows and "See all 6".
- [ ] **Step 2: Run**, expect FAIL.
- [ ] **Step 3: Implement** to the designs (`/site-share-public`, `/site-share-bookmark`); `getShare` errors render `ShareUnavailable` (missing / gone / error copy).
- [ ] **Step 4: Run** `pnpm test && pnpm build`, expect PASS.
- [ ] **Step 5: Commit** `feat(share): real share pages at /s/[slug]`

### Task 4: GraphView and CollectionSheet

**Files:**
- Create: `src/components/share/GraphView.tsx` (client; Board/Canvas toggle starting at `graph.mode`, full-screen, zoom on canvas, legend, wires via `computePath` + `ResizeObserver`, hover highlights a node's wires, collection nodes open the sheet, bookmark nodes open the URL in a new tab), `src/components/share/CollectionSheet.tsx` (client; right sheet ≥ sm, bottom sheet on phones; filter input; rows; the collection's comments from the discussion store; Save / Copy link footer; opened through a `CollectionSheetProvider` context with `open(key)`)
- Test: `src/components/share/GraphView.test.tsx`

- [ ] **Step 1: Tests:** toggling to Canvas renders absolutely-positioned nodes at `x/y`; clicking a collection node calls `open('g:1/n:...')`.
- [ ] **Step 2: Run**, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**, expect PASS. Manual at 360 / 768 / 1280 in light and dark.
- [ ] **Step 5: Commit** `feat(share): graph view and collection sheet`

### Task 5: Discussion with live updates

**Files:**
- Create: `src/components/share/Discussion.tsx` (client: sort Top/Newest, item filter chip fed by `ShareSidebar` and band comment links, composer with "On …" select from payload keys, name remembered in `localStorage['jj.name']`, threads one level deep with "Show N more replies" after 3, helpful votes, report, own held comments shown as "Waiting for approval", hidden stubs, locked / off notices), `src/components/share/useLiveComments.ts` (loads `${NEXT_PUBLIC_JJ_API_URL}/realtime/client.js` once, subscribes to `public:share:{slug}`, merges `comment` / `comment_updated` / `comment_hidden` into state; falls back to 30 s polling if the script fails)
- Test: `src/components/share/Discussion.test.tsx`

- [ ] **Step 1: Tests:** replies nest under their parent; a `comment_hidden` event replaces the comment with a stub; posting in approve-first mode shows "Waiting for approval"; `comments_off` hides the composer.
- [ ] **Step 2: Run**, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**, expect PASS. Manual: two browsers on one share, post in one, see it in the other without reload.
- [ ] **Step 5: Commit** `feat(share): live threaded discussion`

### Task 6: Private shares

**Files:**
- Create: `src/components/share/PrivateGate.tsx` (client: lock card from `title`, `curator_name`, `summary`, expiry; password field with show/hide; on success decrypts payload and renders the same hero + bands + discussion, decrypting each comment's `{author_name, body}` and encrypting new ones; "Lock again" clears the key from memory)
- Modify: `src/app/(share)/s/[slug]/page.tsx` (visibility `private` → `PrivateGate`)
- Test: `src/components/share/PrivateGate.test.tsx`

- [ ] **Step 1: Tests:** correct password reveals bands; wrong password shows "That password didn't work" and keeps the input; five wrong tries disable the button for 3 s (fake timers).
- [ ] **Step 2: Run**, expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm test && pnpm build`, expect PASS. Manual end-to-end with a private share created by the extension.
- [ ] **Step 5: Commit** `feat(share): end-to-end encrypted private shares`

### Task 7: Privacy policy and terms for sharing

**Files:**
- Modify: `src/content/privacy.mdx`, `src/content/terms.mdx`, `src/content/faq.mdx` (one Q&A), `src/content/changelog.mdx` (entry)

**Required statements (decided by the user, 2026-10-22):**
- No email or account is collected. Identity is a 12-character code generated on the user's device; the server stores only a keyed hash of a key derived from it and cannot recover the code. Losing the code means losing control of existing shares.
- Bookmarks stay on the device. **Shares** are stored in two places: in the user's own space (the extension) and on Jupiter Jots servers so they are reachable by link and by the user's other devices.
- Public shares: their contents are stored readable on the server. Private shares: contents and their comments are encrypted in the browser with the share password; the server stores only ciphertext plus the title, curator name and item counts shown on the lock screen.
- Comments and replies (name, text, time) are sent to and stored on the server, are visible to anyone who can open the share, can be hidden or deleted by the share's owner, and are deleted when the share is deleted. Visitors are identified by a random key kept in their browser, stored server-side only as a hash, used for "remember my name", votes, reports and rate limits.
- What the owner controls: revoke, expiry, view limit, comment mode, moderation. What happens on revoke/expiry: the link stops working; data is deleted when the owner deletes the share.
- Terms: owners are responsible for what they share; prohibited content; how to report a share (`/support`); we may remove reported shares that break the terms.

- [ ] **Step 1:** Draft the sections in plain language matching the existing pages' tone; keep each statement above verbatim in substance.
- [ ] **Step 2:** `pnpm build` passes; read both pages rendered at `/privacy` and `/terms`.
- [ ] **Step 3: Commit** `docs(site): privacy and terms cover shares, codes and comments`
