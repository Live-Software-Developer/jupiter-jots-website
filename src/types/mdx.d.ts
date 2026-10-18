// Content pages export their table of contents next to the copy.
declare module "*.mdx" {
  export const toc: { id: string; label: string }[]
}
