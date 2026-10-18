import type { MDXComponents } from "mdx/types"
import Link from "next/link"

import { Faq } from "@/components/site/Faq"
import { Def, Defs, Kbd, Placeholder, Prose, Summary } from "@/components/site/Prose"
import { Section } from "@/components/site/Section"
import { GOVERNING_LAW, SUPPORT_EMAIL } from "@/lib/site"

/** Components every MDX page can use without importing them. */
const components: MDXComponents = {
  a: ({ href = "", ...p }) =>
    href.startsWith("/") || href.startsWith("#") ? <Link href={href} {...p} /> : <a href={href} {...p} />,
  Section,
  Prose,
  Summary,
  Defs,
  Def,
  Kbd,
  Faq,
  Placeholder,
  /** The support address from src/lib/site.ts, as a mailto link. */
  SupportEmail: () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>,
  /** The governing-law country from src/lib/site.ts, marked as a placeholder. */
  GoverningLaw: () => <Placeholder>{GOVERNING_LAW}</Placeholder>,
}

export function useMDXComponents(): MDXComponents {
  return components
}
