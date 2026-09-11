// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { hrefForRoute } from "@/lib/pages"
import { buildSiteTools } from "@/lib/webmcp"
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

  useEffect(() => {
    const ctx = document.modelContext
    if (!ctx) return

    const controller = new AbortController()
    const [listPages, goToPage, language] = buildSiteTools({
      currentLocale: () => localeRef.current,
      // `hrefForRoute`, not a hand-built template: it is the one place the
      // trailing slash and the "no basePath" rule live, and it returns
      // `PageHref` so this needs no cast.
      navigate: (route) =>
        routerRef.current.push(hrefForRoute(localeRef.current, route)),
      setLocale: (next) => setLocaleRef.current(next),
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
