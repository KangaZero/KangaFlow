// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Single source of truth for the in-browser terminal's *page* model. The shell
// presents the site's routable pages as a flat directory tree: each page is a
// top-level dir holding one `index.tsx`, and `home` is the root (`~`) itself.
// `cd <page>` runs the real Next.js navigation; `cat`/`nvim` read the page's
// source; tab-completion offers the page names.
//
// Deliberately terminal-only: the real repo files stay keyed by their true paths
// (app/[lang]/.../page.tsx — see source.ts / PageCodeButton). The mapping
// between the true path and the terminal's `<dir>/index.tsx` lives here and
// nowhere else, so the two representations can't drift.

export type TerminalPage = {
  // Terminal-only display path shown by ls/cat/nvim: `<dir>/index.tsx`.
  file: string
  // cd target + directory name; `home` is the root (`~`).
  name: string
  // Route sub-path after the locale segment ("" = the locale root / home).
  route: string
  // Key into the real source-file map (source.ts) backing this page's content.
  source: string
}

export const TERMINAL_PAGES: readonly TerminalPage[] = [
  { file: "index.tsx", name: "home", route: "", source: "app/[lang]/page.tsx" },
  {
    file: "achievements/index.tsx",
    name: "achievements",
    route: "achievements",
    source: "app/[lang]/achievements/page.tsx",
  },
  {
    file: "environment/index.tsx",
    name: "environment",
    route: "environment",
    source: "app/[lang]/environment/page.tsx",
  },
  {
    file: "timeline/index.tsx",
    name: "timeline",
    route: "timeline",
    source: "app/[lang]/timeline/page.tsx",
  },
]

// Page names, sorted — the completion pool for `cd`.
export const TERMINAL_PAGE_NAMES: readonly string[] = TERMINAL_PAGES.map(
  (page) => page.name
)
  .slice()
  .sort()

export function pageByName(name: string): TerminalPage | undefined {
  return TERMINAL_PAGES.find((page) => page.name === name)
}

// Build the flat terminal file map (`<dir>/index.tsx` → source) from the real
// deep source map. Pages whose source is missing are simply skipped.
export function buildPageFiles(
  source: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const page of TERMINAL_PAGES) {
    const content = source[page.source]
    if (content !== undefined) out[page.file] = content
  }
  return out
}

// Map a real deep source path (e.g. a PageCodeButton `file` prop) to its flat
// terminal display file, or undefined if it isn't a known page.
export function flatFileForSource(sourcePath: string): string | undefined {
  return TERMINAL_PAGES.find((page) => page.source === sourcePath)?.file
}

// Which page a site route pathname (e.g. "/en/timeline") is currently on.
export function pageForRoute(pathname: string): TerminalPage | undefined {
  const [, ...rest] = pathname
    .split("/")
    .filter((segment) => segment.length > 0)
  const route = rest.join("/")
  return TERMINAL_PAGES.find((page) => page.route === route)
}

// The route href to navigate to for a page under a given locale.
export function hrefForPage(locale: string, page: TerminalPage): string {
  return page.route ? `/${locale}/${page.route}` : `/${locale}`
}
