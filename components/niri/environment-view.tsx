"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
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
import { NoctaliaBar } from "@/components/niri/noctalia-bar"
import {
  type LauncherApp,
  NoctaliaLauncher,
} from "@/components/niri/noctalia-launcher"
import { NoctaliaSettings } from "@/components/niri/noctalia-settings"
import {
  DEFAULT_ENV_SETTINGS,
  type EnvSettings,
  type WallpaperId,
} from "@/components/niri/settings"
import type { AppId, NiriWindow } from "@/components/niri/types"
import { readSourceFiles } from "@/lib/terminal/source"
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

const LAUNCHER_APPS: readonly LauncherApp[] = [
  { id: "terminal", name: "Terminal", subtitle: "kitty · zsh + nvim" },
  { id: "editor", name: "Editor", subtitle: "nvim on repo source" },
  { id: "about", name: "About", subtitle: "who is KangaZero" },
  { id: "browser", name: "Browser", subtitle: "firefox" },
]

const APP_TITLE: Record<AppId, string> = {
  about: "About",
  browser: "Firefox",
  editor: "nvim",
  terminal: "kitty",
}

// Full-bleed wallpaper per settings.wallpaper (illustrative gradients — the only
// place inline colour is allowed, mirroring a desktop background).
const WALLPAPER_STYLE: Record<WallpaperId, CSSProperties> = {
  aurora: {
    background:
      "linear-gradient(135deg,#1e3a5f 0%,#3b2f63 45%,#5b2a53 75%,#1e1e2e 100%)",
  },
  catppuccin: {
    background: "linear-gradient(135deg,#1e1e2e 0%,#302d41 100%)",
  },
  mesh: {
    background:
      "radial-gradient(at 20% 20%,#89b4fa55,transparent 45%),radial-gradient(at 80% 30%,#f5c2e755,transparent 45%),radial-gradient(at 50% 80%,#94e2d555,transparent 45%),#1e1e2e",
  },
  solid: { background: "#181825" },
}

const GAP = 12
const PAD = 12

function clockNow(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`
}

function WindowContent({
  win,
  files,
  dark,
  onClose,
}: {
  win: NiriWindow
  files: Record<string, string>
  dark: boolean
  onClose: () => void
}) {
  switch (win.app) {
    case "terminal":
      return <TerminalBody files={files} initialFile={null} onClose={onClose} />
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
  const { translate } = useLocale()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme !== "light"

  const [state, dispatch] = useReducer(niriReducer, undefined, initialNiriState)
  const [settings, setSettings] = useState<EnvSettings>(DEFAULT_ENV_SETTINGS)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clock, setClock] = useState(clockNow)
  const [stripWidth, setStripWidth] = useState(0)

  const files = useMemo(() => readSourceFiles(), [])
  const stripRef = useRef<HTMLDivElement>(null)

  // Ticking clock for the bar.
  useEffect(() => {
    const id = window.setInterval(() => setClock(clockNow()), 15_000)
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
      if (launcherOpen || settingsOpen) return
      const action = keyToAction(event)
      if (action) {
        event.preventDefault()
        event.stopPropagation()
        dispatch(action)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [launcherOpen, settingsOpen])

  const launch = (app: AppId) => {
    dispatch({ app, title: APP_TITLE[app], type: "spawn" })
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
      onLauncher={() => setLauncherOpen(true)}
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
        style={WALLPAPER_STYLE[settings.wallpaper]}
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
                  animate={{ opacity: ci === focusedCol ? 1 : 0.6, scale: 1 }}
                  className="flex flex-col"
                  exit={{ opacity: 0, scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0.9 }}
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
                          exit={{ opacity: 0, scale: 0.9 }}
                          initial={{ opacity: 0, scale: 0.9 }}
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
                            <X
                              className="size-3.5 text-muted-foreground"
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
        apps={[...LAUNCHER_APPS]}
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
    </main>
  )
}
