// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Single source of truth for the site's routable pages (working rule 1).
//
// This used to live in `lib/terminal/pages.ts`, which made the TERMINAL the
// owner of the site's routes — so the header's <Link href>s, the navigation
// shortcuts and the terminal's `cd` each spelled "/en/timeline" for themselves
// and could drift apart. The route list is not a terminal concept; the terminal
// is one of its consumers, alongside the header, the shortcut dispatcher and
// the WebMCP navigation tools.
//
// Add a page to PAGE below and every one of those picks it up — including the
// `AppPath` template type, which is derived from these routes rather than
// re-listing them.

import type { Locale } from "@/lib/i18n"

/**
 * The pages, keyed by name.
 *
 * An object literal rather than an array + `Object.fromEntries` cast: the cast
 * was the only escape hatch in this file, and `as const satisfies` gives the
 * same lookup with every value kept LITERAL — `PAGE.timeline.route` is the type
 * `"timeline"`, not `string`. `satisfies` still enforces the shape, so a
 * missing `route` is an error rather than a silently wider type.
 */
export const PAGE = {
  achievements: { name: "achievements", route: "achievements" },
  environment: { name: "environment", route: "environment" },
  home: { name: "home", route: "" },
  timeline: { name: "timeline", route: "timeline" },
} as const satisfies Record<
  string,
  { readonly name: string; readonly route: string }
>

export type PageName = keyof typeof PAGE
export type PageLink = (typeof PAGE)[PageName]
/** "" | "achievements" | "timeline" | "environment" */
export type PageRoute = PageLink["route"]

export const PAGE_LINKS: readonly PageLink[] = Object.values(PAGE)
export const PAGE_NAMES: readonly PageName[] = Object.keys(PAGE) as PageName[]

/**
 * A route as it appears in a URL: "" for home, otherwise "<route>/".
 *
 * Conditional rather than a plain template, because `` `${""}/` `` is "/" —
 * which would make home `/en//`. `trailingSlash: true` means the slash belongs
 * on every page EXCEPT the locale root, and expressing that in the type keeps
 * `AppPath` honest instead of widening it to a string.
 */
export type PageSegment<R extends PageRoute = PageRoute> = R extends ""
  ? ""
  : `${R}/`

/**
 * Every valid in-app path. `globalStates` re-exports this as `AppPath`; it is
 * derived here so adding a page cannot leave the type behind.
 */
export type PageHref = `/${Locale}/${PageSegment}`

/**
 * The href for a page under a locale.
 *
 * `basePath` is NOT prepended — Next applies it, and doing it here would
 * produce /KangaFlow/KangaFlow/… in production.
 */
export function hrefForRoute(locale: Locale, route: PageRoute): PageHref {
  return route === "" ? `/${locale}/` : `/${locale}/${route}/`
}

/** Narrow an arbitrary string to a known page name. */
export function isPageName(value: string): value is PageName {
  return Object.hasOwn(PAGE, value)
}

export function pageByName(name: string): PageLink | undefined {
  return isPageName(name) ? PAGE[name] : undefined
}
