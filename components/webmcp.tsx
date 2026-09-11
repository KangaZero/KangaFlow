// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import type { AppPath } from "@/lib/globalStates"
import { buildNavigationTools } from "@/lib/webmcp"
import { useLocale } from "@/providers/locale-provider"

// Registers the site's WebMCP navigation tools for as long as this is mounted.
// Renders nothing — it exists to own an effect, like ShortcutDispatcher.
//
// `document.modelContext` is undefined in every browser without the origin trial
// or `chrome://flags/#enable-webmcp-testing`, so the guard is not optional: an
// unguarded read here throws inside the layout, where nothing catches it.
export function WebMcp() {
  const router = useRouter()
  const { locale } = useLocale()

  // The locale is held in a ref, and the effect deliberately depends on nothing.
  // A tool's `execute` is called long after registration, so capturing `locale`
  // directly would navigate to whatever language was active when the page
  // loaded — wrong the moment the user switches.
  const localeRef = useRef(locale)
  localeRef.current = locale
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const ctx = document.modelContext
    if (!ctx) return

    const controller = new AbortController()
    const tools = buildNavigationTools((route) => {
      // Same shape ShortcutDispatcher's goHome/goTimeline use — the trailing
      // slash matches `trailingSlash: true`, and `basePath` is applied by the
      // router, so it must NOT be prepended here.
      const path =
        `/${localeRef.current}/${route ? `${route}/` : ""}` as AppPath
      routerRef.current.push(path)
    })

    for (const tool of tools) {
      void ctx.registerTool(tool, { signal: controller.signal })
    }
    // The spec's own unregister path: aborting the signal drops every tool.
    return () => controller.abort()
  }, [])

  return null
}
