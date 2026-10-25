/**
 * The /features page, section by section. Every point is checked against the extension source
 * (jj_source_code); anything the extension marks Coming soon is only in COMING_SOON.
 */

export type FeatureVisual =
  | "save"
  | "organise"
  | "find"
  | "tidy"
  | "notes"
  | "graphs"
  | "share"
  | "ask"
  | "agents"
  | "insights"
  | "import"
  | "privacy"
  | "settings"

export interface FeatureSection {
  /** Anchor on /features. */
  id: string
  /** Short label in the sticky section nav. */
  nav: string
  title: string
  /** One sentence: what this part of the app does for you. */
  promise: string
  points: { term: string; text: string }[]
  visual: FeatureVisual
  /** Where to read more. */
  more?: { href: string; label: string }
}

export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "save",
    nav: "Saving",
    title: "Save in one click",
    promise: "Save the tab you are on from wherever you are, with a line on why it mattered.",
    visual: "save",
    points: [
      { term: "Three places, one app", text: "The toolbar popup, the side panel and the full-screen library all save the current tab." },
      { term: "Right-click or a shortcut", text: "Save page or Save link from the right-click menu, or press Alt+Shift+S on any page." },
      { term: "Page details come along", text: "The title, site icon, description and preview image are read from the page as you save." },
      { term: "Kept up to date", text: "Open a saved page and missing details fill in. If the page changed, you choose which details to update." },
      { term: "No duplicates", text: "Save a page twice and Jupiter Jots tells you, instead of making a copy." },
    ],
    more: { href: "/guide#save", label: "How saving works" },
  },
  {
    id: "organise",
    nav: "Organising",
    title: "Sort it your way",
    promise: "Collections nest as deep as you like, and tags, favourites and a reading list cut across them.",
    visual: "organise",
    points: [
      { term: "Collections inside collections", text: "Give each an icon, emoji or site logo and a colour. Reorder, archive, or delete and choose where its bookmarks go." },
      { term: "Tags", text: "Add as many as you like. Rename and merge them, with suggestions when two look like the same tag." },
      { term: "Reading list", text: "Mark a bookmark To read, Reading or Done, and work through the list." },
      { term: "Favourites and archive", text: "Star what you open every day; archive what you are finished with but want to keep." },
      { term: "Many at once", text: "Select several bookmarks to move, tag, archive or trash them together." },
    ],
    more: { href: "/guide#collections", label: "Collections and tags in the guide" },
  },
  {
    id: "find",
    nav: "Finding",
    title: "Find it again",
    promise: "Search reads your notes as well as the titles, so the reason you saved something is how you find it.",
    visual: "find",
    points: [
      { term: "Search everything you wrote", text: "Titles, addresses, notes, page descriptions, tags and collection names. Use \"quotes\" for a phrase and -word to leave one out." },
      { term: "Filters and sorting", text: "Narrow by collection, tag, favourites, archive or date. Sort by newest, oldest, title or last opened, in a grid or a list." },
      { term: "List and details side by side", text: "Choose a bookmark, note or collection and its details open next to the list, ready to edit in place." },
      { term: "Command palette", text: "Press Ctrl+K (⌘K on a Mac) to jump to any screen, or type a question for Ask Jupiter." },
    ],
    more: { href: "/guide#details", label: "Lists and details in the guide" },
  },
  {
    id: "tidy",
    nav: "Tidying",
    title: "Clear out without losing anything",
    promise: "Trash, undo and a health check make cleaning up safe to do on a whim.",
    visual: "tidy",
    points: [
      { term: "Trash first", text: "Deleted bookmarks, notes and graphs wait in Trash. Restore them, delete one forever, or empty the lot." },
      { term: "Undo", text: "Moves, deletes and whole imports can be undone straight after." },
      { term: "Library health", text: "Duplicates to merge, untagged and unsorted bookmarks, and a broken-link check that runs only when you ask." },
      { term: "Tab sweep", text: "File your open tabs into collections a batch at a time, then close them. Undo reopens them where they were." },
    ],
    more: { href: "/guide#trash", label: "Trash and cleanup in the guide" },
  },
  {
    id: "notes",
    nav: "Notes",
    title: "Write it down",
    promise: "Notes are your own writing, filed and tagged like bookmarks and linked to what they are about.",
    visual: "notes",
    points: [
      { term: "Markdown", text: "Bold, italic, code, lists and quotes, in an editor that stays out of the way." },
      { term: "Linked to your library", text: "Link a note to the bookmarks and collections it is about, and open them from the note." },
      { term: "Speak to type", text: "Dictate into a note with the mic button. Chrome’s speech service, run by Google, turns speech into text." },
      { term: "Locked notes", text: "Lock a note with a password and it is encrypted on this device. Hide its title too if you like." },
      { term: "Hide from AI", text: "Any note can be kept away from Ask Jupiter and connected agents. Locked notes always are." },
    ],
    more: { href: "/guide#notes", label: "Notes in the guide" },
  },
  {
    id: "graphs",
    nav: "Graphs",
    title: "Turn saves into a reading path",
    promise: "A graph puts bookmarks, collections and notes in the order you would read them.",
    visual: "graphs",
    points: [
      { term: "Built from what you saved", text: "A graph is a second view over items already in your library, never a separate copy." },
      { term: "Read as you go", text: "Open a bookmark’s details from the graph, mark it read, and watch the progress bar fill." },
      { term: "Collections as graphs", text: "Any collection can be opened as a graph of what is inside it." },
      { term: "Share or trash", text: "Share a graph as a link. A deleted graph goes to Trash, where you can restore it." },
    ],
    more: { href: "/guide#graphs", label: "Graphs in the guide" },
  },
  {
    id: "share",
    nav: "Sharing",
    title: "Share a link, not your library",
    promise: "Pick the bookmarks, collections, notes or graphs to share. Everything else stays on your device.",
    visual: "share",
    points: [
      { term: "Unlisted, public or password", text: "Unlisted links are for whoever you send them to. Public ones are listed on Explore. Password-protected ones are encrypted in your browser." },
      { term: "Live or a snapshot", text: "A live share updates as you edit, and pages already open refresh. A snapshot keeps the version you shared." },
      { term: "Comments, moderated", text: "Open, Approve first or Off, with blocked words and one queue for every share." },
      { term: "Expiry and revoke", text: "Links can expire after 7, 30 or 90 days, password shares can cap their views, and any link can be revoked. No account: a sharing code made on your device manages them." },
      { term: "Locked notes, if you choose", text: "Include them and viewers need each note’s own password; the note is opened in their browser." },
      { term: "Fork a share", text: "Save a share you were sent to your own library from the share page or with Import a share. A private share’s password is typed in the extension, and locked notes stay locked." },
    ],
    more: { href: "/guide#share", label: "Sharing in the guide" },
  },
  {
    id: "ask",
    nav: "Ask Jupiter",
    title: "Ask your library",
    promise: "An assistant that works on what you saved, with your own AI key, and changes nothing until you say so.",
    visual: "ask",
    points: [
      { term: "Your provider, your key", text: "Anthropic, OpenAI, Google, DeepSeek, xAI, Meta or OpenRouter. Pick a model, and refresh the list when providers add new ones." },
      { term: "Effort levels", text: "Low, Medium or High: how long the model thinks before it answers. Lower uses fewer tokens." },
      { term: "A locked key vault", text: "Keys are encrypted with your password on this device. Move them to another one with a transfer code or a QR code." },
      { term: "Proposals, then Apply", text: "Changes are staged for review. Apply them, discard them, or undo them afterwards." },
      { term: "Plans for bigger jobs", text: "A request with several steps gets a plan, and Jupiter keeps working through it until it is done." },
      { term: "Tool permissions", text: "Set each tool Off, Ask or On, or turn on read-only for every assistant at once." },
    ],
    more: { href: "/guide/ask-jupiter", label: "Read the Ask Jupiter guide" },
  },
  {
    id: "agents",
    nav: "Agents",
    title: "Work from your terminal",
    promise: "Claude Code and other MCP clients can search and organise your library through a bridge on your computer.",
    visual: "agents",
    points: [
      { term: "One line of config", text: "Add npx -y jupiter-jots-mcp to your client. No account, and no Jupiter Jots server in between." },
      { term: "Every write waits", text: "Saves and edits appear in Connected agents for you to approve or deny." },
      { term: "Its own permissions", text: "Agents have their own tool settings, and start stricter than Ask Jupiter." },
      { term: "Yours to cut off", text: "Turn the bridge off, revoke it, or repair the pairing at any time." },
    ],
    more: { href: "/guide/agents", label: "Read the agents guide" },
  },
  {
    id: "insights",
    nav: "Insights",
    title: "See what you go back to",
    promise: "Insights and the activity log are worked out on your computer from what you open and change.",
    visual: "insights",
    points: [
      { term: "Insights", text: "Opens per day, by collection, site and tag, when in the week you read, what you open most and what you never open." },
      { term: "Suggestions", text: "Small next steps, like tagging untagged links or giving a daily site a shortcut." },
      { term: "Activity log", text: "Every create, update and delete, filtered by action, item, who made it (you, Ask Jupiter or an agent) and when." },
      { term: "Titles, not contents", text: "Note and page text never go in the log. Pause it or clear it in Settings." },
    ],
    more: { href: "/guide#insights", label: "Insights in the guide" },
  },
  {
    id: "import",
    nav: "Import & export",
    title: "Move in, move out",
    promise: "Bring your bookmarks with you, and take all of it with you whenever you like.",
    visual: "import",
    points: [
      { term: "Import from Chrome", text: "Pick folders and they arrive as nested collections, with pages you already saved skipped." },
      { term: "From other apps", text: "Bookmarks HTML from any browser, CSV from Raindrop or Pocket, or a Jupiter Jots backup." },
      { term: "Undo an import", text: "A whole import comes back out in one step. Your Chrome bookmarks are never changed." },
      { term: "Export what you choose", text: "JSON, HTML or CSV, for the whole library, one collection or just the items you pick. Select in the Library, Notes or Collections and choose Export selected." },
      { term: "Backups restored", text: "Importing a backup brings back graphs, notes and chats, points at bookmarks you already have instead of duplicating them, and lets you choose the destination collection." },
    ],
    more: { href: "/guide#import", label: "Importing in the guide" },
  },
  {
    id: "privacy",
    nav: "Privacy",
    title: "Kept on your device",
    promise: "No account and no tracking. Your library lives in this browser.",
    visual: "privacy",
    points: [
      { term: "Stored locally", text: "Bookmarks, notes, collections and graphs live in IndexedDB on this computer." },
      { term: "Shares on our server", text: "Only what you share is uploaded. Password shares are encrypted first, so our server can’t read them." },
      { term: "AI goes straight to your provider", text: "Ask Jupiter sends requests from your browser to the provider you chose, never through us." },
      { term: "No analytics, no ads", text: "Nothing to sign up for, and nothing watching how you use it." },
    ],
    more: { href: "/privacy", label: "Read the privacy policy" },
  },
  {
    id: "settings",
    nav: "Settings",
    title: "Make it yours",
    promise: "A handful of settings that change how Jupiter Jots looks and saves.",
    visual: "settings",
    points: [
      { term: "Appearance", text: "System, light or dark, and denser cards to fit more on screen." },
      { term: "Saving defaults", text: "A default collection, saving with a single click, and whether to fetch page previews." },
      { term: "Shortcuts that open sites", text: "Up to nine keyboard shortcuts, each opening a site you choose." },
      { term: "Usage guide", text: "Tips for the library and Ask Jupiter, inside Settings." },
      { term: "Clear local data", text: "Delete the whole library from this device in one step, after a confirmation." },
    ],
    more: { href: "/guide#shortcuts", label: "Shortcuts in the guide" },
  },
]

/** Marked Coming soon in the extension. */
export const COMING_SOON = [
  { term: "Sync across devices", text: "Encrypted on your device before it is uploaded, with an optional account." },
  { term: "Reading reminders", text: "A nudge about what you saved to read." },
  { term: "Automatic backups", text: "A rolling local copy on a schedule. Until then, use Back up now." },
  { term: "More browsers and phones", text: "Firefox, Android and iOS." },
]
