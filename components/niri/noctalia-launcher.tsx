"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  AlarmClock,
  CalendarDays,
  FileCode2,
  Globe,
  Image as ImageIcon,
  Languages,
  type LucideIcon,
  Music,
  NotebookPen,
  Pin,
  Settings,
  SquareTerminal,
  User,
} from "lucide-react"
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { BorderRadius } from "@/components/niri/settings"
import type { AppId } from "@/components/niri/types"
import { LOCALES, type Locale } from "@/lib/i18n"
import { THEMES, type Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

export type LauncherApp = { id: AppId; name: string; subtitle: string }

type SystemAction = {
  id: string
  label: string
  sublabel: string
  icon: LucideIcon
  active?: boolean
  onSelect: () => void
}

type SearchResult =
  | { kind: "app"; app: LauncherApp; resultId: string; index: number }
  | { kind: "action"; action: SystemAction; resultId: string; index: number }

const APP_ICONS: Record<AppId, LucideIcon> = {
  about: User,
  browser: Globe,
  editor: FileCode2,
  terminal: SquareTerminal,
}

const THEME_ICONS: Record<Theme, LucideIcon> = {
  dark: SquareTerminal,
  light: Globe,
  terminal: FileCode2,
}

const PINS_STORAGE_KEY = "kangaflow:launcherPins"

function loadPins(): ReadonlySet<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(PINS_STORAGE_KEY) ?? "[]"
    )
    return new Set(Array.isArray(raw) ? (raw as string[]) : [])
  } catch {
    return new Set()
  }
}

