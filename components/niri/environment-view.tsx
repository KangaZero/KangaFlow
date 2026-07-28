"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { SquareIcon, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { AboutWindow } from "@/components/niri/apps/about-window"
import { BrowserWindow } from "@/components/niri/apps/browser-window"
import {
  getFocusedWindow,
  initialNiriState,
  niriReducer,
} from "@/components/niri/engine"
import { keyToAction } from "@/components/niri/keymap"
import { NoctaliaBar } from "@/components/niri/noctalia-bar"
import {
  type LauncherApp,
  NoctaliaLauncher,
} from "@/components/niri/noctalia-launcher"
import { NoctaliaSettings } from "@/components/niri/noctalia-settings"
import {
  DEFAULT_ENV_SETTINGS,
  type EnvSettings,
} from "@/components/niri/settings"
import type { AppId, NiriWindow } from "@/components/niri/types"
import { wallpaperStyle } from "@/components/niri/wallpaper"
import { WallpaperDialog } from "@/components/niri/wallpaper-dialog"
import { readSourceFiles } from "@/lib/terminal/source"
import { DEFAULT_THEME, isTheme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// xterm / CodeMirror reach for `document` at import, so the two heavy app
// windows load client-only (mirrors terminal-dialog's boundary).
const TerminalBody = dynamic(
  () => import("@/components/terminal-body").then((m) => m.TerminalBody),
  { ssr: false }
)
const CodeEditor = dynamic(
  () => import("@/components/code-editor").then((m) => m.CodeEditor),
  { ssr: false }
)

// Launcher order (ids only) — display strings come from i18n at render time.
const LAUNCHER_APP_IDS: readonly AppId[] = [
  "terminal",
  "editor",
  "about",
  "browser",
]

const GAP = 6
const PAD = 6

type Hour = `${number}` & { _brand: "Hour" }
type Minute = `${number}` & { _brand: "Minute" }

function clockNowInHHMM(): `${Hour}:${Minute}` {
  const d = new Date()
  const hours = String(d.getHours()).padStart(2, "0") as Hour
  const minutes = String(d.getMinutes()).padStart(2, "0") as Minute
  return `${hours}:${minutes}`
}

function WindowContent({
  win,
  files,
  dark,
  routePath,
  onClose,
}: {
  win: NiriWindow
  files: Record<string, string>
  dark: boolean
  routePath: string
  onClose: () => void
}) {
  switch (win.app) {
    case "terminal":
      return (
        <TerminalBody
          files={files}
          initialFile={null}
          onClose={onClose}
          routePath={routePath}
        />
      )
    case "editor":
      return (
        <CodeEditor
          dark={dark}
          onClose={onClose}
          value={Object.values(files)[0] ?? "// no source"}
        />
      )
    case "about":
      return <AboutWindow />
    case "browser":
      return <BrowserWindow />
    default:
      return null
  }
}

export function EnvironmentView() {
  const { translate, locale } = useLocale()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme !== "light"
  const theme = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME
  const pathname = usePathname()

  const [state, dispatch] = useReducer(niriReducer, undefined, initialNiriState)
  const [settings, setSettings] = useState<EnvSettings>(DEFAULT_ENV_SETTINGS)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [wallpaperOpen, setWallpaperOpen] = useState(false)
  const [clock, setClock] = useState(clockNowInHHMM)
  const [stripWidth, setStripWidth] = useState(0)

  const files = useMemo(() => readSourceFiles(), [])
  const stripRef = useRef<HTMLDivElement>(null)

  // Launcher entries, localised. `name`/`subtitle` framing is translated; brand
  // and binary names (kitty/nvim/firefox/KangaZero) stay literal inside the JA
  // strings themselves.
  const launcherApps = useMemo<LauncherApp[]>(
    () =>
      LAUNCHER_APP_IDS.map((id) => ({
        id,
        name: translate(`environment.apps.${id}.name`),
        subtitle: translate(`environment.apps.${id}.subtitle`),
      })),
    [translate]
  )

  // Window title-bar text. Proper nouns stay literal; only "About" is prose.
  const appTitle = useMemo<Record<AppId, string>>(
    () => ({
      about: translate("environment.apps.about.name"),
      browser: "Firefox",
      editor: "nvim",
      terminal: "kitty",
    }),
    [translate]
  )

  // Ticking clock for the bar.
  useEffect(() => {
    const id = window.setInterval(() => setClock(clockNowInHHMM()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  // Measure the strip so column widths + centring are in real pixels.
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStripWidth(el.clientWidth))
    ro.observe(el)
    setStripWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Compositor-level key capture: panel toggles always work; otherwise niri
  // tiling binds are intercepted (preventDefault + stopPropagation) before the
  // focused window's app sees them. Non-bind keys fall through to the app.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (event.altKey && !event.shiftKey && key === "d") {
        event.preventDefault()
        setLauncherOpen((v) => !v)
        return
      }
      if (event.altKey && event.shiftKey && event.key === ",") {
        event.preventDefault()
        setSettingsOpen((v) => !v)
        return
      }
      // While a panel is open it owns the keyboard.
      if (launcherOpen || settingsOpen || wallpaperOpen) return
      const action = keyToAction(event)
      if (action) {
        event.preventDefault()
        event.stopPropagation()
        dispatch(action)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [launcherOpen, settingsOpen, wallpaperOpen])

  const launch = (app: AppId) => {
    dispatch({ app, title: appTitle[app], type: "spawn" })
    setLauncherOpen(false)
  }

  const workspace = state.workspaces.find((w) => w.id === state.active)
  const columns = workspace?.columns ?? []
  const focusedCol = workspace?.focused ?? 0

  // Column pixel widths + the x offset that centres the focused column.
  const widths = columns.map((c) => Math.max(240, c.width * stripWidth))
  let cursor = PAD
  const centers = widths.map((w) => {
    const center = cursor + w / 2
    cursor += w + GAP
    return center
  })
  const offsetX = stripWidth / 2 - (centers[focusedCol] ?? stripWidth / 2)

  const focusedWin = getFocusedWindow(state)
  const pips = state.workspaces.map((w) => ({
    active: w.id === state.active,
    id: w.id,
    occupied: w.columns.length > 0,
  }))

  const bar = (
    <NoctaliaBar
      activeWindowTitle={focusedWin?.title ?? ""}
      clock={clock}
      keyboardLayout={locale}
      onLauncher={() => setLauncherOpen(true)}
      onWallpaper={() => setWallpaperOpen(true)}
      onWorkspace={(id) => dispatch({ id, type: "focusWorkspace" })}
      workspaces={pips}
    />
  )

  return (
    <main
      className={cn(
        "relative flex h-svh w-full flex-col overflow-hidden",
        settings.font === "mono" ? "font-mono" : "font-sans"
      )}
      style={{ zoom: settings.uiScale }}
    >
      {/* Wallpaper */}
      <div
        className="absolute inset-0 -z-10"
        style={wallpaperStyle(settings.wallpaper, theme)}
      />

      {settings.barPosition === "top" ? <div className="p-2">{bar}</div> : null}

      {/* Scrollable-tiling strip */}
      <div className="relative flex-1 overflow-hidden" ref={stripRef}>
        {columns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-white/70">
            {translate("environment.hint")}
          </div>
        ) : (
          <motion.div
            animate={{ x: offsetX }}
            className="absolute inset-y-0 flex items-stretch"
            style={{ gap: GAP, paddingBottom: PAD, paddingTop: PAD }}
            transition={{ damping: 30, stiffness: 260, type: "spring" }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {columns.map((col, ci) => (
                <motion.div
                  animate={{ opacity: ci === focusedCol ? 1 : 0.6, x: 0 }}
                  className="flex flex-col"
                  exit={{ opacity: 0, x: 80 }}
                  // First window (empty workspace) fades in; later ones slide in
                  // from the right, niri-style.
                  initial={
                    columns.length === 1
                      ? { opacity: 0, x: 0 }
                      : { opacity: 0, x: 80 }
                  }
                  key={col.id}
                  layout
                  style={{ gap: GAP, width: widths[ci] }}
                  transition={{ damping: 30, stiffness: 260, type: "spring" }}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {col.windows.map((win, wi) => {
                      const isFocused = ci === focusedCol && wi === col.focused
                      return (
                        <motion.button
                          className={cn(
                            "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card text-left shadow-xl",
                            isFocused ? "border-primary" : "border-border"
                          )}
                          exit={{ opacity: 0, y: 24 }}
                          initial={
                            columns.length === 1
                              ? { opacity: 0 }
                              : { opacity: 0, y: 24 }
                          }
                          key={win.id}
                          layout
                          onPointerDown={() =>
                            dispatch({
                              column: ci,
                              type: "focusAt",
                              window: wi,
                              workspace: state.active,
                            })
                          }
                          transition={{
                            damping: 30,
                            stiffness: 260,
                            type: "spring",
                          }}
                          type="button"
                        >
                          <div className="flex items-center gap-2 border-border border-b bg-muted/40 px-3 py-1.5">
                            <span className="flex-1 truncate font-medium text-xs">
                              {win.title}
                            </span>
                            <SquareIcon
                              className="size-3.5 text-muted-foreground hover:scale-110"
                              onClick={(e) => {
                                e.stopPropagation()
                                dispatch({
                                  type: "fullscreen",
                                })
                              }}
                            />

                            <X
                              className="size-3.5 text-muted-foreground hover:scale-110"
                              onClick={(e) => {
                                e.stopPropagation()
                                dispatch({
                                  column: ci,
                                  type: "focusAt",
                                  window: wi,
                                  workspace: state.active,
                                })
                                dispatch({ type: "close" })
                              }}
                            />
                          </div>
                          <div className="min-h-0 flex-1 overflow-hidden">
                            <WindowContent
                              dark={dark}
                              files={files}
                              onClose={() => dispatch({ type: "close" })}
                              routePath={pathname}
                              win={win}
                            />
                          </div>
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {settings.barPosition === "bottom" ? (
        <div className="p-2">{bar}</div>
      ) : null}

      <NoctaliaLauncher
        apps={launcherApps}
        onClose={() => setLauncherOpen(false)}
        onLaunch={launch}
        open={launcherOpen}
      />
      <NoctaliaSettings
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
        settings={settings}
      />
      <WallpaperDialog
        onChange={(w) => setSettings((s) => ({ ...s, wallpaper: w }))}
        onOpenChange={setWallpaperOpen}
        open={wallpaperOpen}
        value={settings.wallpaper}
      />
    </main>
  )
}
