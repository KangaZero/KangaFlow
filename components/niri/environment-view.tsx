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
import { Glass } from "@/components/canvasui/Glass"
import { GlyphRain } from "@/components/canvasui/GlyphRain"
import { AboutWindow } from "@/components/niri/apps/about-window"
import { BrowserWindow } from "@/components/niri/apps/browser-window"
import {
  getFocusedWindow,
  initialNiriState,
  niriReducer,
} from "@/components/niri/engine"
import { keyToAction } from "@/components/niri/keymap"
import { LoginScreen } from "@/components/niri/login-screen"
import { NiriHelpDialog } from "@/components/niri/niri-help-dialog"
import { NoctaliaBar } from "@/components/niri/noctalia-bar"
import {
  type LauncherApp,
  NoctaliaLauncher,
} from "@/components/niri/noctalia-launcher"
import { NoctaliaSettings } from "@/components/niri/noctalia-settings"
import { NotificationToast } from "@/components/niri/notification-toast"
import {
  ACCENT_COLORS,
  type BarPosition,
  DAIJI,
} from "@/components/niri/settings"
import type { AppId, NiriWindow } from "@/components/niri/types"
import { wallpaperStyle } from "@/components/niri/wallpaper"
import { WallpaperDialog } from "@/components/niri/wallpaper-dialog"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { useStoredString } from "@/lib/hooks/use-safe-storage"
import { isReducedMotion } from "@/lib/isReducedMotion"
import {
  SPRING_LAYOUT,
  SPRING_OVERVIEW,
  SPRING_TILE,
  SPRING_WORKSPACE,
} from "@/lib/motion"
import {
  desktopTransform,
  OVERVIEW_RADIUS,
  OVERVIEW_SCALE,
  overviewTransform,
  type StripLayout,
  stripLayout,
  type Viewport,
} from "@/lib/niri-overview"
import { loadNiriState, saveNiriState } from "@/lib/niri-persistence"
import { playSfx } from "@/lib/sfx/play"
import { matrixToGlyphRain } from "@/lib/terminal/cmatrix"
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
  suppressed,
  children,
}: {
  position: BarPosition
  /** Overview open: stay tucked away and ignore hover reveals. */
  suppressed: boolean
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
      inert={suppressed}
      onPointerEnter={suppressed ? undefined : reveal}
      onPointerLeave={suppressed ? undefined : scheduleHide}
    >
      <motion.div
        animate={revealed && !suppressed ? visible : hidden}
        initial={hidden}
        transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
      >
        <div className="p-2">{children}</div>
      </motion.div>
    </div>
  )
}