export function NoctaliaLauncher(props: {
  open: boolean
  apps: LauncherApp[]
  onLaunch: (id: AppId) => void
  onClose: () => void
  launcherRadius: BorderRadius
  onOpenSettings: () => void
  onOpenWallpaper: () => void
}): React.JSX.Element {
  const {
    open,
    apps,
    onLaunch,
    onClose,
    launcherRadius,
    onOpenSettings,
    onOpenWallpaper,
  } = props
  const { locale, setLocale, translate } = useLocale()
  const {
    theme,
    toggleTheme,
    isMediaPlayerOpen,
    setIsMediaPlayerOpen,
    isNotesOpen,
    setIsNotesOpen,
    isAlarmOpen,
    setIsAlarmOpen,
    isCalendarOpen,
    setIsCalendarOpen,
  } = useGlobalStates()

  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(loadPins)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const needle = query.trim().toLowerCase()

  const togglePin = (resultId: string): void => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(resultId)) next.delete(resultId)
      else next.add(resultId)
      window.localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const filteredApps = useMemo(() => {
    if (needle === "") return apps
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(needle) ||
        app.subtitle.toLowerCase().includes(needle)
    )
  }, [apps, needle])

  // Build system actions fresh on each render so they reflect current state.
  const systemActions: SystemAction[] = useMemo(
    () => [
      ...THEMES.map(
        (t): SystemAction => ({
          active: theme === t,
          icon: THEME_ICONS[t],
          id: `theme-${t}`,
          label: translate(`theme.${t}`),
          onSelect: () => {
            void toggleTheme(t, 250)
            onClose()
          },
          sublabel: translate("environment.settings.theme"),
        })
      ),
      ...LOCALES.map(
        (loc): SystemAction => ({
          active: locale === loc,
          icon: Languages,
          id: `locale-${loc}`,
          label: translate(`command.locales.${loc}`),
          onSelect: () => {
            setLocale(loc as Locale)
            onClose()
          },
          sublabel: translate("settings.actions.toggleLanguage"),
        })
      ),
      {
        icon: Settings,
        id: "settings",
        label: translate("nav.settings"),
        onSelect: () => {
          //! Order is important, else it will not open
          onClose()
          onOpenSettings()
        },
        sublabel: translate("environment.settings.title"),
      },
      {
        icon: ImageIcon,
        id: "wallpaper",
        label: translate("environment.settings.wallpaper"),
        onSelect: () => {
          //! Order is important, else it will not open
          onClose()
          onOpenWallpaper()
        },
        sublabel: translate("environment.settings.wallpaperHint"),
      },
      {
        active: isMediaPlayerOpen,
        icon: Music,
        id: "media-player",
        label: translate("mediaPlayer.title"),
        onSelect: () => {
          setIsMediaPlayerOpen(!isMediaPlayerOpen)
          onClose()
        },
        sublabel: translate("settings.actions.openMediaPlayer"),
      },
      {
        active: isNotesOpen,
        icon: NotebookPen,
        id: "notes-widget",
        label: translate("widgets.notes.title"),
        onSelect: () => {
          setIsNotesOpen(!isNotesOpen)
          onClose()
        },
        sublabel: translate("widgets.notes.sublabel"),
      },
      {
        active: isAlarmOpen,
        icon: AlarmClock,
        id: "alarm-widget",
        label: translate("widgets.alarm.title"),
        onSelect: () => {
          setIsAlarmOpen(!isAlarmOpen)
          onClose()
        },
        sublabel: translate("widgets.alarm.sublabel"),
      },
      {
        active: isCalendarOpen,
        icon: CalendarDays,
        id: "calendar-widget",
        label: translate("widgets.calendar.title"),
        onSelect: () => {
          setIsCalendarOpen(!isCalendarOpen)
          onClose()
        },
        sublabel: translate("widgets.calendar.sublabel"),
      },
    ],
    [
      theme,
      locale,
      isMediaPlayerOpen,
      isNotesOpen,
      isAlarmOpen,
      isCalendarOpen,
      toggleTheme,
      setLocale,
      setIsMediaPlayerOpen,
      setIsNotesOpen,
      setIsAlarmOpen,
      setIsCalendarOpen,
      onClose,
      onOpenSettings,
      onOpenWallpaper,
      translate,
    ]
  )

  const filteredActions = useMemo(() => {
    if (needle === "") return systemActions
    return systemActions.filter(
      (a) =>
        a.label.toLowerCase().includes(needle) ||
        a.sublabel.toLowerCase().includes(needle)
    )
  }, [systemActions, needle])

  // Flat list in render order: pinned first, then unpinned apps, then unpinned actions.
  // The index field mirrors position in this list so keyboard nav and scroll tracking agree.
  const allResults: SearchResult[] = useMemo(() => {
    const appEntries = filteredApps.map((app) => ({
      app,
      kind: "app" as const,
      resultId: `app:${app.id}`,
    }))
    const actionEntries = filteredActions.map((action) => ({
      action,
      kind: "action" as const,
      resultId: `action:${action.id}`,
    }))
    const all = [...appEntries, ...actionEntries]
    const pinned = all.filter((r) => pinnedIds.has(r.resultId))
    const unpinned = all.filter((r) => !pinnedIds.has(r.resultId))
    return [...pinned, ...unpinned].map((r, i) => ({ ...r, index: i }))
  }, [filteredApps, filteredActions, pinnedIds])

  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  useEffect(() => {
    setHighlight((current) => {
      if (allResults.length === 0) return 0
      return Math.min(current, allResults.length - 1)
    })
  }, [allResults])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the highlighted row scrolled into view on arrow-key navigation.
  // Instant under reduced motion (raw scroll animation outside framer/CSS).
  useEffect(() => {
    scrollContainerRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
      ?.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "nearest",
      })
  }, [highlight, shouldReduceMotion])

  const dispatch = (result: SearchResult): void => {
    if (result.kind === "app") {
      onLaunch(result.app.id)
      onClose()
    } else {
      result.action.onSelect()
    }
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault()
        setHighlight((current) =>
          allResults.length === 0
            ? 0
            : Math.min(current + 1, allResults.length - 1)
        )
        break
      }
      case "ArrowUp": {
        event.preventDefault()
        setHighlight((current) => Math.max(current - 1, 0))
        break
      }
      case "Enter": {
        event.preventDefault()
        const target = allResults[highlight]
        if (target) dispatch(target)
        break
      }
      case "Escape": {
        event.preventDefault()
        onClose()
        break
      }
      default:
        break
    }
  }

  const handleQueryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setQuery(event.target.value)
    setHighlight(0)
  }

  const pinnedResults = allResults.filter((r) => pinnedIds.has(r.resultId))
  const unpinnedAppResults = allResults.filter(
    (r) => r.kind === "app" && !pinnedIds.has(r.resultId)
  )
  const unpinnedActionResults = allResults.filter(
    (r) => r.kind === "action" && !pinnedIds.has(r.resultId)
  )
  const showEmpty = allResults.length === 0

  const renderRow = (result: SearchResult): React.JSX.Element => {
    const selected = result.index === highlight
    const isPinned = pinnedIds.has(result.resultId)
    const isActive =
      result.kind === "action" && result.action.active === true && !selected

    const Icon =
      result.kind === "app" ? APP_ICONS[result.app.id] : result.action.icon
    const label = result.kind === "app" ? result.app.name : result.action.label
    const sublabel =
      result.kind === "app" ? result.app.subtitle : result.action.sublabel

    const handleClick = (): void => {
      if (result.kind === "app") {
        onLaunch(result.app.id)
        onClose()
      } else {
        result.action.onSelect()
      }
    }

    return (
      <motion.div
        className={cn(
          "group flex items-center rounded-xl transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted/60"
        )}
        data-idx={result.index}
        key={result.resultId}
        layout
        layoutId={result.resultId}
        transition={{ damping: 20, mass: 0.8, stiffness: 320, type: "spring" }}
      >
        <button
          aria-selected={selected}
          className="flex flex-1 items-center gap-3 px-3 py-2.5 text-left"
          onClick={handleClick}
          onMouseMove={() => setHighlight(result.index)}
          role="option"
          type="button"
        >
          <div
            className={cn(
              "flex size-5 shrink-0 items-center justify-center",
              isActive && "text-primary"
            )}
          >
            <Icon
              aria-hidden="true"
              className={result.kind === "app" ? "size-5" : "size-4"}
            />
          </div>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-sm">{label}</span>
            <span
              className={cn(
                "truncate text-xs",
                selected
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              {sublabel}
            </span>
          </span>
          {isActive ? (
            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          ) : null}
        </button>
        <button
          aria-label={
            isPinned
              ? translate("environment.launcher.unpin")
              : translate("environment.launcher.pin")
          }
          className={cn(
            "mr-1 flex size-7 shrink-0 items-center justify-center rounded-lg transition-opacity",
            selected
              ? "text-primary-foreground/70 hover:text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
            isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation()
            togglePin(result.resultId)
          }}
          type="button"
        >
          <Pin className={cn("size-3.5", isPinned && "fill-current")} />
        </button>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 flex items-start justify-center pt-[18vh]"
          style={{ zIndex: Z_LAYERS.panel }}
        >
          <button
            aria-label={translate("environment.launcher.close")}
            className="fixed inset-0 cursor-default bg-background/40"
            onClick={onClose}
            type="button"
          />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={translate("environment.launcher.title")}
            aria-modal="true"
            className="relative z-10 w-[min(32rem,90vw)] overflow-hidden border border-border bg-card/90 text-foreground shadow-2xl backdrop-blur-xl"
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            role="dialog"
            style={{ borderRadius: `${launcherRadius}px` }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="border-border/60 border-b p-3">
              <input
                aria-label={translate("environment.launcher.search")}
                className="wwfull bg-transparent px-2 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                placeholder={translate(
                  "environment.launcher.searchPlaceholder"
                )}
                ref={inputRef}
                type="text"
                value={query}
              />
            </div>

            <div
              className="no-scrollbar! max-h-112 overflow-y-auto p-2"
              ref={scrollContainerRef}
            >
              {showEmpty ? (
                <p className="px-3 py-6 text-center text-muted-foreground text-sm">
                  {translate("environment.launcher.empty")}
                </p>
              ) : (
                <LayoutGroup>
                  {pinnedResults.length > 0 ? (
                    <div>
                      <p className="px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        {translate("environment.launcher.pinned")}
                      </p>
                      {pinnedResults.map(renderRow)}
                    </div>
                  ) : null}

                  {unpinnedAppResults.length > 0 ? (
                    <div
                      className={
                        pinnedResults.length > 0
                          ? "mt-1 border-border/40 border-t pt-1"
                          : ""
                      }
                    >
                      <p className="px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        {translate("environment.launcher.applications")}
                      </p>
                      {unpinnedAppResults.map(renderRow)}
                    </div>
                  ) : null}

                  {unpinnedActionResults.length > 0 ? (
                    <div
                      className={
                        pinnedResults.length > 0 ||
                        unpinnedAppResults.length > 0
                          ? "mt-1 border-border/40 border-t pt-1"
                          : ""
                      }
                    >
                      <p className="px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        {translate("environment.launcher.system")}
                      </p>
                      {unpinnedActionResults.map(renderRow)}
                    </div>
                  ) : null}
                </LayoutGroup>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
