"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { SquareIcon, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  type CSSProperties,
  useCallback,
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
import { ACCENT_COLORS, type BarPosition } from "@/components/niri/settings"
import type { AppId, NiriWindow } from "@/components/niri/types"
import { wallpaperStyle } from "@/components/niri/wallpaper"
import { WallpaperDialog } from "@/components/niri/wallpaper-dialog"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { readSourceFiles } from "@/lib/terminal/source"
import { DEFAULT_THEME, isTheme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import { NIRI_TILE_ID, useZOrder } from "@/providers/z-order-provider"

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

// The mutually-exclusive overlay panels — at most one open at a time.
type EnvPanel = "launcher" | "settings" | "wallpaper" | "help"

type Hour = `${number}` & { _brand: "Hour" }
type Minute = `${number}` & { _brand: "Minute" }

function clockNowInHHMM(): `${Hour}:${Minute}` {
  const d = new Date()
  const hours = String(d.getHours()).padStart(2, "0") as Hour
  const minutes = String(d.getMinutes()).padStart(2, "0") as Minute
  return `${hours}:${minutes}`
}

// Fixed-position overlay that reveals on hover with a slide animation.
// Respects barPosition for slide direction; uses a short hide debounce so
// quick cursor movements across the edge don't flicker the bar.
function AutoHideBar({
  position,
  children,
}: {
  position: BarPosition
  children: React.ReactNode
}): React.JSX.Element {
  const [revealed, setRevealed] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const isH = position === "top" || position === "bottom"

  const reveal = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setRevealed(true)
  }
  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setRevealed(false), 400)
  }
  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    },
    []
  )

  const hidden = isH
    ? { y: position === "top" ? "-100%" : "100%" }
    : { x: position === "left" ? "-100%" : "100%" }
  const visible = isH ? { y: 0 } : { x: 0 }

  return (
    <div
      className={cn(
        "fixed z-30 overflow-hidden",
        position === "top" && "inset-x-0 top-0",
        position === "bottom" && "inset-x-0 bottom-0",
        position === "left" && "inset-y-0 left-0",
        position === "right" && "inset-y-0 right-0"
      )}
      onPointerEnter={reveal}
      onPointerLeave={scheduleHide}
    >
      <motion.div
        animate={revealed ? visible : hidden}
        initial={hidden}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { damping: 30, stiffness: 320, type: "spring" }
        }
      >
        <div className="p-2">{children}</div>
      </motion.div>
    </div>
  )
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
  const themeFromLocalStorage =
    typeof window !== "undefined" ? localStorage.getItem("theme") : null
  const theme = isTheme(resolvedTheme)
    ? resolvedTheme
    : isTheme(themeFromLocalStorage)
      ? themeFromLocalStorage
      : DEFAULT_THEME
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  const [state, dispatch] = useReducer(niriReducer, undefined, initialNiriState)
  const { envSettings: settings, setEnvSettings: setSettings } =
    useGlobalStates()
  // Only one overlay panel opens at a time; opening while another is up is a
  // no-op (early return), matching a real compositor's modal panels.
  const [panel, setPanel] = useState<EnvPanel | null>(null)
  const openPanel = useCallback(
    (p: EnvPanel) => setPanel((cur) => (cur === null ? p : cur)),
    []
  )
  const togglePanel = useCallback(
    (p: EnvPanel) =>
      setPanel((cur) => (cur === p ? null : cur === null ? p : cur)),
    []
  )
  const closePanel = useCallback(() => setPanel(null), [])
  const [clock, setClock] = useState(clockNowInHHMM)
  const [stripWidth, setStripWidth] = useState(0)
  const [wallpaperStyleProp, setWallpaperStylePro] = useState<CSSProperties>(
    wallpaperStyle(settings.wallpaper, theme)
  )

  // Shared click-to-front counter (same one the floating widgets use). Focusing
  // a tiled window bumps the whole tiled layer above the floats; clicking a
  // float bumps it back above the strip. `main` is a stacking context only at
  // uiScale ≠ 1 — at the default scale the strip competes with the floats in the
  // root context, so this raise takes effect (see lib/z-order.ts).
  const { bringToFront, closeActive, activeId } = useZOrder()
  const [stripZ, setStripZ] = useState<number>(Z_LAYERS.window)

  const files = useMemo(() => readSourceFiles(), [])
  const stripRef = useRef<HTMLDivElement>(null)
  const overviewRef = useRef<HTMLDivElement>(null)
  const activeTileRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    setWallpaperStylePro(wallpaperStyle(settings.wallpaper, theme))
  }, [theme, settings.wallpaper])

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

  // Auto-scroll the overview so the active workspace tile stays centred as
  // Alt+J/K moves focus. Set scrollTop on the container directly (not
  // scrollIntoView) so it works on the overflow-hidden box and uses layout
  // offsets (offsetTop) that the tiles' FLIP transforms don't perturb.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.active is an intentional trigger (refs are stable) so the scroll re-runs on focus change.
  useEffect(() => {
    const container = overviewRef.current
    const tile = activeTileRef.current
    if (!state.overview) return
    if (!(container && tile)) return
    container.scrollTo({
      // Instant jump under reduced motion — a raw scroll animation the global
      // MotionConfig / CSS guards can't reach.
      behavior: reduceMotion ? "auto" : "smooth",
      top: tile.offsetTop - (container.clientHeight - tile.clientHeight) / 2,
    })
  }, [state.overview, state.active, reduceMotion])

  // Compositor-level key capture: panel toggles always work; otherwise niri
  // tiling binds are intercepted (preventDefault + stopPropagation) before the
  // focused window's app sees them. Non-bind keys fall through to the app.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (event.altKey && !event.shiftKey && key === "d") {
        event.preventDefault()
        togglePanel("launcher")
        return
      }
      if (
        event.altKey &&
        (event.ctrlKey || event.metaKey) &&
        event.key === ","
      ) {
        event.preventDefault()
        togglePanel("settings")
        return
      }
      // `?` toggles the shortcuts help. Match the produced character (not
      // Shift+/) so it works regardless of keyboard layout.
      if (event.key === "?") {
        event.preventDefault()
        togglePanel("help")
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
      if (panel !== null) return
      const action = keyToAction(event)
      if (action) {
        // Resize keys belong to a floating window when one is focused — let its
        // own handler take them instead of resizing the tiled column.
        const floatActive = activeId !== null && activeId !== NIRI_TILE_ID
        if (
          floatActive &&
          (action.type === "setWidth" || action.type === "setHeight")
        ) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        // Unified close: Alt+Shift+Q closes the most-recently-focused window
        // (widget float or floated niri window); if none is registered, fall
        // through to the tiled-window close.
        if (action.type === "close" && closeActive()) return
        dispatch(action)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [panel, state.overview, togglePanel, closeActive, activeId])

  const launch = (app: AppId) => {
    dispatch({ app, title: appTitle[app], type: "spawn" })
    closePanel()
  }

  const workspace = state.workspaces.find((w) => w.id === state.active)
  const columns = workspace?.columns ?? []
  const focusedCol = workspace?.focused ?? 0

  // Split the strip (tiled) from floated columns. Tiled entries keep their
  // original index (needed for focusAt + focus highlight); floated ones render
  // as draggable overlays instead of taking strip space.
  const tiled = columns
    .map((col, index) => ({ col, index }))
    .filter((entry) => !entry.col.floating)
  const floating = columns
    .map((col, index) => ({ col, index }))
    .filter((entry) => entry.col.floating)

  // Column pixel widths + the x offset that centres the focused tiled column.
  const widths = tiled.map(({ col }) => Math.max(240, col.width * stripWidth))
  let cursor = PAD
  const centers = widths.map((w) => {
    const center = cursor + w / 2
    cursor += w + GAP
    return center
  })
  // Focused column's position within the tiled subset (−1 when a floated column
  // holds focus — then keep the strip centred on its first column).
  const focusedTiledPos = tiled.findIndex(({ index }) => index === focusedCol)
  const offsetX =
    stripWidth / 2 -
    (centers[focusedTiledPos === -1 ? 0 : focusedTiledPos] ?? stripWidth / 2)

  const focusedWin = getFocusedWindow(state)
  const pips = state.workspaces.map((w) => ({
    active: w.id === state.active,
    id: w.id,
    occupied: w.columns.length > 0,
  }))

  // On any focus change (keyboard nav or click), mirror what a pointer-down on a
  // tiled window does — raise the tiled layer above the floats and register the
  // niri close — then move DOM focus onto the window. Skipped when the focus is a
  // floated column (its DraggableWindow owns its own z / focus).
  useEffect(() => {
    const focusedColumn = columns[focusedCol]
    if (!(focusedWin && focusedColumn) || focusedColumn.floating) return
    setStripZ(bringToFront(() => dispatch({ type: "close" }), NIRI_TILE_ID))
    const el = document.querySelector<HTMLElement>(
      `[data-win-id="${focusedWin.id}"]`
    )
    if (!el) return
    // Route focus to the app's real input surface when it has one: xterm's
    // hidden helper textarea (what Terminal.focus() targets) or CodeMirror's
    // editable — focusing the wrapper button alone wouldn't send keystrokes
    // into them. Plain windows just focus the wrapper. preventScroll: the strip
    // does its own transform-based centering, so keep the browser out of it.
    const inner = el.querySelector<HTMLElement>(
      ".xterm-helper-textarea, .cm-content"
    )
    ;(inner ?? el).focus({ preventScroll: true })
  }, [focusedWin, columns, focusedCol, bringToFront])

  // Bar placement: top/bottom lay out horizontally above/below the strip;
  // left/right lay out vertically beside it.
  const isVerticalBar =
    settings.barPosition === "left" || settings.barPosition === "right"
  const barBefore =
    settings.barPosition === "top" || settings.barPosition === "left"

  const bar = (
    <NoctaliaBar
      activeWindowTitle={focusedWin?.title ?? ""}
      barPosition={settings.barPosition}
      barRadius={settings.barRadius}
      clock={clock}
      keyboardLayout={locale}
      onLauncher={() => openPanel("launcher")}
      onSettings={() => openPanel("settings")}
      onWallpaper={() => openPanel("wallpaper")}
      onWorkspace={(id) => dispatch({ id, type: "focusWorkspace" })}
      opacity={settings.barOpacity}
      orientation={isVerticalBar ? "vertical" : "horizontal"}
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
          // Omit `zoom` entirely at 1× so `main` never becomes a stacking
          // context at the default scale — that would trap the tiled strip and
          // panels below the body-level floats (defeating the z-order system).
          ...(settings.uiScale === 1 ? {} : { zoom: settings.uiScale }),
          // Accent overrides the desktop's --primary token (default = theme).
          ...(settings.accent === "default"
            ? {}
            : { "--primary": ACCENT_COLORS[settings.accent] }),
        } as CSSProperties
      }
    >
      {/* Wallpaper */}
      <div className="absolute inset-0 -z-10" style={wallpaperStyleProp} />

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1",
          isVerticalBar ? "flex-row" : "flex-col"
        )}
      >
        {barBefore && !settings.autoHideBar ? (
          <div className="p-2 px-4">{bar}</div>
        ) : null}

        {/* Scrollable-tiling strip */}
        {/* pointer-events-none so the raised strip doesn't swallow clicks over
            its empty areas — only the actual windows (and overview) re-enable
            them, letting floats beneath stay clickable in the gaps. */}
        <div
          className="overflow-show pointer-events-none relative min-h-0 min-w-0 flex-1"
          ref={stripRef}
          style={{ zIndex: stripZ }}
        >
          {state.overview ? (
            // Overview (Alt+Shift+O): all workspaces stacked over a blurred
            // wallpaper (backdrop-blur reads the desktop wallpaper behind).
            // Alt+J/K move between them, Alt+Shift+J/K rearrange, click/Enter to
            // enter. Each tile renders its windows' real content, live.
            <motion.div
              animate={{ opacity: 1 }}
              className="pointer-events-auto absolute inset-0 flex flex-col gap-3 p-4"
              initial={{ opacity: 0 }}
              ref={overviewRef}
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
                      "relative flex min-h-90 flex-1 flex-col gap-2 rounded-2xl border-2 bg-card/20 p-3",
                      ws.id === state.active
                        ? "border-primary"
                        : "border-border/40 hover:border-border"
                    )}
                    key={ws.id}
                    layout
                    ref={ws.id === state.active ? activeTileRef : undefined}
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
                                      onClose={() =>
                                        dispatch({ type: "close" })
                                      }
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
          ) : columns.length === 0 && settings.showStartingHint ? (
            <h1 className="flex h-full items-center justify-center text-center text-2xl [text-shadow:2px_1px_0_var(--color-sidebar-accent)]">
              {translate("environment.hint")}
            </h1>
          ) : (
            <motion.div
              animate={{ x: state.isCenterAligned ? offsetX : 0 }}
              className="absolute inset-y-0 flex items-stretch"
              exit={{ opacity: 0, x: 80 }}
              style={{ gap: GAP, padding: PAD }}
              transition={{
                damping: 30,
                duration: 100,
                stiffness: 260,
                type: "spring",
              }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {tiled.map(({ col, index: ci }, ti) => (
                  <motion.div
                    animate={{ opacity: ci === focusedCol ? 1 : 0.6, x: 0 }}
                    className="flex flex-col"
                    exit={{ opacity: 0, x: 80 }}
                    // First window (empty workspace) fades in; later ones slide in
                    // from the right, niri-style.
                    initial={
                      tiled.length === 1
                        ? { opacity: 0, x: 0 }
                        : { opacity: 0, x: 80 }
                    }
                    key={col.id}
                    layout
                    style={{ gap: GAP, width: widths[ti] }}
                    transition={{
                      damping: 30,
                      duration: 100,
                      stiffness: 260,
                      type: "spring",
                    }}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {col.windows.map((win, wi) => {
                        const isFocused =
                          ci === focusedCol && wi === col.focused
                        // Terminal/editor windows are translucent so the
                        // wallpaper shows through their transparent content.
                        const glassy =
                          win.app === "terminal" || win.app === "editor"
                        return (
                          <motion.button
                            className={cn(
                              "pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-lg border text-left shadow-xl",
                              glassy
                                ? "bg-card/30 backdrop-blur-md"
                                : "bg-card",
                              isFocused ? "border-primary" : "border-border"
                            )}
                            data-win-id={win.id}
                            // Close animation: shrink to nothing at the centre
                            // (opacity-only when the user prefers reduced motion).
                            exit={
                              reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 0 }
                            }
                            initial={
                              tiled.length === 1
                                ? { opacity: 0 }
                                : { opacity: 0, y: 24 }
                            }
                            key={win.id}
                            layout
                            onPointerDown={() => {
                              // Clicking a tiled window raises the tiled layer
                              // above any floating widget, focuses it, and makes
                              // it the target of the unified close shortcut.
                              setStripZ(
                                bringToFront(
                                  () => dispatch({ type: "close" }),
                                  NIRI_TILE_ID
                                )
                              )
                              dispatch({
                                column: ci,
                                type: "focusAt",
                                window: wi,
                                workspace: state.active,
                              })
                            }}
                            // Vertical flex weight = the window's height (y-resize).
                            style={{
                              flexBasis: 0,
                              flexGrow: win.height,
                              flexShrink: 1,
                            }}
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

        {!barBefore && !settings.autoHideBar ? (
          <div className="p-2">{bar}</div>
        ) : null}
      </div>

      {settings.autoHideBar ? (
        <AutoHideBar position={settings.barPosition}>{bar}</AutoHideBar>
      ) : null}

      {/* Floated niri columns (Alt+T) render as draggable, click-to-front
          windows sharing the widgets' z-order band. Focusing one (click/open)
          makes Alt+T re-tile it and Alt+Shift+Q close it. */}
      {floating.map(({ col, index: colIndex }, idx) => {
        const win = col.windows[col.focused] ?? col.windows[0]
        if (!win) return null
        const focusThis = (): void =>
          dispatch({
            column: colIndex,
            type: "focusAt",
            window: col.focused,
            workspace: state.active,
          })
        const closeThis = (): void => {
          focusThis()
          dispatch({ type: "close" })
        }
        return (
          <DraggableWindow
            defaultHeight={340}
            defaultWidth={480}
            isOpen
            key={col.id}
            onClose={closeThis}
            onFocus={focusThis}
            positionClassName={cn(
              "top-16",
              idx % 2 === 0 ? "left-16" : "right-16"
            )}
            storageKey={`niri-float-${col.id}`}
            title={win.title}
          >
            <WindowContent
              dark={dark}
              files={files}
              onClose={closeThis}
              routePath={pathname}
              win={win}
            />
          </DraggableWindow>
        )
      })}

      <NoctaliaLauncher
        apps={launcherApps}
        launcherRadius={settings.launcherRadius}
        onClose={closePanel}
        onLaunch={launch}
        onOpenSettings={() => openPanel("settings")}
        onOpenWallpaper={() => openPanel("wallpaper")}
        open={panel === "launcher"}
      />
      <NoctaliaSettings
        onChange={setSettings}
        onClose={closePanel}
        open={panel === "settings"}
        settings={settings}
      />
      <WallpaperDialog
        glass={settings.glass}
        onChange={(w) => setSettings({ ...settings, wallpaper: w })}
        onOpenChange={(o) => setPanel(o ? "wallpaper" : null)}
        open={panel === "wallpaper"}
        value={settings.wallpaper}
        windowRadius={settings.windowRadius}
      />
      <NiriHelpDialog
        onOpenChange={(o) => setPanel(o ? "help" : null)}
        open={panel === "help"}
      />
    </main>
  )
}