// In-flow bar slot. Entering the overview slides the bar out toward its own
// edge while the slot collapses (so the strip grows into the freed space);
// exiting brings it back. Same spring as the overview zoom so the scene moves
// as one; reduced motion = a short fade. Bar logic/settings are untouched.
function BarSlot({
  position,
  hidden,
  reduced,
  className,
  children,
}: {
  position: BarPosition
  hidden: boolean
  reduced: boolean
  className: string
  children: React.ReactNode
}): React.JSX.Element {
  const isH = position === "top" || position === "bottom"
  const offscreen = isH
    ? { y: position === "top" ? "-100%" : "100%" }
    : { x: position === "left" ? "-100%" : "100%" }
  const onscreen = isH ? { y: 0 } : { x: 0 }
  const size = isH
    ? { height: hidden ? 0 : "auto" }
    : { width: hidden ? 0 : "auto" }
  const transition = reduced
    ? { duration: 0.15, height: { duration: 0 }, width: { duration: 0 } }
    : SPRING_OVERVIEW
  return (
    <motion.div
      animate={{ ...size, opacity: hidden ? 0 : 1 }}
      className="shrink-0 overflow-hidden"
      inert={hidden}
      initial={false}
      transition={transition}
    >
      <motion.div
        animate={hidden && !reduced ? offscreen : onscreen}
        className={className}
        initial={false}
        transition={transition}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// One workspace in the overview: a full-strip-sized box laid out exactly like
// the live strip, moved only by transform. It starts at the desktop placement
// (active = fullscreen, others stacked just off-screen) and springs to its
// slot in the zoomed-out vertical strip; exit reverses it. Rings/labels are
// divided by the scale so they read crisp at any zoom.
function OverviewTile({
  index,
  selectedIndex,
  viewport,
  layout,
  selected,
  empty,
  label,
  reduced,
  onEnter,
  children,
}: {
  index: number
  selectedIndex: number
  viewport: Viewport
  layout: StripLayout
  selected: boolean
  empty: boolean
  label: string
  reduced: boolean
  onEnter: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const desk = desktopTransform(index, selectedIndex, viewport)
  const over = overviewTransform(index, selectedIndex, viewport)
  const ring = (px: number) => `${px / OVERVIEW_SCALE}px`
  const transition = reduced ? { duration: 0 } : SPRING_OVERVIEW
  return (
    <motion.div
      animate={{ ...over, borderRadius: OVERVIEW_RADIUS / OVERVIEW_SCALE }}
      className="absolute top-0 left-0 overflow-hidden"
      exit={{ ...desk, borderRadius: 0 }}
      initial={{ ...desk, borderRadius: 0 }}
      style={{
        height: viewport.height,
        transformOrigin: "0 0",
        width: viewport.width,
      }}
      transition={transition}
    >
      {/* The whole tile is the "enter this workspace" target; windows sit
      above it with their own focus-and-enter buttons. */}
      <button
        aria-current={selected ? "true" : undefined}
        aria-label={label}
        className="absolute inset-0 z-0 cursor-pointer"
        onClick={onEnter}
        tabIndex={selected ? 0 : -1}
        type="button"
      />
      {empty ? (
        <span className="text-muted-foreground/50 pointer-events-none absolute inset-0 flex items-center justify-center text-4xl tracking-[0.3em]">
          —
        </span>
      ) : (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 flex items-stretch"
          style={{
            gap: GAP,
            padding: PAD,
            transform: `translateX(${layout.offsetX}px)`,
          }}
        >
          {children}
        </div>
      )}
      {/* Selection ring / hairline + label: fade in with the zoom. */}
      <motion.div
        animate={{ opacity: 1 }}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        style={{
          boxShadow: selected
            ? `inset 0 0 0 ${ring(3)} var(--color-primary)`
            : `inset 0 0 0 ${ring(1)} var(--color-border)`,
        }}
        transition={transition}
      />
      <motion.span
        animate={{ opacity: 1 }}
        aria-hidden
        className="bg-card/70 text-foreground border-border pointer-events-none absolute z-30 rounded-full border font-medium whitespace-nowrap backdrop-blur-md"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        style={{
          fontSize: ring(12),
          left: ring(12),
          padding: `${ring(3)} ${ring(10)}`,
          top: ring(12),
        }}
        transition={transition}
      >
        {label}
      </motion.span>
    </motion.div>
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
          windowId={win.id}
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
      return <BrowserWindow windowId={win.id} />
    default:
      return null
  }
}

export function EnvironmentView() {
  const { translate, locale } = useLocale()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme !== "light"
  // next-themes' own storage key, read through the safe store: null on the
  // server and in blocked-storage browsers, so DEFAULT_THEME wins there.
  const themeFromLocalStorage = useStoredString("theme")
  const theme = isTheme(resolvedTheme)
    ? resolvedTheme
    : isTheme(themeFromLocalStorage)
      ? themeFromLocalStorage
      : DEFAULT_THEME
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  const [state, dispatch] = useReducer(niriReducer, undefined, initialNiriState)
  const {
    envSettings: settings,
    setEnvSettings: setSettings,
    isLoggedIn,
    setIsLoggedIn,
    globalMatrixOptions,
    globalMatrixRunning,
    setGlobalMatrixOptions,
    animationPref,
  } = useGlobalStates()
  // App animation preference + OS setting (drives the overview zoom / bar).
  const reduced = isReducedMotion(animationPref, reduceMotion)

  // Hydrate the persisted layout after mount (reading storage during the initial
  // render would mismatch the server HTML). `hydratedRef` gates the persist
  // effect so the pristine defaults never clobber the stored desktop.
  const hydratedRef = useRef(false)
  useEffect(() => {
    const saved = loadNiriState()
    if (saved) {
      dispatch({ state: saved, type: "restore" })
    } else {
      hydratedRef.current = true
    }
  }, [])

  // Workspace / overview sounds. Declared BEFORE the persist effect so the
  // restore commit still sees hydratedRef === false and stays silent (a
  // restored layout is not a user action).
  const soundPrevRef = useRef({
    active: state.active,
    overview: state.overview,
  })
  useEffect(() => {
    const prev = soundPrevRef.current
    soundPrevRef.current = { active: state.active, overview: state.overview }
    if (!hydratedRef.current) return
    if (prev.overview !== state.overview) {
      playSfx(state.overview ? "overview-in" : "overview-out")
    } else if (prev.active !== state.active) {
      const index = state.workspaces.findIndex((w) => w.id === state.active)
      playSfx("ws-switch", { step: index + 1 })
    }
  }, [state.active, state.overview, state.workspaces])

  // Persist layout + each window's cached content on every reducer change. The
  // first change after mount IS the restore itself, so that run just marks
  // hydration instead of writing (the loaded state is already in storage).
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }
    saveNiriState(state)
  }, [state])

  // Apps write their content to the in-session cache on every change; make sure
  // storage catches up even when no layout change follows (e.g. a keystroke
  // right before leaving the page / closing the tab).
  const latestState = useRef(state)
  latestState.current = state
  useEffect(() => {
    const flush = (): void => saveNiriState(latestState.current)
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [])

  function handleBurnComplete(): void {
    setIsLoggedIn("visible")
  }
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
  const [stripSize, setStripSize] = useState<Viewport>({ height: 0, width: 0 })
  const stripWidth = stripSize.width
  // Overview layer still mounted (true from opening until its exit zoom has
  // finished), so the live strip stays hidden underneath until then.
  const [overviewLayer, setOverviewLayer] = useState(false)
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
    const measure = () =>
      setStripSize({ height: el.clientHeight, width: el.clientWidth })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (state.overview) setOverviewLayer(true)
  }, [state.overview])

  // Roving focus: while the overview is open, DOM focus follows the selected
  // workspace (↑/↓ already change the selection via the engine).
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.active is the trigger; the query reads the DOM it produces.
  useEffect(() => {
    if (!state.overview) return
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          '[data-niri-overview] button[aria-current="true"]'
        )
        ?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [state.overview, state.active])

  // After the exit zoom, hand focus back to the focused window's input surface
  // (the overview's buttons are gone and the live strip is visible again).
  const restoreWindowFocus = useCallback(() => {
    setOverviewLayer(false)
    requestAnimationFrame(() => {
      const id = getFocusedWindow(state)?.id
      if (!id) return
      const el = document.querySelector<HTMLElement>(`[data-win-id="${id}"]`)
      const inner = el?.querySelector<HTMLElement>(
        ".xterm-helper-textarea, .cm-content"
      )
      ;(inner ?? el)?.focus({ preventScroll: true })
    })
  }, [state])

  // Compositor-level key capture: panel toggles always work; otherwise niri
  // tiling binds are intercepted (preventDefault + stopPropagation) before the
  // focused window's app sees them. Non-bind keys fall through to the app.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      // While the global (desktop) cmatrix rain runs, `q` and Ctrl-C are
      // reserved for stopping it, wherever focus is (the launching terminal's
      // own handler mirrors this for when the terminal lives off this page).
      if (globalMatrixRunning) {
        const stops =
          (key === "q" && !event.ctrlKey && !event.metaKey && !event.altKey) ||
          (event.ctrlKey && key === "c")
        if (stops) {
          event.preventDefault()
          event.stopPropagation()
          setGlobalMatrixOptions(null)
          return
        }
      }
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
  }, [
    panel,
    state.overview,
    togglePanel,
    closeActive,
    activeId,
    globalMatrixRunning,
    setGlobalMatrixOptions,
  ])

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

  // Column pixel widths + the x offset that brings the focused tiled column
  // into place (centre mode: midpoint to the viewport midpoint; otherwise its
  // left edge to the padding). Shared with the overview tiles (lib/niri-overview).
  const { widths, offsetX } = stripLayout(
    columns,
    focusedCol,
    stripWidth,
    state.isCenterAligned,
    PAD,
    GAP
  )

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
          ...wallpaperStyleProp,
          backgroundAttachment: "fixed",
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
      {isLoggedIn === "visible" ? (
        <>
          {/* Global cmatrix rain (`cmatrix -g`): covers the desktop above the
          wallpaper but below the strip/windows and every UI band, so windows
          float over it and the bar stays clickable. pointer-events-none — it's
          a screensaver, not an input surface. */}
          {globalMatrixOptions ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: -1 }}
            >
              <GlyphRain
                className="h-full w-full"
                {...matrixToGlyphRain(globalMatrixOptions)}
              >
                <div className="h-full w-full" />
              </GlyphRain>
            </div>
          ) : null}

          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1",
              isVerticalBar ? "flex-row" : "flex-col"
            )}
          >
            {barBefore && !settings.autoHideBar ? (
              <BarSlot
                className="p-2 px-4"
                hidden={state.overview}
                position={settings.barPosition}
                reduced={reduced}
              >
                {bar}
              </BarSlot>
            ) : null}

            {/* Scrollable-tiling strip */}
            {/* pointer-events-none so the raised strip doesn't swallow clicks over
            its empty areas — only the actual windows (and overview) re-enable
            them, letting floats beneath stay clickable in the gaps. */}
            <div
              className="pointer-events-none relative min-h-0 min-w-0 flex-1"
              ref={stripRef}
              style={{
                zIndex: stripZ,
              }}
            >
              {state.overview ? null : columns.length === 0 &&
                settings.showStartingHint ? (
                <h1
                  className={cn(
                    "flex h-full items-center justify-center text-center text-2xl [text-shadow:2px_1px_0_var(--color-sidebar-accent)]",
                    overviewLayer && "invisible"
                  )}
                >
                  {translate("environment.hint")}
                </h1>
              ) : (
                <motion.div
                  animate={{ x: offsetX }}
                  className="absolute inset-y-0 flex items-stretch"
                  exit={{ opacity: 0, x: 80 }}
                  // Hidden (not unmounted) while the overview's exit zoom is
                  // still playing on top, so the two never show at once.
                  style={{
                    gap: GAP,
                    padding: PAD,
                    visibility: overviewLayer ? "hidden" : undefined,
                  }}
                  transition={SPRING_WORKSPACE}
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
                            // "true" glass swaps the CSS blur for the WebGL
                            // shader pane (canvasui/Glass) behind the content.
                            const trueGlass =
                              settings.glass === "true" && glassy
                            return (
                              // A div, not a <button>: the window wraps live app
                              // content (the browser's tabs, address <input>,
                              // buttons…) and interactive content may not nest
                              // inside a <button> (invalid HTML; the outer button
                              // can swallow the inner controls' keys/clicks).
                              <motion.div
                                aria-label={win.title}
                                className={cn(
                                  "pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-lg border text-left shadow-xl",
                                  trueGlass
                                    ? "bg-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_12px_44px_rgba(0,0,0,0.38)]"
                                    : glassy
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
                                role="group"
                                // Vertical flex weight = the window's height (y-resize).
                                style={{
                                  flexBasis: 0,
                                  flexGrow: win.height,
                                  flexShrink: 1,
                                }}
                                transition={SPRING_TILE}
                              >
                                <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5">
                                  <span className="flex-1 truncate text-xs font-medium">
                                    {win.title}
                                  </span>
                                  <SquareIcon
                                    className="text-muted-foreground size-3.5 hover:scale-110"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      dispatch({
                                        type: "fullscreen",
                                      })
                                    }}
                                  />

                                  <X
                                    className="text-muted-foreground size-3.5 hover:scale-110"
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
                                <div className="relative min-h-0 flex-1 overflow-hidden">
                                  {trueGlass ? (
                                    // Full-pane frosted glass. The wallpaper is
                                    // captured *inside* the pane so the shader has
                                    // something to refract; the live content then
                                    // renders crisp on top of the glass.
                                    <div className="absolute inset-0">
                                      <Glass
                                        aberration={0.6}
                                        blur={1.5}
                                        className="h-full w-full"
                                        corner={8}
                                        fill
                                        ior={1.35}
                                        reflection={0.9}
                                        shape="rectangle"
                                        shine={0.08}
                                      >
                                        <div className="h-full w-full" />
                                      </Glass>
                                    </div>
                                  ) : null}
                                  {/* h-full in BOTH modes: apps size themselves
                                      with h-full (the browser's iframe is
                                      absolutely positioned, so it has no in-flow
                                      height). Without it this wrapper collapses
                                      to 0px when true glass is off and the page
                                      area renders 0px tall. */}
                                  <div
                                    className={cn(
                                      "h-full",
                                      trueGlass && "absolute inset-0"
                                    )}
                                  >
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
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Overview (Alt+Shift+O): zoom out to a vertical strip of every
              workspace. Same engine actions as always (↑/↓ select, Alt+Shift+
              J/K reorder, Enter/Esc/click enter); only the presentation is a
              transform-driven zoom instead of a fade. */}
              <AnimatePresence onExitComplete={restoreWindowFocus}>
                {state.overview ? (
                  <motion.div
                    animate={{ opacity: 1 }}
                    aria-label={translate("environment.overview.region")}
                    className="pointer-events-auto absolute inset-0 overflow-hidden"
                    data-niri-overview
                    exit={{ opacity: reduced ? 0 : 1 }}
                    initial={{ opacity: reduced ? 0 : 1 }}
                    key="overview"
                    role="region"
                    transition={
                      reduced ? { duration: 0.15 } : { duration: 0.01 }
                    }
                  >
                    {/* Backdrop: blurs and dims the wallpaper with the zoom. */}
                    <motion.div
                      animate={{ opacity: 1 }}
                      aria-hidden
                      className="bg-background/25 absolute inset-0 backdrop-blur-xl"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      transition={reduced ? { duration: 0 } : SPRING_OVERVIEW}
                    />
                    {state.workspaces.map((ws, index) => {
                      const selectedIndex = state.workspaces.findIndex(
                        (w) => w.id === state.active
                      )
                      const wsLayout = stripLayout(
                        ws.columns,
                        ws.focused,
                        stripSize.width,
                        state.isCenterAligned,
                        PAD,
                        GAP
                      )
                      const wsLabel = `${DAIJI[ws.id] ?? ""} ${translate("environment.bar.workspace")} ${ws.id}`
                      return (
                        <OverviewTile
                          empty={wsLayout.tiled.length === 0}
                          index={index}
                          key={ws.id}
                          label={wsLabel}
                          layout={wsLayout}
                          onEnter={() => {
                            dispatch({ id: ws.id, type: "focusWorkspace" })
                            dispatch({ type: "toggleOverview" })
                          }}
                          reduced={reduced}
                          selected={ws.id === state.active}
                          selectedIndex={Math.max(0, selectedIndex)}
                          viewport={stripSize}
                        >
                          {wsLayout.tiled.map((ci, ti) => {
                            const col = ws.columns[ci]
                            if (!col) return null
                            return (
                              <div
                                className="flex flex-col"
                                key={col.id}
                                style={{ gap: GAP, width: wsLayout.widths[ti] }}
                              >
                                {col.windows.map((win, wi) => {
                                  const winFocused =
                                    ws.id === state.active &&
                                    ci === ws.focused &&
                                    wi === col.focused
                                  const glassy =
                                    win.app === "terminal" ||
                                    win.app === "editor"
                                  return (
                                    <div
                                      className={cn(
                                        "pointer-events-auto relative flex min-h-0 flex-col overflow-hidden rounded-lg border shadow-xl",
                                        glassy
                                          ? "bg-card/30 backdrop-blur-md"
                                          : "bg-card",
                                        winFocused
                                          ? "border-primary"
                                          : "border-border"
                                      )}
                                      key={win.id}
                                      style={{
                                        flexBasis: 0,
                                        flexGrow: win.height,
                                        flexShrink: 1,
                                      }}
                                    >
                                      <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5">
                                        <span className="flex-1 truncate text-xs font-medium">
                                          {win.title}
                                        </span>
                                      </div>
                                      {/* Live content (same component, no
                                      clone); the overlay button owns clicks. */}
                                      <div className="pointer-events-none relative min-h-0 flex-1 overflow-hidden">
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
                                        tabIndex={
                                          ws.id === state.active ? 0 : -1
                                        }
                                        type="button"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </OverviewTile>
                      )
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {/* Announces the selected workspace while the overview is open. */}
              <span aria-live="polite" className="sr-only">
                {state.overview
                  ? `${translate("environment.bar.workspace")} ${state.active} ${translate("environment.overview.selected")}`
                  : ""}
              </span>
            </div>

            {!barBefore && !settings.autoHideBar ? (
              <BarSlot
                className="p-2"
                hidden={state.overview}
                position={settings.barPosition}
                reduced={reduced}
              >
                {bar}
              </BarSlot>
            ) : null}
          </div>

          {settings.autoHideBar ? (
            <AutoHideBar
              position={settings.barPosition}
              suppressed={state.overview}
            >
              {bar}
            </AutoHideBar>
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
          <NotificationToast />
        </>
      ) : (
        <LoginScreen onBurnComplete={handleBurnComplete} />
      )}
    </main>
  )
}
