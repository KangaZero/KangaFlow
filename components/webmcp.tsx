"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

import { PORTFOLIOS } from "@/components/timeline-portfolios"
import { WebMcpActivity } from "@/components/webmcp-activity"
import type { Locale } from "@/lib/i18n"
import { hrefForRoute, type PageName, pageFromPathname } from "@/lib/pages"
import { DEFAULT_THEME, isTheme, type Theme } from "@/lib/themes"
import {
  buildSiteTools,
  toolError,
  toolNameOf,
  toolOk,
  WEBMCP_INTERACTIVE_ELEMENTS,
  type WebMcpToolName,
} from "@/lib/webmcp"
import type { AvailableWidgetName } from "@/lib/widgets"
import { useAchievements } from "@/providers/achievements-provider"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

type WidgetControl = { open: boolean; setOpen: (open: boolean) => void }

// How long the activity pill lingers after an agent starts a call. The spec
// has no "finished" event (only activated/cancel), so it times out instead.
const ACTIVITY_MS = 2500

// Registers the site's WebMCP tools for as long as this is mounted, and shows
// a pill naming the tool whenever an agent runs one.
//
// `document.modelContext` is undefined in every browser without the origin
// trial or `chrome://flags/#enable-webmcp-testing`, so the guard is not
// optional: an unguarded read throws inside the layout, where nothing catches
// it.
export function WebMcp() {
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale } = useLocale()
  const { resolvedTheme, setTheme } = useTheme()
  const { achievements, unlockAchievement } = useAchievements()
  const [activeTool, setActiveTool] = useState<WebMcpToolName | null>(null)
  const {
    isAlarmOpen,
    isCalendarOpen,
    isKeyboardOpen,
    isMediaPlayerOpen,
    isNotesOpen,
    setIsAlarmOpen,
    setIsCalendarOpen,
    setIsKeyboardOpen,
    setIsMediaPlayerOpen,
    setIsNotesOpen,
  } = useGlobalStates()

  // One entry per widget, keyed by the registry's names. A Record over
  // AvailableWidgetName, so a widget added to lib/widgets without a control
  // here fails the build instead of being silently ignored by the tool.
  const widgets: Record<AvailableWidgetName, WidgetControl> = {
    alarm: { open: isAlarmOpen, setOpen: setIsAlarmOpen },
    calendar: { open: isCalendarOpen, setOpen: setIsCalendarOpen },
    keyboard: { open: isKeyboardOpen, setOpen: setIsKeyboardOpen },
    "media-player": { open: isMediaPlayerOpen, setOpen: setIsMediaPlayerOpen },
    notes: { open: isNotesOpen, setOpen: setIsNotesOpen },
  }

  // Everything the tools reach is held in refs and the effect depends on
  // nothing. A tool's `execute` runs long after registration, so capturing
  // these directly would leave it acting on the language and router that
  // existed when the page loaded — wrong the moment the user switches.
  const localeRef = useRef<Locale>(locale)
  localeRef.current = locale
  // next-themes types `resolvedTheme` as a plain string (undefined before
  // mount), so it is narrowed with the project's guard rather than cast.
  const themeRef = useRef<Theme>(DEFAULT_THEME)
  themeRef.current = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME
  // usePathname, not location.pathname: it excludes the production basePath.
  const pageRef = useRef<PageName | undefined>(undefined)
  pageRef.current = pageFromPathname(pathname)
  const routerRef = useRef(router)
  routerRef.current = router
  const setLocaleRef = useRef(setLocale)
  setLocaleRef.current = setLocale
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme
  const unlockRef = useRef(unlockAchievement)
  unlockRef.current = unlockAchievement
  const widgetsRef = useRef(widgets)
  widgetsRef.current = widgets
  const achievementsRef = useRef(achievements)
  achievementsRef.current = achievements

  useEffect(() => {
    const ctx = document.modelContext
    if (!ctx) return

    /**
     * Wrap a bridge action so an agent USING it unlocks "bleeding-edge".
     *
     * Generic over the wrapped signature rather than typed as
     * `SiteToolsBridge[keyof SiteToolsBridge]`: that is a UNION of the bridge's
     * functions, so calling it takes the intersection of their parameters —
     * `navigate` wants a route and `setLocale` wants a locale, so only a
     * zero-arg call typechecks and both real actions are unreachable.
     * `<A, R>` keeps each call site's own arguments and return type.
     *
     * Unlocks AFTER the action, so a throw means no achievement.
     */
    const withUnlock =
      <A extends readonly unknown[], R>(fn: (...args: A) => R) =>
      (...args: A): R => {
        const result = fn(...args)
        unlockRef.current("bleeding-edge")
        return result
      }

    const controller = new AbortController()
    const [
      listPages,
      goToPage,
      language,
      theme,
      workLocation,
      widgetTool,
      achievementsTool,
      profile,
      timeline,
    ] = buildSiteTools({
      achievements: () => achievementsRef.current,
      // Getters are deliberately NOT wrapped: reading state is a question,
      // and the achievement is for the agent doing something.
      currentLocale: () => localeRef.current,
      currentPage: () => pageRef.current,
      currentTheme: () => themeRef.current,
      // `hrefForRoute`, not a hand-built template: it is the one place the
      // trailing slash and the "no basePath" rule live, and it returns
      // `PageHref` so this needs no cast.
      navigate: withUnlock((route) =>
        routerRef.current.push(hrefForRoute(localeRef.current, route))
      ),
      portfolios: PORTFOLIOS,
      setCurrentTheme: withUnlock((next) => setThemeRef.current(next)),
      setLocale: withUnlock((next) => setLocaleRef.current(next)),
      setWidgetOpen: withUnlock((widget, open) =>
        widgetsRef.current[widget].setOpen(open)
      ),
      showWorkLocation: () => {
        const trigger = document.getElementById(
          WEBMCP_INTERACTIVE_ELEMENTS.headerDatePopoverPrimitiveTrigger
        )
        if (!trigger)
          return toolError(
            "Not on the home page. Go there with kangaflow-go-to-page first."
          )
        if (trigger.getAttribute("data-state") === "open")
          return toolOk("The work location popover is already open.")
        trigger.click()
        unlockRef.current("bleeding-edge")
        return toolOk("Opened the work location popover.")
      },
      widgetStates: () => {
        const current = widgetsRef.current
        return {
          alarm: current.alarm.open,
          calendar: current.calendar.open,
          keyboard: current.keyboard.open,
          "media-player": current["media-player"].open,
          notes: current.notes.open,
        }
      },
    })

    // Registered one at a time, not in a loop: each descriptor is generic over
    // its OWN argument keys, and iterating unions them — so the loop variable
    // becomes `WebMcpToolDescriptor<"language" | "page">` and every tool is
    // then required to declare every other tool's properties.
    const opts = { signal: controller.signal }
    // registerTool returns a promise that REJECTS on a duplicate or invalid
    // name, a `tools` permissions-policy denial, or an already-aborted signal.
    // `void` used to drop that on the floor as an unhandled rejection. An
    // abort is our own cleanup (Strict Mode's dev re-mount), so it is quiet;
    // anything else is a real bug in a descriptor and is reported.
    const report = (error: unknown) => {
      if (controller.signal.aborted) return
      console.error("WebMCP: tool registration failed", error)
    }
    ctx.registerTool(listPages, opts).catch(report)
    ctx.registerTool(goToPage, opts).catch(report)
    ctx.registerTool(language, opts).catch(report)
    ctx.registerTool(theme, opts).catch(report)
    ctx.registerTool(workLocation, opts).catch(report)
    ctx.registerTool(widgetTool, opts).catch(report)
    ctx.registerTool(achievementsTool, opts).catch(report)
    ctx.registerTool(profile, opts).catch(report)
    ctx.registerTool(timeline, opts).catch(report)

    // Show which tool an agent is running. The same signal removes these
    // listeners on unmount, so registration and listening share one lifetime.
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    const hide = () => {
      clearTimeout(hideTimer)
      setActiveTool(null)
    }
    ctx.addEventListener(
      "toolactivated",
      (event) => {
        const name = toolNameOf(event)
        if (!name) return
        clearTimeout(hideTimer)
        setActiveTool(name)
        hideTimer = setTimeout(hide, ACTIVITY_MS)
      },
      opts
    )
    ctx.addEventListener("toolcancel", hide, opts)
    controller.signal.addEventListener("abort", () => clearTimeout(hideTimer))
    // The spec's only unregister path (unregisterTool() was removed): aborting
    // the registration signal drops every tool. The reason is not sent to the
    // agent; it is what `signal.reason` holds for anything else listening, so
    // it is a real AbortError DOMException (what a bare abort() would produce)
    // with a message that says WHY, not a bare string.
    return () =>
      controller.abort(
        new DOMException(
          "WebMcp unmounted: unregistering the site's tools",
          "AbortError"
        )
      )
  }, [])

  return <WebMcpActivity tool={activeTool} />
}
