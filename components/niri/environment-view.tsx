"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { SquareIcon, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import { AboutWindow } from "@/components/niri/apps/about-window"
import { BrowserWindow } from "@/components/niri/apps/browser-window"
import {
  getFocusedWindow,
  initialNiriState,
  niriReducer,
} from "@/components/niri/engine"
import { keyToAction } from "@/components/niri/keymap"
import { NiriHelpDialog } from "@/components/niri/niri-help-dialog"
import { NoctaliaBar } from "@/components/niri/noctalia-bar"
import {
  type LauncherApp,
  NoctaliaLauncher,
} from "@/components/niri/noctalia-launcher"
import { NoctaliaSettings } from "@/components/niri/noctalia-settings"
import {
  ACCENT_COLORS,
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
  const [helpOpen, setHelpOpen] = useState(false)
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
      // `?` toggles the shortcuts help. Match the produced character (not
      // Shift+/) so it works regardless of keyboard layout.
      if (event.key === "?") {
        event.preventDefault()
        setHelpOpen((v) => !v)
        return
      }
      // In overview: Enter opens the selected (active) workspace, Escape leaves.
      // Both exit the overview onto whatever workspace is currently selected.
      if (state.overview && (event.key === "Enter" || event.key === "Escape")) {
        event.preventDefault()
        dispatch({ type: "toggleOverview" })
        return
      }
      // While a panel is open it owns the keyboard.
      if (launcherOpen || settingsOpen || wallpaperOpen || helpOpen) return
      const action = keyToAction(event)
      if (action) {
        event.preventDefault()
        event.stopPropagation()
        dispatch(action)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [launcherOpen, settingsOpen, wallpaperOpen, helpOpen, state.overview])

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
      onSettings={() => setSettingsOpen(true)}
      onWallpaper={() => setWallpaperOpen(true)}
      onWorkspace={(id) => dispatch({ id, type: "focusWorkspace" })}
      opacity={settings.barOpacity}
      workspaces={pips}
    />
  )

  return (
    <main
      className={cn(
        "relative flex h-svh w-full flex-col overflow-hidden",
        settings.font === "mono" ? "font-mono" : "font-sans"
      )}
      style={
        {
          zoom: settings.uiScale,
          // Accent overrides the desktop's --primary token (default = theme).
          ...(settings.accent === "default"
            ? {}
            : { "--primary": ACCENT_COLORS[settings.accent] }),
        } as CSSProperties
      }
    >
      {/* Wallpaper */}
      <div
        className="absolute inset-0 -z-10"
        style={wallpaperStyle(settings.wallpaper, theme)}
      />

      {settings.barPosition === "top" ? <div className="p-2">{bar}</div> : null}

      {/* Scrollable-tiling strip */}
      <div className="relative flex-1 overflow-hidden" ref={stripRef}>
        {state.overview ? (
          // Overview (Alt+Shift+O): all workspaces stacked over a blurred
          // wallpaper (backdrop-blur reads the desktop wallpaper behind).
          // Alt+J/K move between them, Alt+Shift+J/K rearrange, click/Enter to
          // enter. Each tile renders its windows' real content, live.
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col gap-3 overflow-auto p-4"
            initial={{ opacity: 0 }}
          >
            {state.workspaces.map((ws) => {
              const wsLabel = `${translate("environment.bar.workspace")} ${ws.id}`
              return (
                // `layout` + a spring FLIP the tiles when Alt+Shift+J/K reorders
                // the array (stable key = ws.id). A transparent overlay button
                // owns the click so the live window content can render without
                // nesting interactive elements inside a <button>.
                <motion.div
                  className={cn(
                    "relative flex min-h-40 flex-1 flex-col gap-2 overflow-hidden rounded-2xl border-2 bg-card/20 p-3",
                    ws.id === state.active
                      ? "border-primary"
                      : "border-border/40 hover:border-border"
                  )}
                  key={ws.id}
                  layout
                  transition={{ damping: 50, stiffness: 200, type: "spring" }}
                >
                  <button
                    aria-label={wsLabel}
                    className="absolute inset-0 z-10"
                    onClick={() => {
                      dispatch({ id: ws.id, type: "focusWorkspace" })
                      dispatch({ type: "toggleOverview" })
                    }}
                    type="button"
                  />
                  <span className="font-medium text-muted-foreground text-xs">
                    {wsLabel}
                  </span>
                  <div className="flex min-h-0 flex-1 gap-2">
                    {ws.columns.length === 0 ? (
                      <span className="flex flex-1 items-center justify-center text-muted-foreground/50 text-xs">
                        —
                      </span>
                    ) : (
                      ws.columns.map((col, ci) => (
                        <div
                          className="flex min-w-0 flex-col gap-2"
                          key={col.id}
                          style={{ flex: col.width }}
                        >
                          {col.windows.map((win, wi) => {
                            const winFocused =
                              ws.id === state.active &&
                              ci === ws.focused &&
                              wi === col.focused
                            return (
                              <div
                                className={cn(
                                  "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 bg-card transition-colors",
                                  winFocused
                                    ? "border-primary"
                                    : "border-border hover:border-primary/60"
                                )}
                                key={win.id}
                              >
                                <div className="flex items-center border-border border-b bg-muted/40 px-2 py-1">
                                  <span className="truncate font-medium text-[10px] text-card-foreground">
                                    {win.title}
                                  </span>
                                </div>
                                {/* Live content; pointer-events-none so the
                                    window's overlay button owns the click. */}
                                <div className="pointer-events-none min-h-0 flex-1 overflow-hidden">
                                  <WindowContent
                                    dark={dark}
                                    files={files}
                                    onClose={() => dispatch({ type: "close" })}
                                    routePath={pathname}
                                    win={win}
                                  />
                                </div>
                                {/* Click a window to focus it, then exit. */}
                                <button
                                  aria-label={win.title}
                                  className="absolute inset-0 z-30"
                                  onClick={() => {
                                    dispatch({
                                      column: ci,
                                      type: "focusAt",
                                      window: wi,
                                      workspace: ws.id,
                                    })
                                    dispatch({ type: "toggleOverview" })
                                  }}
                                  type="button"
                                />
                              </div>
                            )
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        ) : columns.length === 0 ? (
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
        glass={settings.glass}
        onChange={(w) => setSettings((s) => ({ ...s, wallpaper: w }))}
        onOpenChange={setWallpaperOpen}
        open={wallpaperOpen}
        value={settings.wallpaper}
      />
      <NiriHelpDialog onOpenChange={setHelpOpen} open={helpOpen} />
    </main>
  )
}
