/** Main navigation, shared by the header, the mobile menu and the footer. */
export const NAV = [
  { href: "/features", label: "Features", match: "/features" },
  { href: "/explore", label: "Explore", match: "/explore" },
  { href: "/guide", label: "Guide", match: "/guide" },
  { href: "/faq", label: "FAQ", match: "/faq" },
  { href: "/changelog", label: "Changelog", match: "/changelog" },
] as const

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      ["Features", "/features"],
      ["Explore shares", "/explore"],
      ["Guide", "/guide"],
      ["Ask Jupiter", "/guide/ask-jupiter"],
      ["Terminal agents", "/guide/agents"],
      ["Changelog", "/changelog"],
      ["FAQ", "/faq"],
    ],
  },
  { title: "Company", links: [["About", "/about"], ["Support", "/support"]] },
  { title: "Legal", links: [["Privacy policy", "/privacy"], ["Terms", "/terms"]] },
] as const

/** The guide's pages, in reading order: the tabs at the top of each and the pager at the bottom. */
export const GUIDE_STEPS = [
  {
    href: "/guide",
    label: "Basics",
    title: "Guide",
    blurb: "Install, save, organise, share and back up your library.",
  },
  {
    href: "/guide/ask-jupiter",
    label: "Ask Jupiter",
    title: "Ask Jupiter",
    blurb: "Ask your library questions with your own AI key, and approve every change it prepares.",
  },
  {
    href: "/guide/agents",
    label: "Terminal agents",
    title: "Agents in your terminal",
    blurb: "Connect Claude Code or another MCP client to your library, on this computer, with your approval.",
  },
] as const
