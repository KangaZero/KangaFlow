// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { hrefForRoute } from "@/lib/pages"
import { buildSiteTools } from "@/lib/webmcp"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

// Registers the site's WebMCP tools for as long as this is mounted. Renders
// nothing — it exists to own an effect, like ShortcutDispatcher.
//
// `document.modelContext` is undefined in every browser without the origin
// trial or `chrome://flags/#enable-webmcp-testing`, so the guard is not
// optional: an unguarded read throws inside the layout, where nothing catches
// it.
export function WebMcp() {
  const router = useRouter()
  const { locale, setLocale } = useLocale()
  const { unlockAchievement } = useAchievements()

  // Everything the tools reach is held in refs and the effect depends on
  // nothing. A tool's `execute` runs long after registration, so capturing
  // these directly would leave it acting on the language and router that
  // existed when the page loaded — wrong the moment the user switches.
  const localeRef = useRef(locale)
  localeRef.current = locale
  const routerRef = useRef(router)
  routerRef.current = router
  const setLocaleRef = useRef(setLocale)
  setLocaleRef.current = setLocale
  const unlockRef = useRef(unlockAchievement)
  unlockRef.current = unlockAchievement

  useEffect(() => {
    const ctx = document.modelContext
    if (!ctx) return

    /**
     * Wrap a bridge action so an agent USING it unlocks "bleeding-edge".
     *
     * Generic over the wrapped signature rather than typed as
     * `SiteToolsBridge[keyof SiteToolsBridge]`: that is a UNION of the bridge's
     * three functions, so calling it takes the intersection of their
     * parameters — `navigate` wants a route and `setLocale` wants a locale, so
     * only a zero-arg call typechecks and both real actions are unreachable.
     * `<A, R>` keeps each call site's own arguments and return type.
     *
     * Unlocks AFTER the action, so a throw means no achievement — and the
     * throw is left to propagate. `execute` is where a tool reports failure to
     * the agent; swallowing it here would hand back a cheerful success message
     * for something that did not happen.
     */
    const withUnlock =
      <A extends readonly unknown[], R>(fn: (...args: A) => R) =>
      (...args: A): R => {
        const result = fn(...args)
        unlockRef.current("bleeding-edge")
        return result
      }

    const controller = new AbortController()
    const [listPages, goToPage, language] = buildSiteTools({
      // Deliberately NOT wrapped: the language tool calls this to READ the
      // current locale, so unlocking here would fire on a question rather than
      // on the agent doing something.
      currentLocale: () => localeRef.current,
      // `hrefForRoute`, not a hand-built template: it is the one place the
      // trailing slash and the "no basePath" rule live, and it returns
      // `PageHref` so this needs no cast.
      navigate: withUnlock((route) =>
        routerRef.current.push(hrefForRoute(localeRef.current, route))
      ),
      setLocale: withUnlock((next) => setLocaleRef.current(next)),
    })

    // Registered one at a time, not in a loop: each descriptor is generic over
    // its OWN argument keys, and iterating unions them — so the loop variable
    // becomes `WebMcpToolDescriptor<"language" | "page">` and every tool is
    // then required to declare every other tool's properties.
    const opts = { signal: controller.signal }
    void ctx.registerTool(listPages, opts)
    void ctx.registerTool(goToPage, opts)
    void ctx.registerTool(language, opts)
    // The spec's own unregister path: aborting the signal drops every tool.
    return () => controller.abort()
  }, [])

  return null
}
