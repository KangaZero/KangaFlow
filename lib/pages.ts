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

import { isLocale, type Locale } from "@/lib/i18n"

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

/**
 * The order pages appear in the header dock and footer nav. Typed against
 * PageName, so a renamed or removed page fails the build instead of linking
 * nowhere. The page-header eyebrow ("02 / 04") is numbered from this too.
 */
export const NAV_ORDER = [
  "home",
  "achievements",
  "timeline",
  "environment",
] as const satisfies readonly PageName[]

/**
 * A page's 1-based place in NAV_ORDER as a zero-padded "NN / NN" label.
 * Every PageName is in NAV_ORDER today; one added to PAGE but not to the nav
 * gets `undefined` rather than a fabricated "00".
 */
export function navPositionLabel(name: PageName): string | undefined {
  const index = NAV_ORDER.indexOf(name)
  if (index === -1) return undefined
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${pad(index + 1)} / ${pad(NAV_ORDER.length)}`
}

/**
 * Which page a pathname is on, or undefined for one that is not a page.
 *
 * Anchored on the LOCALE segment rather than the start of the string, so it
 * reads both `usePathname()` ("/en/timeline/") and `location.pathname`, which
 * in production carries the basePath ("/KangaFlow/en/timeline/"). A regex
 * anchored at `^/(en|ja)` silently misread every production URL as "not the
 * environment page".
 */
export function pageFromPathname(pathname: string): PageName | undefined {
  const segments = pathname.split("/").filter((segment) => segment !== "")
  const localeIndex = segments.findIndex((segment) => isLocale(segment))
  if (localeIndex === -1) return undefined
  const route = segments[localeIndex + 1] ?? ""
  return PAGE_LINKS.find((page) => page.route === route)?.name
}
