"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  FileCode2,
  Globe,
  Image as ImageIcon,
  Languages,
  type LucideIcon,
  Music,
  Settings,
  SquareTerminal,
  User,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { BorderRadius } from "@/components/niri/settings"
import type { AppId } from "@/components/niri/types"
import { LOCALES, type Locale } from "@/lib/i18n"
import { THEMES, type Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"
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

// Searchable result — either an app or a system action.
type SearchResult =
  | { kind: "app"; app: LauncherApp; index: number }
  | { kind: "action"; action: SystemAction; index: number }

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
  const { theme, toggleTheme, isMediaPlayerOpen, setIsMediaPlayerOpen } =
    useGlobalStates()

  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const needle = query.trim().toLowerCase()

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
          onOpenSettings()
          onClose()
        },
        sublabel: translate("environment.settings.title"),
      },
      {
        icon: ImageIcon,
        id: "wallpaper",
        label: translate("environment.settings.wallpaper"),
        onSelect: () => {
          onOpenWallpaper()
          onClose()
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
    ],
    [
      theme,
      locale,
      isMediaPlayerOpen,
      toggleTheme,
      setLocale,
      setIsMediaPlayerOpen,
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

  // Flat list of all results for unified keyboard navigation.
  const allResults: SearchResult[] = useMemo(() => {
    const appResults: SearchResult[] = filteredApps.map((app, i) => ({
      app,
      index: i,
      kind: "app",
    }))
    const actionResults: SearchResult[] = filteredActions.map((action, i) => ({
      action,
      index: appResults.length + i,
      kind: "action",
    }))
    return [...appResults, ...actionResults]
  }, [filteredApps, filteredActions])

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

  const showEmpty = filteredApps.length === 0 && filteredActions.length === 0

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
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
                className="w-full bg-transparent px-2 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
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

            <div className="max-h-[28rem] overflow-y-auto p-2">
              {showEmpty ? (
                <p className="px-3 py-6 text-center text-muted-foreground text-sm">
                  {translate("environment.launcher.empty")}
                </p>
              ) : (
                <>
                  {filteredApps.length > 0 ? (
                    <div>
                      <p className="px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        {translate("environment.launcher.applications")}
                      </p>
                      {filteredApps.map((app) => {
                        const Icon = APP_ICONS[app.id]
                        const flatIndex = allResults.findIndex(
                          (r) => r.kind === "app" && r.app.id === app.id
                        )
                        const selected = flatIndex === highlight
                        return (
                          <button
                            aria-selected={selected}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted/60"
                            )}
                            key={app.id}
                            onClick={() => {
                              onLaunch(app.id)
                              onClose()
                            }}
                            onMouseMove={() => setHighlight(flatIndex)}
                            role="option"
                            type="button"
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-5 shrink-0"
                            />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium text-sm">
                                {app.name}
                              </span>
                              <span
                                className={cn(
                                  "truncate text-xs",
                                  selected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {app.subtitle}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  {filteredActions.length > 0 ? (
                    <div
                      className={
                        filteredApps.length > 0
                          ? "mt-1 border-border/40 border-t pt-1"
                          : ""
                      }
                    >
                      <p className="px-3 py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        {translate("environment.launcher.system")}
                      </p>
                      {filteredActions.map((action) => {
                        const Icon = action.icon
                        const flatIndex = allResults.findIndex(
                          (r) =>
                            r.kind === "action" && r.action.id === action.id
                        )
                        const selected = flatIndex === highlight
                        return (
                          <button
                            aria-selected={selected}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted/60"
                            )}
                            key={action.id}
                            onClick={action.onSelect}
                            onMouseMove={() => setHighlight(flatIndex)}
                            role="option"
                            type="button"
                          >
                            <div
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center",
                                action.active && !selected && "text-primary"
                              )}
                            >
                              <Icon aria-hidden="true" className="size-4" />
                            </div>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium text-sm">
                                {action.label}
                              </span>
                              <span
                                className={cn(
                                  "truncate text-xs",
                                  selected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {action.sublabel}
                              </span>
                            </span>
                            {action.active && !selected ? (
                              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
