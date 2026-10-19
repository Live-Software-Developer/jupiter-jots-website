/**
 * Site-wide settings. Everything marked PLACEHOLDER must be replaced before launch
 * (the README lists them).
 */

/** The public URL of the site. SITE_URL at build time overrides it (e.g. for a staging host). */
export const SITE_URL = (process.env.SITE_URL ?? "https://jj.livesoftwaredeveloper.com").replace(/\/$/, "")

/** The Chrome Web Store listing. Every "Add to Chrome" link reads this. */
export const STORE_URL = "https://chromewebstore.google.com/detail/jupiter-jots/dnfmgdmobmoglemckapnbgncnfhkighd"

/** Where support and privacy questions go. */
export const SUPPORT_EMAIL = "support@livesoftwaredeveloper.com"

/** PLACEHOLDER. The country whose law governs the terms of use. */
export const GOVERNING_LAW = "[your country]"

/** Shown in the footer. Fixed, so pages stay fully static. */
export const COPYRIGHT_YEAR = 2026

export const SITE = {
  name: "Jupiter Jots",
  tagline: "Save the page. Keep the reason.",
  description:
    "Jupiter Jots is a free bookmark manager for Chrome that saves any page in one click, with a note on why it mattered. No account, no server: your library stays on your device.",
}
