/** Main navigation, shared by the header, the mobile menu and the footer. */
export const NAV = [
  { href: "/#features", label: "Features", match: null },
  { href: "/guide", label: "Guide", match: "/guide" },
  { href: "/faq", label: "FAQ", match: "/faq" },
  { href: "/changelog", label: "Changelog", match: "/changelog" },
] as const

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
      ["Guide", "/guide"],
      ["Changelog", "/changelog"],
      ["FAQ", "/faq"],
    ],
  },
  { title: "Company", links: [["About", "/about"], ["Support", "/support"]] },
  { title: "Legal", links: [["Privacy policy", "/privacy"], ["Terms", "/terms"]] },
] as const
