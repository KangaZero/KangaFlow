"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"
import type { AvailableWidgetName } from "@/components/widgets/widget-management"
import type { Locale } from "@/lib/i18n"
import { hrefForRoute } from "@/lib/pages"
import { DEFAULT_THEME, type Theme } from "@/lib/themes"
import {
  buildSiteTools,
  WEBMCP_INTERACTIVE_ELEMENTS,
  webMcpToolResultConstructor,
} from "@/lib/webmcp"
import { useAchievements } from "@/providers/achievements-provider"
import { useGlobalStates } from "@/providers/global-state-provider"
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
  const { resolvedTheme, setTheme } = useTheme()
  const { unlockAchievement } = useAchievements()
  const {
    isAlarmOpen,
    isCalendarOpen,
    isMediaPlayerOpen,
    isNotesOpen,
    setIsAlarmOpen,
    setIsCalendarOpen,
    setIsMediaPlayerOpen,
    setIsNotesOpen,
  } = useGlobalStates()

  const widgetStates = {
    isAlarmOpen,
    isCalendarOpen,
    isMediaPlayerOpen,
    isNotesOpen,
    setIsAlarmOpen,
    setIsCalendarOpen,
    setIsMediaPlayerOpen,
    setIsNotesOpen,
  } as const

  // Everything the tools reach is held in refs and the effect depends on
  // nothing. A tool's `execute` runs long after registration, so capturing
  // these directly would leave it acting on the language and router that
  // existed when the page loaded — wrong the moment the user switches.
  const localeRef = useRef<Locale>(locale)
  localeRef.current = locale
  const themeRef = useRef<Theme>(resolvedTheme as Theme)
  themeRef.current = (resolvedTheme as Theme) ?? DEFAULT_THEME
  const routerRef = useRef(router)
  routerRef.current = router
  const setLocaleRef = useRef(setLocale)
  setLocaleRef.current = setLocale
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme
  const unlockRef = useRef(unlockAchievement)
  unlockRef.current = unlockAchievement
  const widgetsRef = useRef(widgetStates)
  widgetsRef.current = widgetStates

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
    const [listPages, goToPage, language, theme, workLocation, widgets] =
      buildSiteTools({
        // Deliberately NOT wrapped: the language/theme tool calls this to READ the
        // current locale, so unlocking here would fire on a question rather than
        // on the agent doing something.
        currentLocale: () => localeRef.current,
        currentTheme: () => themeRef.current,
        // `hrefForRoute`, not a hand-built template: it is the one place the
        // trailing slash and the "no basePath" rule live, and it returns
        // `PageHref` so this needs no cast.
        navigate: withUnlock((route) =>
          routerRef.current.push(hrefForRoute(localeRef.current, route))
        ),
        setCurrentTheme: withUnlock((theme) => setThemeRef.current(theme)),
        setLocale: withUnlock((next) => setLocaleRef.current(next)),
        showWidgetsState: (widgetNames) => {
          const result: Partial<Record<AvailableWidgetName, boolean>> = {}

          widgetNames.forEach((widget) => {
            switch (widget) {
              case "media-player":
                result[widget] = widgetsRef.current.isMediaPlayerOpen
                break
              case "alarm":
                result[widget] = widgetsRef.current.isAlarmOpen
                break
              case "calendar":
                result[widget] = widgetsRef.current.isCalendarOpen
                break
              case "notes":
                result[widget] = widgetsRef.current.isNotesOpen
                break
              default:
                break
            }
          })

          return result
        },
        showWorkLocation: () => {
          const headerDateTriggerEl = document.getElementById(
            WEBMCP_INTERACTIVE_ELEMENTS.headerDatePopoverPrimitiveTrigger
          )
          if (!headerDateTriggerEl)
            return webMcpToolResultConstructor(
              "Not on the homepage, navigate to home via 'kangaflow-go-to-page' tool",
              true
            )
          const isCurrentlyOpen =
            headerDateTriggerEl?.getAttribute("data-state") === "open"

          if (isCurrentlyOpen)
            return webMcpToolResultConstructor(
              "Work location component is already open"
            )
          headerDateTriggerEl?.click()
          return webMcpToolResultConstructor("Work location component opened")
        },
        toggleWidgets: (args) => {
          switch (args["media-player"]) {
            case true:
              widgetsRef.current.setIsMediaPlayerOpen(true)
              break
            case false:
              widgetsRef.current.setIsMediaPlayerOpen(false)
              break
            default:
              break // is not in args
          }
          switch (args.calendar) {
            case true:
              widgetsRef.current.setIsCalendarOpen(true)
              break
            case false:
              widgetsRef.current.setIsCalendarOpen(false)
              break
            default:
              break // is not in args
          }
          switch (args.alarm) {
            case true:
              widgetsRef.current.setIsAlarmOpen(true)
              break
            case false:
              widgetsRef.current.setIsAlarmOpen(false)
              break
            default:
              break // is not in args
          }
          switch (args.notes) {
            case true:
              widgetsRef.current.setIsNotesOpen(true)
              break
            case false:
              widgetsRef.current.setIsNotesOpen(false)
              break
            default:
              break // is not in args
          }

          return webMcpToolResultConstructor("Widget(s) toggled")
        },
      })

    // Registered one at a time, not in a loop: each descriptor is generic over
    // its OWN argument keys, and iterating unions them — so the loop variable
    // becomes `WebMcpToolDescriptor<"language" | "page">` and every tool is
    // then required to declare every other tool's properties.
    const opts = { signal: controller.signal }
    void ctx.registerTool(listPages, opts)
    void ctx.registerTool(goToPage, opts)
    void ctx.registerTool(language, opts)
    void ctx.registerTool(theme, opts)
    void ctx.registerTool(workLocation, opts)
    void ctx.registerTool(widgets, opts)
    // The spec's own unregister path: aborting the signal drops every tool.
    return () => controller.abort("what reason, idk webmcp tool template")
  }, [])

  return null
}
