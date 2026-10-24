/** Main navigation, shared by the header, the mobile menu and the footer. */
export const NAV = [
  { href: "/#features", label: "Features", match: null },
  { href: "/explore", label: "Explore", match: "/explore" },
  { href: "/guide", label: "Guide", match: "/guide" },
  { href: "/faq", label: "FAQ", match: "/faq" },
  { href: "/changelog", label: "Changelog", match: "/changelog" },
] as const

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
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
